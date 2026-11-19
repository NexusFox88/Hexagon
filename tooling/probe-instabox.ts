import { checkCredentialIsolation } from './check-credential-isolation.js';
import { randomUUID } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import { InstaboxConnector } from '../integrations/sandboxes/instabox.js';
import { localTestCredential } from './local-test-credentials.js';
const credential=await localTestCredential('insta_api_key','sandbox');
const connector=new InstaboxConnector({},credential);
const operation=randomUUID(), evidence:Record<string,any>={operation,state:'intent'};
const file=`.local/evidence/instabox-${operation}.json`;
await mkdir('.local/evidence',{recursive:true});
const save=()=>writeFile(file,JSON.stringify(evidence,null,2),{mode:0o600});await save();
try{
 evidence.validation=await connector.validate();
 const box=await connector.create({operation_id:operation,session_id:randomUUID(),timeout_seconds:900,network:{mode:'unrestricted',allowed_hosts:[]}});
 evidence.id=box.id;await save();
 const command=await connector.execute(box.id,'node --version && python3 --version && timeout --version | head -1');
 if(command.exit_code!==0)throw new Error('prerequisites_failed');evidence.prerequisites=command.stdout;
 evidence.provider_credential_isolation=await checkCredentialIsolation(connector,box.id,[credential]);
 const bytes=Buffer.alloc(256*1024);for(let i=0;i<bytes.length;i++)bytes[i]=i%256;
 await connector.write(box.id,'/tmp/hexagon-probe.bin',bytes);
 if(!Buffer.from(await connector.read(box.id,'/tmp/hexagon-probe.bin')).equals(bytes))throw new Error('binary_roundtrip_failed');
 const source=`from http.server import BaseHTTPRequestHandler,ThreadingHTTPServer
class H(BaseHTTPRequestHandler):
 def do_GET(self):
  ok=self.headers.get('Authorization')=='Bearer probe-only'
  body=bytes(range(256))*1024 if ok else b'denied'
  self.send_response(200 if ok else 401)
  if self.path!='/eof':self.send_header('Content-Length',str(len(body)))
  self.end_headers();self.wfile.write(body)
ThreadingHTTPServer(('0.0.0.0',8765),H).serve_forever()
`;
 await connector.write(box.id,'/tmp/hexagon-probe.py',Buffer.from(source));
 await connector.execute(box.id,'python3 /tmp/hexagon-probe.py',{background:true,timeout_seconds:120});
 const info=await fetch(`https://api.instabox.sh/v1/machines/${box.id}/connection-info`,{headers:{'X-API-Key':await localTestCredential('insta_api_key','sandbox')}});
 const metadata=await info.json() as any;evidence.ssh_info={...metadata,hostTrust:metadata.hostTrust?{type:metadata.hostTrust.type,principals:metadata.hostTrust.principals}:undefined};await save();
 const target=await connector.preview(box.id,8765);
 try{
  for(const suffix of ['/','/eof']){const response=await fetch(target.url+suffix,{headers:{...target.headers,Authorization:'Bearer probe-only'},signal:AbortSignal.timeout(45000)});if(response.status!==200||!Buffer.from(await response.arrayBuffer()).equals(bytes))throw new Error('private_http_failed');}
  const denied=await fetch(target.url,{headers:target.headers,signal:AbortSignal.timeout(45000)});if(denied.status!==401||await denied.text()!=='denied')throw new Error('runtime_auth_failed');
 }finally{target.release?.();}
 if((await connector.findByOperation(operation)).length!==1)throw new Error('reconciliation_failed');
 evidence.binary_roundtrip=true;evidence.private_http=true;evidence.state='verified';
}catch(error){evidence.state='failed';evidence.error=error instanceof Error?error.message:'unknown';}
finally{
 try{for(const row of await connector.findByOperation(operation)){evidence.id??=row.id;await save();await connector.destroy(row.id);}if((await connector.findByOperation(operation)).length||(evidence.id&&await connector.inspect(evidence.id)))throw new Error('cleanup_unconfirmed');evidence.cleanup='confirmed';}catch{evidence.cleanup='unknown';}
 await save();
}
console.log(JSON.stringify({file,state:evidence.state,error:evidence.error,cleanup:evidence.cleanup}));if(evidence.state!=='verified'||evidence.cleanup!=='confirmed')process.exitCode=1;
