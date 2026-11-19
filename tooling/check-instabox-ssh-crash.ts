import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {spawn,execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {once} from 'node:events';
import {readdir,writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {InstaboxConnector} from '../integrations/sandboxes/instabox.js';
import {checkInstaboxOpenSSH} from '../integrations/sandboxes/instabox-transport.js';
import {localTestCredential} from './local-test-credentials.js';
if(process.argv[2]==='sweep'){
 await checkInstaboxOpenSSH();
}else{
 const box=new InstaboxConnector({},await localTestCredential('insta_api_key','sandbox'));
 if(process.argv[2]==='child'){
  const target=await box.preview(process.argv[3]!,8765);
  assert.equal(await (await fetch(target.url,{signal:AbortSignal.timeout(45000)})).text(),'alive');
  process.send?.({ready:true}); // Keep target and certificate files alive until SIGKILL.
 }else{
  const operation=randomUUID(),evidence:any={operation,state:'running'},file=`.local/evidence/instabox-ssh-crash-${operation}.json`;
  const save=()=>writeFile(file,JSON.stringify(evidence,null,2),{mode:0o600});await save();let child:ReturnType<typeof spawn>|undefined;
  try{
   const resource=await box.create({operation_id:operation,session_id:randomUUID(),timeout_seconds:300,network:{mode:'unrestricted',allowed_hosts:[]}});evidence.id=resource.id;await save();
   await box.write(resource.id,'/tmp/crash-http.py',Buffer.from("from http.server import BaseHTTPRequestHandler,HTTPServer\nclass H(BaseHTTPRequestHandler):\n def do_GET(self):\n  self.send_response(200);self.send_header('Content-Length','5');self.end_headers();self.wfile.write(b'alive')\nHTTPServer(('127.0.0.1',8765),H).serve_forever()\n"));
   await box.execute(resource.id,'python3 /tmp/crash-http.py',{background:true,timeout_seconds:240});
   child=spawn(process.execPath,['--import','tsx',import.meta.filename,'child',resource.id],{stdio:['ignore','ignore','ignore','ipc']});
   await Promise.race([once(child,'message'),once(child,'exit').then(()=>{throw new Error('child_exited_before_ready');}),new Promise((_,reject)=>{const timer=setTimeout(()=>reject(new Error('ssh_crash_child_timeout')),60000);timer.unref();})]);
   const prefix=`hexagon-instabox-${child.pid}-`;
   assert.equal((await readdir(tmpdir())).filter(n=>n.startsWith(prefix)).length,1);
   await promisify(execFile)(process.execPath,['--import','tsx',import.meta.filename,'sweep'],{timeout:20000});
   assert.equal((await readdir(tmpdir())).filter(n=>n.startsWith(prefix)).length,1);
   const exited=once(child,'exit');child.kill('SIGKILL');await exited;
   await promisify(execFile)(process.execPath,['--import','tsx',import.meta.filename,'sweep'],{timeout:20000});
   assert.equal((await readdir(tmpdir())).filter(n=>n.startsWith(prefix)).length,0);
   evidence.live_owner_preserved=true;evidence.crashed_owner_reaped_by_new_process=true;evidence.state='passed';
  }catch(error){evidence.state='failed';evidence.error=error instanceof Error?error.message:'unknown';process.exitCode=1;}
  finally{
   if(child&&child.exitCode===null&&child.signalCode===null){const exited=once(child,'exit');child.kill('SIGKILL');await exited;}
   await checkInstaboxOpenSSH();
   try{for(const resource of await box.findByOperation(operation))await box.destroy(resource.id);assert.equal((await box.findByOperation(operation)).length,0);if(evidence.id)assert.equal(await box.inspect(evidence.id),null);evidence.cleanup='confirmed';}catch{evidence.cleanup='unknown';process.exitCode=1;}
   await save();
  }
  console.log(JSON.stringify({file,state:evidence.state,cleanup:evidence.cleanup,error:evidence.error}));
 }
}
