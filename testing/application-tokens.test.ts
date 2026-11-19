import {randomUUID} from 'node:crypto';
import {describe,it,expect} from 'vitest';
import {openDatabase} from '../modules/storage/database.js';
import {applicationRoute,ApplicationTokens} from '../modules/credentials/application-tokens.js';
import {authenticate,tokenDigest} from '../modules/credentials/api-auth.js';
import {createServer} from '../apps/control-plane/server.js';

describe.skipIf(!process.env.TEST_DATABASE_URL)('Application token lifecycle',()=>{
 it('hashes tokens, limits administration, rotates atomically and enforces expiry and ownership',async()=>{
  const pool=openDatabase(process.env.TEST_DATABASE_URL!),tenant=randomUUID(),owner=randomUUID();const tokens=new ApplicationTokens(pool),server=createServer(pool);
  try{
   await pool.query('INSERT INTO tenants(id,name) VALUES($1,$1)',[tenant]);await pool.query("INSERT INTO api_keys(digest,tenant_id,label) VALUES($1,$2,'owner')",[tokenDigest(owner),tenant]);
   const created=await tokens.create(tenant,{label:'SDK client',expires_in_days:1});expect(created.token).toMatch(/^hx_app_/);
   const stored=(await pool.query('SELECT * FROM api_keys WHERE tenant_id=$1 AND id=$2',[tenant,created.id])).rows[0];expect(JSON.stringify(stored)).not.toContain(created.token);expect(stored.digest).toBe(tokenDigest(created.token));
   expect(await authenticate(pool,`Bearer ${created.token}`)).toBe(tenant);
   expect((await tokens.list(tenant)).tokens.find(t=>t.id===created.id).last_used_at).toBeTruthy();
   const headers={authorization:`Bearer ${created.token}`};
   expect((await server.inject({method:'POST',url:'/v1/tokens',headers,payload:{label:'escalation'}})).statusCode).toBe(403);
   expect((await server.inject({method:'POST',url:`/v1/approvals/${randomUUID()}/decision`,headers,payload:{approved:true}})).statusCode).toBe(403);
   expect((await server.inject({method:'GET',url:'/v1/health',headers})).statusCode).toBe(200);
   expect(applicationRoute('GET',`/v1/sessions/${randomUUID()}/initialization`)).toBe(true);
   expect(applicationRoute('POST',`/v1/sessions/${randomUUID()}/initialization`)).toBe(false);
   await expect(tokens.rotate('foreign',created.id)).rejects.toMatchObject({code:'application_token_not_found'});
   await expect(tokens.revoke('foreign',created.id)).rejects.toMatchObject({code:'application_token_not_found'});
   const rotated=await tokens.rotate(tenant,created.id);expect(await authenticate(pool,`Bearer ${created.token}`)).toBeNull();expect(await authenticate(pool,`Bearer ${rotated.token}`)).toBe(tenant);
   await pool.query("UPDATE api_keys SET expires_at=now()-interval '1 second' WHERE tenant_id=$1 AND id=$2",[tenant,rotated.id]);expect(await authenticate(pool,`Bearer ${rotated.token}`)).toBeNull();
   const revoked=await tokens.create(tenant,{label:'revoke'});await tokens.revoke(tenant,revoked.id);expect(await authenticate(pool,`Bearer ${revoked.token}`)).toBeNull();
   expect(JSON.stringify(await tokens.list(tenant))).not.toContain(rotated.token);
  }finally{await server.close();await pool.query('DELETE FROM api_keys WHERE tenant_id=$1',[tenant]);await pool.query('DELETE FROM tenants WHERE id=$1',[tenant]);await pool.end();}
 });
});
