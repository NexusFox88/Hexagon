import {randomBytes,randomUUID} from 'node:crypto';
import {execFile} from 'node:child_process';import {promisify} from 'node:util';
import {afterEach,expect,it,vi} from 'vitest';import {z} from 'zod';
import {createServer} from '../apps/control-plane/server.js';import {openDatabase} from '../modules/storage/database.js';
import {SecretStore,SecretCipher} from '../modules/credentials/secret-store.js';import {tokenDigest} from '../modules/credentials/api-auth.js';
import {Connections,type ConnectionAdapter} from '../modules/connections/connections.js';import {Sessions} from '../modules/execution/sessions.js';
import {ToolBroker} from '../modules/tools/broker.js';import {Hexagon} from '../sdk/typescript/index.js';
afterEach(()=>vi.unstubAllGlobals());
it.skipIf(!process.env.TEST_DATABASE_URL)('both SDKs bind CRM accounts, broker calls stay credential-free, account changes and disconnect stop dispatch',async()=>{
 const pool=openDatabase(process.env.TEST_DATABASE_URL!),tenant='crm-sdk-'+randomUUID(),token=randomUUID();const secrets=new SecretStore(pool,new SecretCipher(randomBytes(32)));
 const adapters:ConnectionAdapter[]=['sandbox','model'].map(kind=>({kind:kind as 'sandbox'|'model',provider:'fixture',config:z.object({}),capabilities:[],async validate(){return {operations:[]};}}));
 const connections=new Connections(pool,secrets,adapters),sessions=new Sessions(pool,connections,[{id:'fixture',version:'1',capabilities:['tools'],model_providers:['fixture']}]);const server=createServer(pool,{connections,sessions});const upstream=globalThis.fetch;let calls=0;
 vi.stubGlobal('fetch',vi.fn(async(url:any,init:any)=>{if(String(url).startsWith('https://api.attio.com/')){expect(init.headers.Authorization).toBe('Bearer fixture-crm-key');if(!String(url).endsWith('/self'))calls++;return new Response(JSON.stringify(String(url).endsWith('/self')?{active:true,workspace_id:'workspace-a',scope:'record_permission:read'}:{data:[],credential_echo:'fixture-crm-key'}));}return upstream(url,init);}));
 try{
 await pool.query('INSERT INTO tenants(id,name) VALUES($1,$1)',[tenant]);await pool.query("INSERT INTO api_keys(digest,tenant_id,label) VALUES($1,$2,'fixture')",[tokenDigest(token),tenant]);
 const base=await server.listen({host:'127.0.0.1',port:0}),client=new Hexagon(base,token),ids:Record<string,string>={};
 for(const kind of ['sandbox','model'] as const){const c=await connections.create(tenant,{kind,provider:'fixture',name:kind,credential:'fixture'});await connections.validate(tenant,c.id);await connections.patch(tenant,c.id,{enabled:true});ids[kind]=c.id;}
 const python=`import os,json\nfrom hexagon import Hexagon\nc=Hexagon(os.environ['FIXTURE_BASE'],os.environ['FIXTURE_TOKEN'])\nx=c.create_connection(kind='tool',provider='attio',name='Python CRM',credential='fixture-crm-key',config={'operations':['list_records']})\nassert c.validate_connection(x['id'])['status']=='ready'\nc.request('PATCH','/connections/'+x['id'],{'enabled':True})\ns=c.create_session(harness={'id':'fixture','version':'1'},sandbox_connection_id=os.environ['FIXTURE_SANDBOX'],model_connection_id=os.environ['FIXTURE_MODEL'],tools={'crm':x['id']})\nassert c.connection_authorization(x['id'])['state']=='manual'\nprint(json.dumps({'connection':x['id'],'session':s['id']}))`;
 const py=JSON.parse((await promisify(execFile)('python3',['-c',python],{env:{...process.env,PYTHONPATH:new URL('../sdk/python',import.meta.url).pathname,FIXTURE_BASE:base,FIXTURE_TOKEN:token,FIXTURE_SANDBOX:ids.sandbox,FIXTURE_MODEL:ids.model}})).stdout);
 const tc=await client.createConnection({kind:'tool',provider:'attio',name:'TS CRM',credential:'fixture-crm-key',config:{operations:['list_records']}});await client.validateConnection(tc.id);await client.updateConnection(tc.id,{enabled:true});const ts=await client.createSession({harness:{id:'fixture',version:'1'},sandbox_connection_id:ids.sandbox!,model_connection_id:ids.model!,tools:{crm:tc.id}});
 for(const entry of [py,{connection:tc.id,session:ts.id}]){
 const snapshot=await client.sessionInitialization(entry.session);expect(snapshot.definition.connections.find(c=>c.id===entry.connection)).toMatchObject({account:'workspace-a'});expect(JSON.stringify(snapshot)).not.toContain('fixture-crm-key');
 const run=randomUUID(),lease={tenant_id:tenant,id:run,generation:1,lease_owner:'fixture'};await pool.query("INSERT INTO runs(tenant_id,id,session_id,idempotency_key,request_hash,input,state,lease_owner,lease_until,generation) VALUES($1,$2,$3,$2,'fixture','fixture','running','fixture',now()+interval '5 minutes',1)",[tenant,run,entry.session]);
 const broker=new ToolBroker(pool,secrets);const result=await broker.process(lease,{id:randomUUID(),binding:'crm',operation:'list_records',arguments:{object:'people'}});expect(result.state).toBe('completed');expect(JSON.stringify(result)).not.toContain('fixture-crm-key');
 await pool.query("UPDATE connections SET validation=jsonb_set(validation,'{account}','\"workspace-b\"') WHERE tenant_id=$1 AND id=$2",[tenant,entry.connection]);await expect(broker.process(lease,{id:randomUUID(),binding:'crm',operation:'list_records',arguments:{object:'people'}})).rejects.toMatchObject({code:'tool_account_changed'});
 if(entry===py){await promisify(execFile)('python3',['-c',`import os\nfrom hexagon import Hexagon\nc=Hexagon(os.environ['FIXTURE_BASE'],os.environ['FIXTURE_TOKEN'])\nx=c.disconnect_connection(os.environ['FIXTURE_ID'])\nassert x['provider_revoked'] is False\nassert c.connection_authorization(x['id'])['state']=='disconnected'`],{env:{...process.env,PYTHONPATH:new URL('../sdk/python',import.meta.url).pathname,FIXTURE_BASE:base,FIXTURE_TOKEN:token,FIXTURE_ID:entry.connection}});}else{await client.disconnectConnection(entry.connection);expect(await client.connectionAuthorization(entry.connection)).toMatchObject({state:'disconnected'});}
 expect((await broker.process(lease,{id:randomUUID(),binding:'crm',operation:'list_records',arguments:{object:'people'}})).state).toBe('waiting_authorization');
 }
 expect(calls).toBe(2);
 }finally{await server.close();await pool.end();}
},30000);
