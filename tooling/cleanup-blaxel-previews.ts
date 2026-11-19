import { readdir, readFile, writeFile } from 'node:fs/promises';
import { BlaxelConnector } from '../integrations/sandboxes/blaxel.js';
import { localTestCredential } from './local-test-credentials.js';
import { openDatabase } from '../modules/storage/database.js';
const connector=new BlaxelConnector({workspace:await localTestCredential('blaxel_workspace','sandbox')},await localTestCredential('blaxel_personal_api_secret','sandbox'));
const ids=new Set<string>();
for(const name of await readdir('.local/evidence')){
 if(!name.endsWith('.json') || !(name.startsWith('blaxel-') || name.startsWith('api-smoke-')))continue;
 const row=JSON.parse(await readFile(`.local/evidence/${name}`,'utf8'));
 if(name.startsWith('blaxel-') && row.resource?.id)ids.add(row.resource.id);
 if(name==='blaxel-address-probe.json' && row.name)ids.add(row.name);
 if(row.provider==='blaxel' && /^hexagon_smoke_[a-f0-9]+$/.test(row.schema)){
  const url=new URL('postgres://hexagon@127.0.0.1:55432/hexagon');url.searchParams.set('options',`-c search_path=${row.schema}`);const pool=openDatabase(url.toString());
  try{for(const item of (await pool.query('SELECT DISTINCT provider_resource_id AS id FROM resource_operations WHERE tenant_id=$1 AND provider_resource_id IS NOT NULL',[row.tenant])).rows)ids.add(item.id);}finally{await pool.end();}
 }
}
const evidence:Record<string,unknown>={state:'checking',started_at:new Date().toISOString(),resources:[]},rows=evidence.resources as unknown[];
for(const id of ids){
 if(!/^hexagon-(?:[a-f0-9-]{36}|address-probe-\d+)$/.test(id))throw new Error('unrecognized_owned_resource');
 await connector.cleanupAssociatedResources(id);
 if(await connector.inspect(id))await connector.destroy(id);
 if(await connector.inspect(id))throw new Error('owned_compute_cleanup_unconfirmed');
 rows.push({id,endpoints:'confirmed_absent',compute:'confirmed_absent'});
 await writeFile('.local/evidence/blaxel-preview-cleanup.json',JSON.stringify(evidence,null,2),{mode:0o600});
}
evidence.state='verified';evidence.finished_at=new Date().toISOString();await writeFile('.local/evidence/blaxel-preview-cleanup.json',JSON.stringify(evidence,null,2),{mode:0o600});console.log(JSON.stringify({state:evidence.state,owned_resources:ids.size}));
