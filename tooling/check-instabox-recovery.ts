import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {mkdir,writeFile} from 'node:fs/promises';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {InstaboxConnector} from '../integrations/sandboxes/instabox.js';
import {SandboxLifecycle} from '../modules/sandboxes/lifecycle.js';
import {SecretCipher,SecretStore} from '../modules/credentials/secret-store.js';
import {openDatabase} from '../modules/storage/database.js';
import {localTestCredential} from './local-test-credentials.js';
const pool=openDatabase(process.env.DATABASE_URL??'postgres://hexagon@127.0.0.1:55432/hexagon');
const tenant=`instabox-recovery-${randomUUID()}`, secrets=new SecretStore(pool,new SecretCipher(Buffer.alloc(32,7)));
const box=new InstaboxConnector({},await localTestCredential('insta_api_key','sandbox'));
const originalDeletion=box.reconcileDeletion.bind(box);
const evidence:any={tenant,checks:[],operations:[],resources:[],state:'running'};
const file=`.local/evidence/${tenant}.json`;await mkdir('.local/evidence',{recursive:true});
const save=()=>writeFile(file,JSON.stringify(evidence,null,2),{mode:0o600});
const session=async()=>{const id=randomUUID();await pool.query("INSERT INTO sessions(tenant_id,id,agent_id,sandbox_connection_id,model_connection_id,definition) VALUES($1,$2,'agent','sandbox','model',$3)",[tenant,id,{connections:[{id:'sandbox',provider:'instabox',config:{}}],resources:{timeout_seconds:900},network:{mode:'unrestricted',allowed_hosts:[]}}]);return id;};
let creates=0;const rawCreate=box.create.bind(box);box.create=async r=>{creates++;evidence.operations.push(r.operation_id);await save();const resource=await rawCreate(r);evidence.resources.push(resource.id);await save();return resource;};
const lifecycle=()=>new SandboxLifecycle(pool,secrets,()=>box);
try{
 await box.preflight();
 await pool.query('INSERT INTO tenants(id,name) VALUES($1,$1)',[tenant]);
 const secret=await secrets.save(tenant,'connection:sandbox',await localTestCredential('insta_api_key','sandbox'));
 await pool.query("INSERT INTO connections(tenant_id,id,kind,provider,name,secret_id,status,enabled) VALUES($1,'sandbox','sandbox','instabox','fixture',$2,'ready',true),($1,'model','model','fixture','fixture',NULL,'ready',true)",[tenant,secret]);
 await pool.query("INSERT INTO agents(tenant_id,id,name,definition) VALUES($1,'agent','fixture','{}')",[tenant]);
 if (!process.argv.includes('--delete-response-only')) {
 const first=await session();const resource=await lifecycle().provision(tenant,first);
 const rejected=await session();await assert.rejects(lifecycle().provision(tenant,rejected),{code:'sandbox_quota_exceeded'});
 const count=creates;await assert.rejects(lifecycle().provision(tenant,rejected),{code:'sandbox_quota_exceeded'});assert.equal(creates,count);
 assert.equal((await pool.query("SELECT state FROM resource_operations WHERE tenant_id=$1 AND session_id=$2",[tenant,rejected])).rows[0].state,'rejected');
 assert.equal((await lifecycle().close(tenant,rejected)).state,'closed');
 evidence.checks.push('real_quota_refusal_terminal_and_closable_no_retry');await save();
 // A long request gives us a deterministic window to interrupt this owned SSH process.
 await box.write(resource.id,'/tmp/hexagon-recovery.py',Buffer.from(`from http.server import BaseHTTPRequestHandler,ThreadingHTTPServer\nimport time,os\nclass H(BaseHTTPRequestHandler):\n def do_GET(self):\n  if self.path=='/slow':time.sleep(20)\n  b=str(os.getpid()).encode();self.send_response(200);self.send_header('Content-Length',str(len(b)));self.end_headers();self.wfile.write(b)\nThreadingHTTPServer(('127.0.0.1',8765),H).serve_forever()\n`));
 const started=await box.execute(resource.id,'python3 /tmp/hexagon-recovery.py',{background:true,timeout_seconds:600});assert.ok(started.pid);
 let target=await box.preview(resource.id,8765);let original:string;
 try{original=await (await fetch(target.url,{signal:AbortSignal.timeout(45000)})).text();}finally{target.release?.();}
 target=await box.preview(resource.id,8765);
 try{
  const pending=fetch(target.url+'/slow',{signal:AbortSignal.timeout(45000)}).then(r=>r.text()).then(()=>false,()=>true);
  let pid:number|undefined;
  for(let i=0;i<60&&!pid;i++){
   const ps=await promisify(execFile)('ps',['-axo','pid=,ppid=,command=']);
   for(const line of ps.stdout.split('\n')){const match=line.trim().match(/^(\d+)\s+(\d+)\s+(.*)$/);if(match&&Number(match[2])===process.pid&&match[3]!.includes('hexagon-instabox-')&&match[3]!.includes(`${resource.id}@`))pid=Number(match[1]);}
   if(!pid)await new Promise(r=>setTimeout(r,100));
  }
  assert.ok(pid,'owned SSH child observed');process.kill(pid,'SIGKILL');assert.equal(await pending,true);
 }finally{target.release?.();}
 target=await box.preview(resource.id,8765);
 try{assert.equal(await (await fetch(target.url,{signal:AbortSignal.timeout(45000)})).text(),original!);}finally{target.release?.();}
 assert.equal((await lifecycle().provision(tenant,first)).id,resource.id);assert.equal(creates,count);
 evidence.checks.push('real_ssh_process_kill_reconnect_same_guest_process_and_resource');await save();
 await box.destroy(resource.id);await assert.rejects(lifecycle().provision(tenant,first),{code:'sandbox_lost'});assert.equal(creates,count);
 await lifecycle().close(tenant,first);evidence.checks.push('external_delete_fails_without_recreation');await save();
 // Inject loss only after the real create effect and before returning it to lifecycle.
 const next=await session();const actualCreate=box.create.bind(box);
 box.create=async request=>{await actualCreate(request);throw new Error('injected_create_response_lost');};
 await assert.rejects(lifecycle().provision(tenant,next),{code:'sandbox_creation_unconfirmed'});const afterCreate=creates;
 box.create=actualCreate;const recovered=await lifecycle().provision(tenant,next);assert.equal(creates,afterCreate);
 evidence.checks.push('lost_create_response_reconstructed_control_plane_reconciles_one_resource');await save();
 const remove=box.reconcileDeletion.bind(box);let deletes=0;
 box.reconcileDeletion=async(id,context)=>{deletes++;await remove(id,{...context,record:async op=>{await context.record(op);throw new Error('injected_delete_response_lost_after_handle_persist');}});};
 await assert.rejects(lifecycle().close(tenant,next),{code:'sandbox_deletion_unconfirmed'});
 const op=(await pool.query("SELECT detail FROM resource_operations WHERE tenant_id=$1 AND session_id=$2 AND kind='delete'",[tenant,next])).rows[0].detail.provider_operation_id;assert.ok(op);
 box.reconcileDeletion=async(id,context)=>{assert.equal(context.provider_operation_id,op);await remove(id,context);};
 assert.equal((await lifecycle().close(tenant,next)).state,'closed');assert.equal(deletes,1);assert.equal(await box.inspect(recovered.id),null);
 evidence.checks.push('lost_delete_response_resumes_persisted_handle_after_reconstruction');
 }
 box.reconcileDeletion=originalDeletion;
 const unobservedSession=await session(), unobserved=await lifecycle().provision(tenant,unobservedSession);
 const originalFetch=globalThis.fetch, deleteKeys:string[]=[];let drop=true;
 globalThis.fetch=async(input,init)=>{
  if(String(input)===`https://api.instabox.sh/v1/machines/${unobserved.id}`&&init?.method==='DELETE'){
   deleteKeys.push(new Headers(init.headers).get('Idempotency-Key')!);
   const response=await originalFetch(input,init);
   if(drop&&response.ok){drop=false;await response.body?.cancel();throw new Error('injected_delete_http_response_lost');}
   return response;
  }
  return originalFetch(input,init);
 };
 try{
  await assert.rejects(lifecycle().close(tenant,unobservedSession),{code:'sandbox_deletion_unconfirmed'});
  const pending=(await pool.query("SELECT detail FROM resource_operations WHERE tenant_id=$1 AND session_id=$2 AND kind='delete'",[tenant,unobservedSession])).rows[0];
  assert.equal(pending.detail.provider_operation_id,undefined);
  assert.equal((await lifecycle().close(tenant,unobservedSession)).state,'closed');
  assert.equal(deleteKeys.length,2);assert.ok(deleteKeys[0]);assert.equal(deleteKeys[0],deleteKeys[1]);
  assert.equal(await box.inspect(unobserved.id),null);
  evidence.checks.push('lost_delete_http_response_before_persist_retries_same_idempotency_key');
 }finally{globalThis.fetch=originalFetch;}
 evidence.state='passed';
}catch(error){evidence.state='failed';evidence.error=error instanceof Error?error.message:'unknown';process.exitCode=1;}
finally{
 box.reconcileDeletion=originalDeletion;
 try{
  for(const operation of evidence.operations){for(const row of await box.findByOperation(operation)){if(!evidence.resources.includes(row.id))evidence.resources.push(row.id);await save();await box.destroy(row.id);}}
  for(const id of evidence.resources)assert.equal(await box.inspect(id),null);
  evidence.cleanup='confirmed';
 }catch{evidence.cleanup='unknown';process.exitCode=1;}
 await save();
 for(const table of ['resource_operations','sessions','agents','connections','secrets','tenants'])await pool.query(`DELETE FROM ${table} WHERE ${table==='tenants'?'id':'tenant_id'}=$1`,[tenant]);
 await pool.end();
}
console.log(JSON.stringify({file,state:evidence.state,checks:evidence.checks,error:evidence.error,cleanup:evidence.cleanup}));
