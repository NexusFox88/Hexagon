import { randomUUID } from 'node:crypto';
import { writeFile } from 'node:fs/promises';
import { InstaboxConnector } from '../integrations/sandboxes/instabox.js';
import { localTestCredential } from './local-test-credentials.js';
const connector=new InstaboxConnector({},await localTestCredential('insta_api_key','sandbox'));
const operation=randomUUID(), file=`.local/evidence/instabox-expiry-${operation}.json`;
const evidence:Record<string,any>={operation,state:'intent',started_at:new Date().toISOString()};
const save=()=>writeFile(file,JSON.stringify(evidence,null,2),{mode:0o600});await save();
try{
 const resource=await connector.create({operation_id:operation,session_id:randomUUID(),timeout_seconds:90,network:{mode:'unrestricted',allowed_hosts:[]}});
 evidence.id=resource.id;evidence.provider_deadline=resource.expires_at;await save();
 const deadline=Date.now()+180000;
 // No control-plane expiry sweeper and no DELETE until after observing native expiry.
 while(Date.now()<deadline){if(!await connector.inspect(resource.id)){evidence.natural_absence_at=new Date().toISOString();break;}await new Promise(resolve=>setTimeout(resolve,2000));}
 if(!evidence.natural_absence_at)throw new Error('instabox_native_expiry_unconfirmed');
 evidence.state='verified';
}catch(error){evidence.state='failed';evidence.error=error instanceof Error?error.message:'unknown';}
finally{
 try{for(const row of await connector.findByOperation(operation))await connector.destroy(row.id);if(evidence.id&&await connector.inspect(evidence.id))throw new Error('cleanup_unconfirmed');evidence.cleanup='confirmed';}catch{evidence.cleanup='unknown';}
 await save();
}
console.log(JSON.stringify({file,state:evidence.state,error:evidence.error,cleanup:evidence.cleanup}));if(evidence.state!=='verified'||evidence.cleanup!=='confirmed')process.exitCode=1;
