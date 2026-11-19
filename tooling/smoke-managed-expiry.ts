import { InstaboxConnector } from '../integrations/sandboxes/instabox.js';
import { BoatConnector } from '../integrations/sandboxes/boat.js';
import { FlyMachinesConnector } from '../integrations/sandboxes/fly-machines.js';
import { FreestyleConnector } from '../integrations/sandboxes/freestyle.js';
import { Agent37Connector } from '../integrations/sandboxes/agent37.js';
import { randomBytes, randomUUID } from 'node:crypto';
import { writeFile } from 'node:fs/promises';
import { VercelConnector } from '../integrations/sandboxes/vercel.js';
import { vercelTestConfig } from './vercel-test-config.js';
import { UpstashConnector } from '../integrations/sandboxes/upstash.js';
import { SpritesConnector } from '../integrations/sandboxes/sprites.js';
import { localTestCredential } from './local-test-credentials.js';
import { openDatabase } from '../modules/storage/database.js';
import { migrate } from '../modules/storage/migrate.js';
import { SecretCipher, SecretStore } from '../modules/credentials/secret-store.js';
import { SandboxLifecycle } from '../modules/sandboxes/lifecycle.js';
import { RuntimeClient } from '../modules/sandboxes/runtime-client.js';

const provider=process.env.HEXAGON_SANDBOX === 'instabox' ? 'instabox' : process.env.HEXAGON_SANDBOX === 'boat' ? 'boat' : process.env.HEXAGON_SANDBOX === 'fly-machines' ? 'fly-machines' : process.env.HEXAGON_SANDBOX === 'freestyle' ? 'freestyle' : process.env.HEXAGON_SANDBOX === 'agent37' ? 'agent37' : process.env.HEXAGON_SANDBOX === 'vercel' ? 'vercel' : process.env.HEXAGON_SANDBOX === 'upstash' ? 'upstash' : 'sprites';
const tenant=`${provider}-${randomUUID()}`,session=randomUUID(),schema=`hexagon_sprites_${randomUUID().replaceAll('-','')}`;
const file=`.local/evidence/${tenant}.json`,key=randomBytes(32);
const evidence:any={tenant,session,schema,state:'intent',started_at:new Date().toISOString()};
const save=()=>writeFile(file,JSON.stringify(evidence,null,2),{mode:0o600});await save();
await writeFile(`${file}.key`,key,{mode:0o600});
const url=new URL('postgres://hexagon@127.0.0.1:55432/hexagon'),admin=openDatabase(url.toString());
try{await admin.query(`CREATE SCHEMA "${schema}"`);}finally{await admin.end();}
url.searchParams.set('options',`-c search_path=${schema}`);
const pool=openDatabase(url.toString());await migrate(pool);
const secrets=new SecretStore(pool,new SecretCipher(key));
const credential=await localTestCredential(provider === 'instabox' ? 'insta_api_key' : provider === 'boat' ? 'boat_api_key' : provider === 'fly-machines' ? 'fly_token' : provider === 'freestyle' ? 'freestyle_api_key' : provider === 'agent37' ? 'agent37_api_key' : provider === 'vercel' ? 'VERCEL_API_KEY' : provider === 'upstash' ? 'upstash' : 'fly_sprites_token','sandbox');
const connector=provider === 'instabox' ? new InstaboxConnector({},credential) : provider === 'boat' ? new BoatConnector({},credential) : provider === 'fly-machines' ? new FlyMachinesConnector({},credential) : provider === 'freestyle' ? new FreestyleConnector({},credential) : provider === 'agent37' ? new Agent37Connector({},credential) : provider === 'vercel' ? new VercelConnector(vercelTestConfig,credential) : provider === 'upstash' ? new UpstashConnector({},credential) : new SpritesConnector({},credential);
const lifecycle=new SandboxLifecycle(pool,secrets,()=>connector);
try{
 await pool.query('INSERT INTO tenants(id,name) VALUES($1,$1)',[tenant]);
 const secret=await secrets.save(tenant,'connection:sandbox',credential);
 await pool.query("INSERT INTO connections(tenant_id,id,kind,provider,name,secret_id,status,enabled) VALUES($1,'sandbox','sandbox',$3,'fixture',$2,'ready',true),($1,'model','model','fixture','fixture',NULL,'ready',true)",[tenant,secret,provider]);
 await pool.query("INSERT INTO agents(tenant_id,id,name,definition) VALUES($1,'agent','fixture','{}')",[tenant]);
 await pool.query("INSERT INTO sessions(tenant_id,id,agent_id,sandbox_connection_id,model_connection_id,definition) VALUES($1,$2,'agent','sandbox','model',$3)",[tenant,session,{resources:{timeout_seconds:provider === 'fly-machines' ? 180 : 90},network:{mode:'unrestricted',allowed_hosts:[]},connections:[{id:'sandbox',provider,config:{}}]}]);
 evidence.stage='provision';await save();
 evidence.resource=await lifecycle.provision(tenant,session);await save();
 await connector.write(evidence.resource.id,'/tmp/hexagon-roundtrip',Buffer.from('actual-managed-expiry-connector'));
 if(Buffer.from(await connector.read(evidence.resource.id,'/tmp/hexagon-roundtrip')).toString()!=='actual-managed-expiry-connector')throw new Error('file_roundtrip_failed');
 evidence.files=true;evidence.stage='runtime';await save();
 const runtime=new RuntimeClient(connector,evidence.resource.id,randomUUID());
 try { await runtime.bootstrap(); } catch (error) {
   if (provider === 'boat') {
    evidence.runtime_diagnostics=await connector.execute(evidence.resource.id, "python3 -c \"import urllib.request; r=urllib.request.urlopen('http://127.0.0.1:8765/_hexagon/health'); print(r.status)\"; ps -eo pid,args | grep -E 'hexagon-runtime/launch.py|hexagon-runtime/server.py' | grep -v grep");
    const diagnosticTarget=await connector.preview(evidence.resource.id,8765);
    const response=await fetch(diagnosticTarget.url+'/_hexagon/health',{headers:diagnosticTarget.headers,signal:AbortSignal.timeout(15000)});
    evidence.private_edge_status=response.status; await response.body?.cancel(); await save();
   }
   throw error;
  } evidence.runtime=await runtime.request('GET','/health');
 const target=await connector.preview(evidence.resource.id,8765);
 // Authenticate the provider transport, but omit Runtime's bearer. This checks
 // Runtime auth independently even when the provider edge uses a different 4xx.
 try{const response=await fetch(target.url+'/_hexagon/health',{headers:target.headers,signal:AbortSignal.timeout(15000)});evidence.anonymous_status=response.status;await response.body?.cancel();if(response.status!==401)throw new Error('runtime_auth_failed');}finally{target.release?.();}
 evidence.stage='natural_expiry';await save();
 const deadline=Date.now()+240000;
 while(Date.now()<deadline){
  await lifecycle.reapExpired();
  const row=(await pool.query('SELECT state FROM sessions WHERE tenant_id=$1 AND id=$2',[tenant,session])).rows[0];
  if(row.state==='closed'){evidence.expiry_cleanup='confirmed';break;}
  await new Promise(resolve=>setTimeout(resolve,1000));
 }
 if(evidence.expiry_cleanup!=='confirmed'||await connector.inspect(evidence.resource.id))throw new Error('expiry_cleanup_unconfirmed');
 evidence.state='verified';
}catch(error){evidence.state='failed';evidence.error=error instanceof Error?error.message:'unknown';process.exitCode=1;}
finally{
 try{
  const operations=(await pool.query("SELECT id FROM resource_operations WHERE tenant_id=$1 AND kind='create'",[tenant])).rows;
  for(const operation of operations)for(const resource of await connector.findByOperation(operation.id)){await connector.destroy(resource.id);if(await connector.inspect(resource.id))throw new Error('cleanup_unconfirmed');}
  evidence.resource_cleanup='confirmed';
 }catch{evidence.resource_cleanup='requires_reconciliation';process.exitCode=1;}
 evidence.finished_at=new Date().toISOString();await save();await pool.end();console.log(JSON.stringify({file,state:evidence.state,stage:evidence.stage,error:evidence.error,cleanup:evidence.resource_cleanup}));
}
