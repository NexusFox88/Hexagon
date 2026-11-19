import { randomUUID } from 'node:crypto';
import { writeFile } from 'node:fs/promises';
import { BlaxelConnector } from '../integrations/sandboxes/blaxel.js';
import { localTestCredential } from './local-test-credentials.js';
const workspace=await localTestCredential('blaxel_workspace','sandbox'),key=await localTestCredential('blaxel_personal_api_secret','sandbox');
const connector=new BlaxelConnector({workspace},key),operation=randomUUID();
const evidence:Record<string,unknown>={operation,state:'intent'},file=`.local/evidence/blaxel-limit-${operation}.json`;
const save=()=>writeFile(file,JSON.stringify(evidence,null,2),{mode:0o600});await save();
try {
 const resource=await connector.create({operation_id:operation,session_id:operation,timeout_seconds:180,network:{mode:'unrestricted',allowed_hosts:[]}});evidence.resource=resource;await save();
 const response=await fetch(`https://api.blaxel.ai/v0/sandboxes/${encodeURIComponent(resource.id)}/previews`,{method:'POST',redirect:'error',signal:AbortSignal.timeout(15000),headers:{Authorization:`Bearer ${key}`,'X-Blaxel-Workspace':workspace,'Blaxel-Version':'2026-04-28','Content-Type':'application/json'},body:JSON.stringify({metadata:{name:'hexagon-limit-probe'},spec:{port:8765,public:false}})});
 evidence.status=response.status;evidence.retry_after=response.headers.get('retry-after');
 if(!response.ok){const raw=await response.text();evidence.reason=raw.split(key).join('[REDACTED]').replace(/[A-Za-z0-9_./+\-=]{24,}/g,'[REDACTED]').slice(0,1000);}
 evidence.state='observed';
} catch(error){evidence.state='failed';evidence.error=error instanceof Error?error.message:'unknown';}
finally{try{for(const row of await connector.findByOperation(operation))await connector.destroy(row.id);evidence.cleanup=(await connector.findByOperation(operation)).length?'unconfirmed':'confirmed';}catch{evidence.cleanup='requires_reconciliation';}await save();console.log(JSON.stringify({file,status:evidence.status,reason:evidence.reason,retry_after:evidence.retry_after,cleanup:evidence.cleanup}));}
