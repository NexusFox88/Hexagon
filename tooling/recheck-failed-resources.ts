import {readFile,writeFile} from 'node:fs/promises';
import pg from 'pg';
import {SecretCipher,SecretStore} from '../modules/credentials/secret-store.js';
import {createSandboxConnector} from '../integrations/sandboxes/registry.js';
import {failureDiagnostic} from '../modules/diagnostics/failure.js';
const results=[];
for(const id of ['3078a5ed-2bfa-4852-bc64-d27d8ecee165','27f8e2a9-0182-4c34-88cc-b505bd20c054','3062cd13-0cae-4c42-8f9f-ad9babdef920']){
 const name=`api-smoke-${id}`;const e=JSON.parse(await readFile(`.local/evidence/${name}.json`,'utf8'));
 const pool=new pg.Pool({connectionString:'postgres://hexagon@127.0.0.1:55432/hexagon',options:`-c search_path=${e.schema}`});
 try{
  const secrets=new SecretStore(pool,new SecretCipher(await readFile(`.local/evidence/${name}.key`)));
  const rows=(await pool.query("SELECT o.id,o.provider_resource_id,c.id AS connection_id,c.secret_id,s.definition,s.sandbox_connection_id FROM resource_operations o JOIN sessions s ON s.tenant_id=o.tenant_id AND s.id=o.session_id JOIN connections c ON c.tenant_id=s.tenant_id AND c.id=s.sandbox_connection_id WHERE o.tenant_id=$1 AND o.kind='create'",[e.tenant])).rows;
  for(const row of rows){
   const pinned=row.definition.connections.find((c:any)=>c.id===row.sandbox_connection_id);
   const credential=await secrets.read(e.tenant,row.secret_id,`connection:${row.connection_id}`);
   const connector=createSandboxConnector(pinned.provider,pinned.config,credential);
   try{const found=await connector.findByOperation(row.id);const existing=row.provider_resource_id?await connector.inspect(row.provider_resource_id):null;results.push({journal:name,provider:pinned.provider,operation:row.id,found:found.map(r=>r.id),known_resource_present:!!existing});}
   catch(error){results.push({journal:name,provider:pinned.provider,operation:row.id,failure:failureDiagnostic(error)});}
  }
 }finally{await pool.end();}
}
await writeFile('.local/evidence/failed-resource-recheck-20261116.json',JSON.stringify({checked_at:new Date().toISOString(),results},null,2),{mode:0o600});
console.log(JSON.stringify(results));
