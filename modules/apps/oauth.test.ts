import {randomBytes,randomUUID} from 'node:crypto';
import {expect,it,vi,afterEach} from 'vitest';
import {openDatabase} from '../storage/database.js';
import {SecretStore,SecretCipher} from '../credentials/secret-store.js';
import {Connections} from '../connections/connections.js';
import {ApplicationOAuth} from './oauth.js';
afterEach(()=>vi.unstubAllGlobals());
it.skipIf(!process.env.TEST_DATABASE_URL)('persists tenant-scoped consent, rejects replay/cancelled state and refreshes once without changing connection version',async()=>{
 const pool=openDatabase(process.env.TEST_DATABASE_URL!);const tenant=`oauth-${randomUUID()}`;const secrets=new SecretStore(pool,new SecretCipher(randomBytes(32)));const connections=new Connections(pool,secrets,[]);const oauth=new ApplicationOAuth(pool,secrets);
 try{
 await pool.query('INSERT INTO tenants(id,name) VALUES($1,$1)',[tenant]);
 const c=await connections.create(tenant,{kind:'tool',provider:'notion',name:'Notion',config:{operations:['read_page']}});
 await oauth.configure(tenant,'notion',{client_id:'fixture-client',client_secret:'client-private',redirect_uri:'http://127.0.0.1:8787/oauth/callback'});
 await expect(oauth.configure(tenant,'notion',{client_id:'id',client_secret:'key',redirect_uri:'http://external.example/oauth/callback'})).rejects.toThrow();
 const cancelled=await oauth.start(tenant,c.id);await oauth.cancel(tenant,cancelled.id);
 await expect(oauth.callback(new URLSearchParams({state:new URL(cancelled.authorization_url).searchParams.get('state')!,code:'code'}))).rejects.toMatchObject({code:'app_oauth_state_invalid'});
 const f=await oauth.start(tenant,c.id);await expect(oauth.flow('other-tenant',f.id)).rejects.toMatchObject({code:'app_oauth_flow_not_found'});
 const fetch=vi.fn(async (url:any)=>String(url).endsWith('/oauth/token')?new Response(JSON.stringify({access_token:'access-private',refresh_token:'refresh-private',token_type:'bearer',expires_in:1})):new Response(JSON.stringify({bot:{workspace_name:'Fixture workspace'}})));vi.stubGlobal('fetch',fetch);
 const params=new URLSearchParams({state:new URL(f.authorization_url).searchParams.get('state')!,code:'fixture-code'});
 expect(await oauth.callback(params)).toBe('http://127.0.0.1:8787/console/#tools');
 expect(await oauth.flow(tenant,f.id)).toMatchObject({status:'completed'});
 const connected=await connections.get(tenant,c.id);expect(connected).toMatchObject({status:'ready',enabled:true,config:{authentication:'oauth'}});expect(JSON.stringify(connected)).not.toContain('access-private');
 await expect(oauth.callback(params)).rejects.toMatchObject({code:'app_oauth_state_invalid'});
 fetch.mockImplementation(async()=>new Response(JSON.stringify({access_token:'renewed-private',refresh_token:'rotated-private',token_type:'bearer',expires_in:3600})));
 const before=fetch.mock.calls.length;expect(await Promise.all([oauth.credential(tenant,c.id),oauth.credential(tenant,c.id)])).toEqual(['renewed-private','renewed-private']);expect(fetch.mock.calls.length-before).toBe(1);expect((await connections.get(tenant,c.id)).version).toBe(connected.version);
 const denied=await oauth.start(tenant,c.id);await oauth.callback(new URLSearchParams({state:new URL(denied.authorization_url).searchParams.get('state')!,error:'access_denied'}));expect(await oauth.flow(tenant,denied.id)).toMatchObject({status:'failed',error_code:'app_oauth_denied'});
 }finally{await pool.end();}
});
