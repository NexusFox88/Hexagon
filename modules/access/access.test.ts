import {gzipSync} from 'node:zlib';
import { Runs } from '../execution/runs.js';
import { randomBytes,randomUUID } from 'node:crypto';
import { describe,it,expect } from 'vitest';
import { MockAgent } from 'undici';
import { z } from 'zod';
import { openDatabase } from '../storage/database.js';
import { SecretCipher,SecretStore } from '../credentials/secret-store.js';
import { Connections } from '../connections/connections.js';
import { Sessions } from '../execution/sessions.js';
import { ConnectionAccess } from './access.js';
import { createAccessServer } from '../../apps/control-plane/access-server.js';
import { endpointInput,permits,httpConnectionConfig } from './policy.js';

it('rejects noncanonical paths and private literal upstreams',()=>{
  for(const url of ['https://127.0.0.1','https://[::1]','https://169.254.169.254','http://example.com','https://user:pass@example.com'])expect(endpointInput.safeParse(url).success).toBe(false);
  const p=httpConnectionConfig.parse({endpoint:'https://example.com',authentication:{type:'bearer'},access:{rules:[{methods:['POST'],path:'/search'}]}});
  for(const path of ['/search/../admin','/%73earch','//search','/search%2f..','/search\\..'])expect(permits(p,'POST',path)).toBe(false);
  expect(permits(p,'GET','/search')).toBe(false);
  expect(permits(p,'POST','/search?q=test')).toBe(true);
});
describe.skipIf(!process.env.TEST_DATABASE_URL)('Managed credentials and scoped access',()=>{
  it('keeps original keys outside responses, enforces grants, rotation, disable and deletion dependencies',async()=>{
    const pool=openDatabase(process.env.TEST_DATABASE_URL!),tenant=`secrets-${randomUUID()}`;
    const store=new SecretStore(pool,new SecretCipher(randomBytes(32))),connections=new Connections(pool,store,['sandbox','model'].map(kind=>({kind:kind as 'sandbox'|'model',provider:'fixture',config:z.object({}),capabilities:[],async validate(){return {operations:['fixture']};}})));
    const managed=connections.managedSecrets();
    const sessions=new Sessions(pool,connections,[{id:'fixture',version:'1',capabilities:[],model_providers:['fixture']}],store);
    const access=new ConnectionAccess(pool,store),mock=new MockAgent();mock.disableNetConnect();
    const app=createAccessServer(access,mock);
    try{
      await pool.query('INSERT INTO tenants(id,name) VALUES($1,$1)',[tenant]);
      const original='secret-original-'+randomUUID(), rotated='secret-rotated-'+randomUUID();
      const secret=await managed.create(tenant,{name:'Search key',value:original});
      expect(JSON.stringify(secret)).not.toContain(original);
      await expect(managed.get('other',secret.id)).rejects.toMatchObject({code:'secret_not_found'});
      const http=await connections.create(tenant,{kind:'http',provider:'http',name:'search',secret_id:secret.id,config:{endpoint:'https://upstream.test',authentication:{type:'bearer'},access:{rules:[{methods:['POST'],path:'/search'}]}}});
      expect(http.secret_id).toBe(secret.id);
      await connections.validate(tenant,http.id);await connections.patch(tenant,http.id,{enabled:true});
      await expect(managed.remove(tenant,secret.id)).rejects.toMatchObject({code:'secret_in_use'});
      await expect(connections.create('other',{kind:'http',provider:'http',name:'stolen',secret_id:secret.id,config:http.config})).rejects.toMatchObject({code:'secret_not_found'});
      const ids:Record<string,string>={};for(const kind of ['sandbox','model'] as const){const c=await connections.create(tenant,{kind,provider:'fixture',name:kind,credential:'fixture'});await connections.validate(tenant,c.id);await connections.patch(tenant,c.id,{enabled:true});ids[kind]=c.id;}
      const agent=await sessions.createAgent(tenant,{name:'fixture',harness:{id:'fixture',version:'1'},variables:{APP_MODE:'test'}});
      const input={agent_id:agent.id,sandbox_connection_id:ids.sandbox!,model_connection_id:ids.model!,connections:{search:http.id}};
      expect((await sessions.create(tenant,input,true)).ready).toBe(true);
      expect((await pool.query('SELECT count(*)::int AS n FROM sessions WHERE tenant_id=$1',[tenant])).rows[0].n).toBe(0);
      const session=await sessions.create(tenant,input),grant=await access.issue(tenant,session.id,http.id);
      expect(JSON.stringify(grant)).not.toContain(original);
      const runs=new Runs(pool);
      const firstRun=await runs.submit(tenant,session.id,'grant-cancel','Fixture request');
      const lease=await runs.claim('credential-fixture');
      await runs.advance(lease,'provisioning');await runs.advance(lease,'running');
      const runGrant=await access.issue(tenant,session.id,http.id,undefined,firstRun.id);
      expect((await access.authorize(runGrant.id,runGrant.token)).credential).toBe(original);
      await runs.cancel(tenant,firstRun.id);
      await expect(access.authorize(runGrant.id,runGrant.token)).rejects.toMatchObject({code:'access_denied'});
      await runs.advance(lease,'cancelled');
      const completedRun=await runs.submit(tenant,session.id,'grant-complete','Fixture request');
      const completedLease=await runs.claim('credential-fixture');
      await runs.advance(completedLease,'provisioning');await runs.advance(completedLease,'running');
      const completedGrant=await access.issue(tenant,session.id,http.id,undefined,completedRun.id);
      await pool.query('UPDATE connections SET config=$3 WHERE tenant_id=$1 AND id=$2',[tenant,ids.model,{base_url:'https://model.test',model:'fixture'}]);
      const modelGrant=await access.issue(tenant,session.id,ids.model!,undefined,completedRun.id);
      const modelPath=`/access/${modelGrant.id}/v1/messages`;
      expect((await app.inject({method:'POST',url:modelPath,payload:'private prompt'})).statusCode).toBe(403);
      expect((await runs.events(tenant,completedRun.id)).filter(e=>e.type==='model.response')).toHaveLength(0);
      for(const status of [401,429,200]){
        mock.get('https://model.test').intercept({path:'/v1/messages',method:'POST'}).reply(status,'upstream body');
        expect((await app.inject({method:'POST',url:modelPath,headers:{authorization:`Bearer ${modelGrant.token}`},payload:'private prompt'})).statusCode).toBe(status);
      }
      const outcomes=(await runs.events(tenant,completedRun.id)).filter(e=>e.type==='model.response');
      expect(outcomes.map(e=>e.data.status)).toEqual([401,429,200]);
      expect(JSON.stringify(outcomes)).not.toContain('private prompt');expect(JSON.stringify(outcomes)).not.toContain(modelGrant.token);expect(JSON.stringify(outcomes)).not.toContain('upstream body');
      await runs.advance(completedLease,'completed',{role:'assistant',text:'fixture'});
      await expect(access.authorize(completedGrant.id,completedGrant.token)).rejects.toMatchObject({code:'access_denied'});
      const path=`/access/${grant.id}/search`,headers={authorization:`Bearer ${grant.token}`};
      expect((await app.inject({method:'POST',url:path,payload:'{}'})).statusCode).toBe(403);
      expect((await app.inject({method:'POST',url:path,headers:{authorization:`Bearer ${'0'.repeat(64)}`},payload:'{}'})).statusCode).toBe(403);
      expect((await app.inject({method:'GET',url:path,headers})).statusCode).toBe(403);
      expect((await app.inject({method:'POST',url:`/access/${grant.id}/admin`,headers,payload:'{}'})).statusCode).toBe(403);
      mock.get('https://upstream.test').intercept({path:'/search',method:'POST',headers:{authorization:`Bearer ${original}`}}).reply(200,'data: first\n\ndata: second\n\n',{headers:{'content-type':'text/event-stream'}});
      const result=await app.inject({method:'POST',url:path,headers:{...headers,'content-type':'application/json','x-api-key':'caller-value'},payload:'{}'});
      expect(result.statusCode).toBe(200);expect(result.body).toBe('data: first\n\ndata: second\n\n');expect(result.body).not.toContain(original);
      mock.get('https://upstream.test').intercept({path:'/search',method:'POST'}).reply(302,'',{headers:{location:'https://elsewhere.test'}});
      expect((await app.inject({method:'POST',url:path,headers,payload:'{}'})).statusCode).toBe(502);
      mock.get('https://upstream.test').intercept({path:'/search',method:'POST'}).reply(200,Buffer.from([0,255,128,10]),{headers:{'content-type':'application/octet-stream'}});
      expect((await app.inject({method:'POST',url:path,headers,payload:'{}'})).rawPayload).toEqual(Buffer.from([0,255,128,10]));
      const compressed=gzipSync(Buffer.from('compressed upstream body'));
      mock.get('https://upstream.test').intercept({path:'/search',method:'POST'}).reply(200,compressed,{headers:{'content-type':'text/plain','content-encoding':'gzip'}});
      const encoded=await app.inject({method:'POST',url:path,headers,payload:'{}'});expect(encoded.headers['content-encoding']).toBe('gzip');expect(encoded.rawPayload).toEqual(compressed);
      const revoked=await access.issue(tenant,session.id,http.id);
      await expect(access.revoke('other',revoked.id)).rejects.toMatchObject({code:'access_not_found'});
      await access.revoke(tenant,revoked.id);
      await expect(access.authorize(revoked.id,revoked.token)).rejects.toMatchObject({code:'access_denied'});
      const expired=await access.issue(tenant,session.id,http.id);
      await pool.query("UPDATE access_grants SET expires_at=now()-interval '1 second' WHERE id=$1",[expired.id]);
      await expect(access.authorize(expired.id,expired.token)).rejects.toMatchObject({code:'access_denied'});
      const isolated=await sessions.create(tenant,input),isolatedGrant=await access.issue(tenant,isolated.id,http.id);
      await expect(sessions.revokeConnection('other',isolated.id,http.id)).rejects.toMatchObject({code:'session_not_found'});
      await expect(sessions.revokeConnection(tenant,isolated.id,ids.sandbox!)).rejects.toMatchObject({code:'connection_not_bound'});
      await sessions.revokeConnection(tenant,isolated.id,http.id);
      await expect(access.authorize(isolatedGrant.id,isolatedGrant.token)).rejects.toMatchObject({code:'access_denied'});
      await expect(access.issue(tenant,isolated.id,http.id)).rejects.toMatchObject({code:'access_denied'});
      expect((await access.authorize(grant.id,grant.token)).credential).toBe(original);
      expect((await sessions.authorization(tenant,isolated.id)).connections.find(c=>c.id===http.id)?.state).toBe('revoked');
      expect((await managed.get(tenant,secret.id)).sessions).toHaveLength(2);
      expect(await sessions.environment(tenant,isolated.id)).toMatchObject({env:{APP_MODE:'test'}});
      await expect(sessions.environment('other',isolated.id)).rejects.toMatchObject({code:'session_not_found'});
      await managed.patch(tenant,secret.id,{value:rotated});
      expect((await connections.get(tenant,http.id)).enabled).toBe(false);
      expect((await app.inject({method:'POST',url:path,headers,payload:'{}'})).statusCode).toBe(403);
      await connections.validate(tenant,http.id);await connections.patch(tenant,http.id,{enabled:true});
      await expect(access.issue(tenant,session.id,http.id)).rejects.toMatchObject({code:'session_connection_changed'});
      const next=await sessions.create(tenant,input),nextGrant=await access.issue(tenant,next.id,http.id);
      expect((await access.authorize(nextGrant.id,nextGrant.token)).credential).toBe(rotated);
      await pool.query("UPDATE sessions SET state='closing' WHERE id=$1",[next.id]);
      await expect(access.authorize(nextGrant.id,nextGrant.token)).rejects.toMatchObject({code:'access_denied'});
      await pool.query("UPDATE sessions SET state='open' WHERE id=$1",[next.id]);
      await managed.patch(tenant,secret.id,{enabled:false});
      await expect(access.authorize(nextGrant.id,nextGrant.token)).rejects.toMatchObject({code:'access_denied'});
      await expect(connections.patch(tenant,http.id,{enabled:true})).rejects.toThrow();
      await pool.query("UPDATE sessions SET state='closed' WHERE tenant_id=$1",[tenant]);
      await connections.remove(tenant,http.id);await managed.remove(tenant,secret.id);
      await expect(managed.get(tenant,secret.id)).rejects.toMatchObject({code:'secret_not_found'});
      const records=(await pool.query('SELECT envelope FROM secrets WHERE tenant_id=$1',[tenant])).rows;
      expect(JSON.stringify(records)).not.toContain(original);expect(JSON.stringify(records)).not.toContain(rotated);
      mock.assertNoPendingInterceptors();
    }finally{
      await app.close();
      for(const table of ['session_connection_revocations','access_grants','events','runs','session_connections','sessions','agents','connections','managed_secrets','secrets','tenants'])await pool.query(`DELETE FROM ${table} WHERE ${table==='tenants'?'id':'tenant_id'}=$1`,[tenant]);
      await pool.end();
    }
  });
});

