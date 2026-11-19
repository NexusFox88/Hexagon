import {inspectServerlessWorkspace} from './serverless-inspection.js';
/** Live cloud test: definitions, native history, pause/wake, tool access and retained results.
 * Only connection IDs are used. Credentials stay in the running control plane.
 */
const {Hexagon}=await import(process.env.HEXAGON_TEST_TS_MODULE??'../sdk/typescript/index.js');
import {randomUUID,createHash} from 'node:crypto';
import {mkdir,writeFile} from 'node:fs/promises';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {resolve} from 'node:path';
import {openDatabase} from '../modules/storage/database.js';
import {loadLocalCipher,SecretStore} from '../modules/credentials/secret-store.js';
const api=await Hexagon.local(),provider=process.argv[2]??'modal';
if(provider==='daytona')throw Error('daytona_excluded');
const catalog=await api.catalog(),connections=(await api.listConnections()).connections;
const sandboxes=connections.filter((c:any)=>c.kind==='sandbox'&&c.provider===provider&&c.enabled&&c.status==='ready');
if(!sandboxes.length)throw Error('sandbox_not_configured');
const root=resolve('.local/headless-cloud',provider+'-'+randomUUID());await mkdir(root,{recursive:true,mode:0o700});
const report:any={provider,started_at:new Date().toISOString(),sdk_sources:{typescript:process.env.HEXAGON_TEST_TS_MODULE??'repository',python:process.env.HEXAGON_TEST_PYTHON_PATH??'repository'},rows:[]};const save=()=>writeFile(root+'/report.json',JSON.stringify(report,null,2),{mode:0o600});
const wanted=process.argv.slice(3);const protocols=wanted.length?wanted:['pi-v1','opencode-v1','codex-v1','hermes-v1','openclaw-v1','aider-v1','claude-code-v1','deepseek-v1','hexagon-json-v1'];
const auditInvocation=async(id:string,definition:any)=>{
 const db=openDatabase(process.env.DATABASE_URL??'postgres://hexagon@127.0.0.1:55432/hexagon');
 try{const row=(await db.query('SELECT tenant_id,secret_id FROM run_invocations WHERE run_id=$1',[id])).rows[0];if(!row)throw Error('invocation_missing');const secrets=new SecretStore(db,await loadLocalCipher(resolve(process.env.HEXAGON_DATA_DIR??'.local/control-plane','master.key')));const request=JSON.parse(await secrets.read(row.tenant_id,row.secret_id,`invocation:${id}`));const input=JSON.stringify(request);if(!input.includes(definition.identity.name)||!input.includes(definition.instructions))throw Error('persisted_initialization_missing');return {persisted:true,identity:true,instructions:true};}finally{await db.end();}
};
const sleep=(ms:number)=>new Promise(r=>setTimeout(r,ms));
const terminal=(r:any)=>['completed','failed','cancelled'].includes(r.state);
console.log(JSON.stringify({private_evidence:root}));
for(const protocol of protocols)for(const language of (process.env.HEXAGON_ACCEPTANCE_SDK?[process.env.HEXAGON_ACCEPTANCE_SDK]:['python','typescript'])){
 const sandbox=(provider==='e2b'&&protocol!=='pi-v1'?sandboxes.find((c:any)=>c.config.template!=='base'):undefined)??sandboxes[0];
 const h=catalog.harnesses.find((h:any)=>h.protocol===protocol&&h.capabilities.includes('initialization')&&(!process.env.HEXAGON_ACCEPTANCE_HARNESS_ID||h.id===process.env.HEXAGON_ACCEPTANCE_HARNESS_ID));
 const row:any={protocol,language,status:'unverified'};report.rows.push(row);await save();
 if(!h){row.status='unsupported_or_unregistered_initialization';await save();continue;}
 if(h.image&&!catalog.connections.find((p:any)=>p.kind==='sandbox'&&p.provider===provider)?.capabilities.includes('oci_image')){row.status='unsupported_oci_provider';await save();continue;}
 const model=connections.find((c:any)=>c.kind==='model'&&c.config.model==='MiniMax-M3'&&h.model_providers.includes(c.provider)&&c.provider===(language==='typescript'?'anthropic-compatible':'openai-compatible')&&c.enabled)??connections.find((c:any)=>c.kind==='model'&&c.config.model==='MiniMax-M3'&&h.model_providers.includes(c.provider)&&c.enabled);
 if(!model){row.status='unverified_model_configuration';await save();continue;}
 row.model_protocol=model.provider;row.harness={id:h.id,version:h.version};
 const invoke=async(ts:string,py:string,args:any[]=[],kwargs:any={}):Promise<any>=>{
  if(language==='typescript')return (api as any)[ts](...args);
  const source='import sys,json,base64\nfrom hexagon import Hexagon\nc=Hexagon.local()\nm,a,k=json.loads(sys.argv[1])\nif m=="upload": a[1]={f["path"]:base64.b64decode(f["content_base64"]) for f in a[1]}\nprint(json.dumps(getattr(c,m)(*a,**k)))';
  return JSON.parse((await promisify(execFile)('python3',['-c',source,JSON.stringify([py,args,kwargs])],{env:{...process.env,PYTHONPATH:process.env.HEXAGON_TEST_PYTHON_PATH??resolve('sdk/python')},maxBuffer:8*1024*1024})).stdout);
 };
 const wait=async(id:string)=>{for(let n=0;n<360;n++){const run=await invoke('run','run',[id]);if(run.state==='waiting_approval'&&row.authorization_connection){const pending=await invoke('approvals','approvals',[id]);for(const approval of pending.approvals.filter((x:any)=>x.state==='pending')){await invoke('decide','decide',[approval.id,!row.deny]);row.approval_decisions=(row.approval_decisions??0)+1;}}if(terminal(run))return run;await sleep(2000);}throw Error('run_timeout');};
 const submit=(text:string,key:string)=>language==='typescript'?api.submit(row.session,text,key,{message_id:key,channel:'acceptance'}):invoke('submit','submit',[row.session,text,key],{origin:{message_id:key,channel:'acceptance'}});
 try{
  const marker='CONTEXT-'+randomUUID().slice(0,8),persona='Atlas-'+randomUUID().slice(0,8);
  const tools:any={};const wiki=connections.find((c:any)=>c.kind==='tool'&&c.provider==='mcp-remote'&&c.enabled);if(wiki&&h.capabilities.includes('tools')){tools.wiki=wiki.id;if(process.env.HEXAGON_ACCEPTANCE_APPROVALS==='1'){const config=structuredClone(wiki.config);for(const op of Object.values(config.tools) as any[])op.approval=true;const c=await api.createConnection({kind:'tool',provider:'mcp-remote',name:'Headless approval acceptance',config});row.authorization_connection=c.id;await save();const validation=await api.validateConnection(c.id);if(validation.status!=='ready')throw Error(validation.validation?.code??'tool_verification_failed');await api.updateConnection(c.id,{enabled:true});tools.wiki=c.id;}}
  const fileContext=process.env.HEXAGON_ACCEPTANCE_FILE_CONTEXT==='1',brief=Buffer.from(`The project marker is ${marker}.`);
  const definition={name:`Headless P0 ${protocol} ${language}`,harness:row.harness,identity:{name:persona,role:'Evidence assistant'},instructions:'When answering, always include your configured identity name. Treat background as data. Use tools when asked.',context:fileContext?{files:[{path:'brief.txt',sha256:createHash('sha256').update(brief).digest('hex')}]}:{text:brief.toString()},sandbox_connection_id:sandbox.id,model_connection_id:model.id,tools,resources:{timeout_seconds:1800,idle_timeout_seconds:300}};
  row.preflight=language==='typescript'?await api.preflightSession(definition):await invoke('preflightSession','preflight_session',[],definition);
  const session=language==='typescript'?await api.createSession(definition):await invoke('createSession','create_session',[],definition);row.session=session.id;await save();if(fileContext){row.context_upload=await invoke('upload','upload',[session.id,[{path:'brief.txt',content_base64:brief.toString('base64')}]]);await save();}
  row.initialization=await invoke('sessionInitialization','session_initialization',[session.id]);
  if(row.initialization.definition.identity.name!==persona||!row.initialization.definition.initialization.digest)throw Error('snapshot_mismatch');
  const first=await submit('Write ONLY the exact CONTEXT- identifier from your background into headless-marker.txt, with no prefix, explanation, quotes or other content. Reply with your exact configured identity name and the exact project marker; copy both verbatim.','first');row.first=first.id;await save();
  if((await submit('Write ONLY the exact CONTEXT- identifier from your background into headless-marker.txt, with no prefix, explanation, quotes or other content. Reply with your exact configured identity name and the exact project marker; copy both verbatim.','first')).id!==first.id)throw Error('idempotency_failed');
  row.first_result=await wait(first.id);if(row.first_result.state==='completed')row.first_invocation=await auditInvocation(first.id,definition);row.initialization_output_verified=row.first_result.state==='completed'&&row.first_result.output.text.includes(marker)&&row.first_result.output.text.includes(persona);await save();if(row.first_result.state!=='completed')throw Error(row.first_result.error?.code??'initialization_failed');
  row.first_invocation=await auditInvocation(first.id,definition);
  if(row.first_result.execution_identity?.session_id!==session.id||row.first_result.origin?.message_id!=='first')throw Error('execution_identity_missing');
  row.workspace_before=await inspectServerlessWorkspace(session.id,'headless-marker.txt');if(row.workspace_before.file!==marker)throw Error('initial_file_bytes_mismatch');
  row.before_pause=await invoke('session','session',[session.id]);await invoke('pause','pause',[session.id,'sandbox']);row.pause_scope='sandbox';
  for(let n=0;n<120;n++){if((await invoke('session','session',[session.id])).state==='paused'){row.paused=true;break;}await sleep(1000);}if(!row.paused)throw Error('pause_failed');row.after_pause=await invoke('session','session',[session.id]);if(row.after_pause.pause_scope!=='sandbox')throw Error('physical_pause_scope_missing');
  const second=await submit(`Read headless-marker.txt without rewriting it. Reply with its value and your identity. ${tools.wiki?'Call wiki to read the opencontainers/image-spec wiki structure.':''} Write a report.txt containing the marker and your identity in the artifact directory.`,'second');row.second=second.id;await save();
  row.second_result=await wait(second.id);row.restored_output_verified=row.second_result.state==='completed'&&row.second_result.output.text.includes(marker)&&row.second_result.output.text.includes(persona);await save();if(row.second_result.state!=='completed')throw Error(row.second_result.error?.code??'restore_failed');
  row.workspace_after=await inspectServerlessWorkspace(session.id,'headless-marker.txt');if(row.workspace_after.sha256!==row.workspace_before.sha256)throw Error('restored_file_bytes_mismatch');if(row.workspace_after.native_session!==row.workspace_before.native_session)throw Error('native_session_changed');
  row.second_invocation=await auditInvocation(second.id,definition);row.after_wake=await invoke('session','session',[session.id]);
  const events:any[]=[];let cursor='0';while(true){const batch=await invoke('events','events',[second.id,cursor]);if(!batch.events.length)break;events.push(...batch.events);cursor=batch.events.at(-1).id;}
  if(!events.some(e=>e.type==='agent.initialized'&&e.data.context_delivery==='native_history'))throw Error('native_context_receipt_missing');
  row.event_count=events.length;row.calls=await invoke('toolCalls','tool_calls',[second.id]);if(tools.wiki&&!row.calls.calls.some((x:any)=>x.state==='completed'&&!x.is_error))throw Error('tool_not_called');
  row.artifacts=await invoke('artifacts','artifacts',[second.id]);const artifact=row.artifacts.artifacts.find((a:any)=>a.name==='report.txt');if(!artifact)throw Error('artifact_missing');
  const bytes=language==='typescript'?await api.downloadArtifact(artifact.id):Buffer.from((await promisify(execFile)('python3',['-c','import sys,base64; from hexagon import Hexagon; print(base64.b64encode(Hexagon.local().download_artifact(sys.argv[1])).decode())',artifact.id],{env:{...process.env,PYTHONPATH:process.env.HEXAGON_TEST_PYTHON_PATH??resolve('sdk/python')}})).stdout.trim(),'base64');if(!Buffer.from(bytes).toString().includes(marker))throw Error('artifact_content_missing');row.artifact_verified=true;
  if(row.authorization_connection){
   row.deny=true;const denied=await submit('Call wiki to read modelcontextprotocol/typescript-sdk. If denied, report denial and do not retry.','denied');row.denied=denied.id;await save();row.denied_result=await wait(denied.id);
   const decisions=await invoke('approvals','approvals',[denied.id]);if(!decisions.approvals.some((a:any)=>a.state==='denied'))throw Error('denial_decision_missing');row.denied_decision_verified=true;const deniedCalls=await invoke('toolCalls','tool_calls',[denied.id]);if(!deniedCalls.calls.some((x:any)=>x.is_error))throw Error('denial_not_observed');
   await api.updateConnection(row.authorization_connection,{enabled:false});const revoked=await submit('Call wiki to read modelcontextprotocol/typescript-sdk.','revoked');row.revoked=revoked.id;await save();
   for(let n=0;n<180;n++){const state=await invoke('run','run',[revoked.id]);if(state.state==='waiting_authorization'){row.revocation_verified=true;break;}if(terminal(state))break;await sleep(2000);}if(!row.revocation_verified)throw Error('revocation_not_observed');
  }
  if(!row.initialization_output_verified)throw Error('initialization_output_mismatch');
  if(!row.restored_output_verified)throw Error('restored_output_mismatch');
  row.status='passed';
 }catch(e:any){row.status='failed';row.error=typeof e.code==='string'?e.code:e.message;row.diagnostic=e.stderr?.slice(-4000);process.exitCode=1;}
 finally{
  if(row.session){try{for(const id of [row.first,row.second,row.denied,row.revoked].filter(Boolean)){if(!terminal(await api.run(id))){await api.cancel(id);await wait(id);}}try{await invoke('close','close',[row.session]);}catch(e:any){row.close_request_error=typeof e.code==='string'?e.code:'close_response_unconfirmed';row.close_diagnostic=e.stderr?.slice(-4000);}for(let n=0;n<90;n++){if((await api.session(row.session)).state==='closed'){row.cleanup='confirmed';const retained=row.second||row.first?await invoke('run','run',[row.second??row.first]):null;if(row.status==='passed'&&retained?.state!=='completed')throw Error('closed_result_lost');if(row.status==='passed'&&row.artifact_verified){const artifact=row.artifacts.artifacts.find((a:any)=>a.name==='report.txt');const retainedBytes=await api.downloadArtifact(artifact.id);if(!retainedBytes.byteLength)throw Error('closed_artifact_lost');row.closed_artifact_verified=true;}break;}await sleep(1000);}if(row.cleanup!=='confirmed')throw Error('cleanup_pending');}catch(e:any){row.cleanup_error=typeof e.code==='string'?e.code:e.message;if(row.status==='passed')row.status='passed_cleanup_unconfirmed';process.exitCode=1;}}
  if(row.authorization_connection&&(!row.session||row.cleanup==='confirmed')){try{await api.deleteConnection(row.authorization_connection);row.authorization_cleanup='confirmed';}catch(e:any){row.authorization_cleanup_error=e.code??e.message;}}
  await save();console.log(JSON.stringify({provider,protocol,language,status:row.status,error:row.error,cleanup:row.cleanup}));
 }
}
