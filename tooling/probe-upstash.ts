import { Box, EphemeralBox } from '@upstash/box';
import { randomUUID } from 'node:crypto';
import { writeFile } from 'node:fs/promises';
import { localTestCredential } from './local-test-credentials.js';
const apiKey=await localTestCredential('upstash','sandbox'),name=`hexagon-${randomUUID()}`;
const options={apiKey,enableTelemetry:false},file=`.local/evidence/upstash-${name}.json`;
const evidence:Record<string,unknown>={name,state:'intent',started_at:new Date().toISOString()};
const save=()=>writeFile(file,JSON.stringify(evidence,null,2),{mode:0o600});await save();
try {
 const box=await EphemeralBox.create({...options,name,runtime:'node',size:'small',ttl:300,timeout:60000,labels:['hexagon-probe']});
 evidence.resource={id:box.id,expires_at:box.expiresAt};await save();
 const result=await box.exec.command('node --version && python3 --version');
 evidence.command={stdout:result.stdout,stderr:result.stderr,exit_code:result.exitCode};
 if(result.exitCode!==0)throw new Error('runtime_prerequisites_missing');
 await box.files.write({path:'/tmp/hexagon-probe.txt',content:'hexagon-file-roundtrip'});
 if(await box.files.read('/tmp/hexagon-probe.txt')!=='hexagon-file-roundtrip')throw new Error('file_roundtrip_failed');
 evidence.state='verified';
} catch(error){evidence.state='failed';evidence.transport_code=(error as any)?.cause?.code ?? (error as any)?.cause?.cause?.code;evidence.error=error instanceof Error?error.message.replaceAll(apiKey,'[REDACTED]'):'unknown';}
finally {
 try { const owned=(await Box.list({...options,label:'hexagon-probe'})).filter(row=>row.name===name);for(const row of owned)await Box.delete({...options,boxIds:row.id});evidence.cleanup=(await Box.list({...options,label:'hexagon-probe'})).some(row=>row.name===name)?'unconfirmed':'confirmed'; }
 catch{evidence.cleanup='requires_reconciliation';}
 evidence.finished_at=new Date().toISOString();await save();console.log(JSON.stringify({file,state:evidence.state,cleanup:evidence.cleanup,error:evidence.error}));
}
