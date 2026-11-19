import {randomBytes,randomUUID} from 'node:crypto';
import {afterEach,expect,it,vi} from 'vitest';
import {openDatabase} from '../storage/database.js';
import {SecretStore,SecretCipher} from '../credentials/secret-store.js';
import {Connections} from '../connections/connections.js';
import {ApplicationOAuth} from './oauth.js';
afterEach(()=>vi.unstubAllGlobals());
it.skipIf(!process.env.TEST_DATABASE_URL)('fences unknown rotating refreshes, client swaps, cross-tenant access and disconnect',async()=>{
 const pool=openDatabase(process.env.TEST_DATABASE_URL!),tenant='credential-'+randomUUID();const store=new SecretStore(pool,new SecretCipher(randomBytes(32))),connections=new Connections(pool,store,[]),oauth=new ApplicationOAuth(pool,store);
 try{
 await pool.query('INSERT INTO tenants(id,name) VALUES($1,$1)',[tenant]);
 const c=await connections.create(tenant,{kind:'tool',provider:'notion',name:'Account',config:{authentication:'oauth',operations:['read_page']}});
 await oauth.configure(tenant,'notion',{client_id:'original',client_secret:'private-client',redirect_uri:'http://127.0.0.1:8787/oauth/callback'});
 const envelope={type:'oauth_v1',client_id:'original',access_token:'private-access',refresh_token:'private-refresh',expires_at:1};const secret=await store.save(tenant,`connection:${c.id}`,JSON.stringify(envelope));
 await pool.query("UPDATE connections SET secret_id=$3,status='ready',enabled=true WHERE tenant_id=$1 AND id=$2",[tenant,c.id,secret]);
 const fetch=vi.fn().mockRejectedValue(new TypeError('response_lost'));vi.stubGlobal('fetch',fetch);
 await expect(oauth.credential(tenant,c.id)).rejects.toThrow();await expect(oauth.credential(tenant,c.id)).rejects.toThrow();expect(fetch).toHaveBeenCalledTimes(1);
 expect((await pool.query('SELECT state FROM application_oauth_refresh_attempts WHERE tenant_id=$1',[tenant])).rows[0].state).toBe('unknown');
 // Reconnect a fresh, unexpired grant; changing client ID must not use that grant.
 const next=await store.save(tenant,`connection:${c.id}`,JSON.stringify({...envelope,expires_at:Date.now()+3600000}));await pool.query('UPDATE connections SET secret_id=$3 WHERE tenant_id=$1 AND id=$2',[tenant,c.id,next]);
 await oauth.configure(tenant,'notion',{client_id:'replacement',client_secret:'new-private-client',redirect_uri:'http://127.0.0.1:8787/oauth/callback'});await expect(oauth.credential(tenant,c.id)).rejects.toThrow();expect(fetch).toHaveBeenCalledTimes(1);
 const flow=await oauth.start(tenant,c.id);await expect(connections.disconnect('another-tenant',c.id)).rejects.toMatchObject({code:'connection_not_found'});
 const row=await connections.disconnect(tenant,c.id);expect(row).toMatchObject({has_credential:false,enabled:false,status:'draft',provider_revoked:false});expect((await oauth.flow(tenant,flow.id)).status).toBe('cancelled');expect((await pool.query('SELECT 1 FROM secrets WHERE tenant_id=$1 AND purpose=$2',[tenant,`connection:${c.id}`])).rowCount).toBe(0);
 await expect(oauth.credential(tenant,c.id)).rejects.toThrow();expect(JSON.stringify(row)).not.toContain('private-access');
 }finally{await pool.end();}
});
it.skipIf(!process.env.TEST_DATABASE_URL)('uses identical permission verification for token validation and OAuth callback',async()=>{
 const pool=openDatabase(process.env.TEST_DATABASE_URL!),tenant='attio-'+randomUUID();const store=new SecretStore(pool,new SecretCipher(randomBytes(32))),connections=new Connections(pool,store,[]),oauth=new ApplicationOAuth(pool,store);
 try{
 await pool.query('INSERT INTO tenants(id,name) VALUES($1,$1)',[tenant]);
 const c=await connections.create(tenant,{kind:'tool',provider:'attio',name:'CRM',credential:'private-token',config:{operations:['create_record']}});
 const fetch=vi.fn().mockImplementation(async()=>new Response(JSON.stringify({active:true,workspace_id:'workspace-a',scope:'record_permission:read'})));vi.stubGlobal('fetch',fetch);
 expect(await connections.validate(tenant,c.id)).toMatchObject({status:'invalid',validation:{code:'app_permission_denied',permission_checks:[{state:'denied'}]}});
 await oauth.configure(tenant,'attio',{client_id:'client',client_secret:'secret',redirect_uri:'http://127.0.0.1:8787/oauth/callback'});const flow=await oauth.start(tenant,c.id);
 fetch.mockImplementation(async url=>new Response(JSON.stringify(String(url).endsWith('/oauth/token')?{access_token:'private-access',token_type:'Bearer'}:{active:true,workspace_id:'workspace-a',scope:'record_permission:read'})));
 await oauth.callback(new URLSearchParams({code:'code',state:new URL(flow.authorization_url).searchParams.get('state')!}));expect(await oauth.flow(tenant,flow.id)).toMatchObject({status:'failed'});expect((await connections.get(tenant,c.id)).enabled).toBe(false);
 }finally{await pool.end();}
});
it.skipIf(!process.env.TEST_DATABASE_URL).each(['hubspot','salesforce','attio'])('%s completes OAuth using the configured endpoint, encrypted grant and selected permissions',async provider=>{
 const pool=openDatabase(process.env.TEST_DATABASE_URL!),tenant='crm-oauth-'+randomUUID();const store=new SecretStore(pool,new SecretCipher(randomBytes(32))),connections=new Connections(pool,store,[]),oauth=new ApplicationOAuth(pool,store);
 try{
 await pool.query('INSERT INTO tenants(id,name) VALUES($1,$1)',[tenant]);
 const config={authentication:'oauth',operations:[provider==='attio'?'list_records':'list_contacts'],...(provider==='salesforce'?{instance_url:'https://acme.my.salesforce.com'}:{})};const c=await connections.create(tenant,{kind:'tool',provider,name:provider,config});await oauth.configure(tenant,provider,{client_id:'crm-client',client_secret:'private-client',redirect_uri:'http://127.0.0.1:8787/oauth/callback'});const flow=await oauth.start(tenant,c.id);
 const transport=vi.fn().mockImplementation(async(url,init)=>{
  if(String(url).endsWith('/token')){expect(init.method).toBe('POST');expect(String(init.body)).toContain('grant_type=authorization_code');return new Response(JSON.stringify({access_token:'private-access',refresh_token:'private-refresh',token_type:'Bearer',expires_in:3600,...(provider==='salesforce'?{instance_url:'https://acme.my.salesforce.com'}:{})}));}
  return new Response(JSON.stringify(provider==='attio'?{active:true,workspace_id:'workspace',scope:'record_permission:read'}:provider==='hubspot'?{portalId:123}:{organization_id:'org',user_id:'user',queryable:true}));
 });vi.stubGlobal('fetch',transport);
 await oauth.callback(new URLSearchParams({code:'code',state:new URL(flow.authorization_url).searchParams.get('state')!}));expect(await oauth.flow(tenant,flow.id)).toMatchObject({status:'completed'});expect(await connections.get(tenant,c.id)).toMatchObject({enabled:true,status:'ready',validation:{permission_coverage:'complete'}});expect(await oauth.status(tenant,c.id)).toMatchObject({state:'oauth',refresh_available:true});expect(JSON.stringify(await oauth.status(tenant,c.id))).not.toContain('private-access');expect(await oauth.credential(tenant,c.id)).toBe('private-access');
 }finally{await pool.end();}
});