it('requires an exact host list for a trusted egress proxy and rejects other destinations',async()=>{
  const oldProxy=process.env.HEXAGON_ACCESS_EGRESS_PROXY_URL,oldHosts=process.env.HEXAGON_ACCESS_EGRESS_HOSTS;
  const transport=new MockAgent();transport.disableNetConnect();
  let app:ReturnType<typeof createAccessServer>|undefined;
  try{
    process.env.HEXAGON_ACCESS_EGRESS_PROXY_URL='http://127.0.0.1:9999';delete process.env.HEXAGON_ACCESS_EGRESS_HOSTS;
    expect(()=>createAccessServer({} as ConnectionAccess,transport)).toThrow('credential_egress_proxy_requires_exact_hosts');
    process.env.HEXAGON_ACCESS_EGRESS_HOSTS='approved.example.com';
    const access={async authorize(){return {credential:'test-only',kind:'http',policy:httpConnectionConfig.parse({endpoint:'https://other.example.com',authentication:{type:'bearer'},access:{rules:[{methods:['GET'],path:'/data'}]}})};}} as unknown as ConnectionAccess;
    app=createAccessServer(access,transport);
    const result=await app.inject({method:'GET',url:'/access/test/data',headers:{authorization:`Bearer ${'a'.repeat(64)}`}});
    expect(result.statusCode).toBe(403);expect(result.json().error.code).toBe('credential_egress_host_denied');
  }finally{
    if(app)await app.close();else await transport.close();
    if(oldProxy===undefined)delete process.env.HEXAGON_ACCESS_EGRESS_PROXY_URL;else process.env.HEXAGON_ACCESS_EGRESS_PROXY_URL=oldProxy;
    if(oldHosts===undefined)delete process.env.HEXAGON_ACCESS_EGRESS_HOSTS;else process.env.HEXAGON_ACCESS_EGRESS_HOSTS=oldHosts;
  }
});
