import { readFile, readdir, writeFile } from 'node:fs/promises';
import { InstaboxConnector } from '../integrations/sandboxes/instabox.js';
import { localTestCredential } from './local-test-credentials.js';
import { openDatabase } from '../modules/storage/database.js';
const connector=new InstaboxConnector({},await localTestCredential('insta_api_key','sandbox'));
const ids=new Set<string>(), operations=new Set<string>();let journals=0;
for(const file of await readdir('.local/evidence')){
 if(!/^(api-smoke-|instabox-).+\.json$/.test(file))continue;
 const j=JSON.parse(await readFile(`.local/evidence/${file}`,'utf8'));
 if(file.startsWith('api-smoke-')){
  if(j.provider!=='instabox')continue;
  if(!j.finished_at)throw new Error('instabox_journey_still_running');
  if(!/^hexagon_smoke_[a-f0-9]+$/.test(j.schema))throw new Error('invalid_schema');
  const url=new URL(process.env.DATABASE_URL??'postgres://hexagon@127.0.0.1:55432/hexagon');url.searchParams.set('options',`-c search_path=${j.schema}`);
  const pool=openDatabase(url.toString());
  try{for(const row of (await pool.query("SELECT id,provider_resource_id FROM resource_operations WHERE tenant_id=$1 AND kind='create'",[j.tenant])).rows){operations.add(row.id);if(row.provider_resource_id)ids.add(row.provider_resource_id);}}finally{await pool.end();}
  journals++;
 }else if(file.startsWith('instabox-recovery-')&&Array.isArray(j.operations)&&Array.isArray(j.resources)){
  if(j.state==='running')throw new Error('instabox_recovery_still_running');
  for(const operation of j.operations)operations.add(operation);for(const id of j.resources)ids.add(id);journals++;
 }else if(typeof j.tenant==='string'&&j.tenant.startsWith('instabox-')&&j.resource?.id){ids.add(j.resource.id);journals++;
 }else if(j.operation){operations.add(j.operation);if(j.id)ids.add(j.id);journals++;}
}
for(const operation of operations)if((await connector.findByOperation(operation)).length)throw new Error('instabox_test_resource_remains');
for(const id of ids)if(await connector.inspect(id))throw new Error('instabox_test_resource_remains');
const evidence={state:'verified',checked_at:new Date().toISOString(),journals,operations:[...operations],resources:[...ids],all_resources_absent:true};
await writeFile('.local/evidence/instabox-resource-audit.json',JSON.stringify(evidence,null,2),{mode:0o600});
console.log(JSON.stringify({state:evidence.state,journals,operations:operations.size,resources:ids.size}));
