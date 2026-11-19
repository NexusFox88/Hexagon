import {Hexagon} from '../sdk/typescript/index.js';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {randomUUID} from 'node:crypto';
const name=process.argv[2]!;
if(!name||!process.env.HEXAGON_ACCEPTANCE_CONFIG)throw new Error('usage: HEXAGON_ACCEPTANCE_CONFIG=config.json npx tsx tooling/smoke-harness-oci.ts HARNESS');
const c=await Hexagon.local(),cfg=JSON.parse(await readFile(process.env.HEXAGON_ACCEPTANCE_CONFIG,'utf8'));
await mkdir('.local/evidence',{recursive:true});
const file=`.local/evidence/harness-${name}-typescript-${randomUUID()}.json`,r:any={harness:name,client:'typescript',started_at:new Date().toISOString()},save=()=>writeFile(file,JSON.stringify(r,null,2),{mode:0o600});
async function wait(id:string){const until=Date.now()+900000;while(Date.now()<until){const run=await c.run(id);if(['completed','failed','cancelled'].includes(run.state))return run;await new Promise(r=>setTimeout(r,2000));}throw new Error('run_timeout');}
try{
 const session=await c.createSession({harness:cfg.harnesses[name],sandbox_connection_id:cfg.sandbox,model_connection_id:name==='hermes'?cfg.chat:cfg.model,name:`${name} · TypeScript cloud journey`,tools:{search:cfg.tool},env:{APP_ACCEPTANCE_CLIENT:'typescript'},resources:{timeout_seconds:1800}});r.session=session.id;await save();
 const first=await c.submit(session.id,'Remember the passphrase OCTAGON-73. Reply CLOUD_TYPESCRIPT_OK and the passphrase. Do not call tools.',randomUUID());r.first_run=first.id;await save();r.first=await wait(first.id);await save();if(r.first.state!=='completed'||!r.first.output?.text.includes('OCTAGON-73'))throw new Error(r.first.error?.code??'first_failed');
 const second=await c.submit(session.id,'Recall the passphrase from our previous turn. Use the assigned search tool once to find official OCI image specification documentation. Write report.json in the requested artifact directory with remembered_code containing only the passphrase, env_value read from APP_ACCEPTANCE_CLIENT, and source_url from the tool result. Do not change the environment. Return the passphrase in the final answer.',randomUUID());r.second_run=second.id;await save();r.second=await wait(second.id);await save();if(r.second.state!=='completed'||!r.second.output?.text.includes('OCTAGON-73'))throw new Error(r.second.error?.code??'second_failed');
 r.calls=await c.toolCalls(second.id);if(!r.calls.calls.some((x:any)=>x.state==='completed'&&!x.is_error))throw new Error('tool_not_called');
 r.artifacts=await c.artifacts(second.id);const artifact=r.artifacts.artifacts.find((x:any)=>x.name==='report.json');if(!artifact)throw new Error('artifact_missing');const content=JSON.parse(Buffer.from(await c.downloadArtifact(artifact.id)).toString());if(content.remembered_code!=='OCTAGON-73'||content.env_value!=='typescript'||!content.source_url?.startsWith('https://'))throw new Error('artifact_mismatch');r.artifact_verified=true;
 r.events=(await c.events(second.id)).events;r.passed=true;
}catch(e:any){r.error=e.code??e.message;process.exitCode=1;}
finally{await save();if(r.session){try{await c.close(r.session);}catch(e:any){r.cleanup_error=e.code??e.message;}for(let i=0;i<90;i++){const s=await c.session(r.session);if(s.state==='closed'){r.cleanup='confirmed';break;}await new Promise(r=>setTimeout(r,1000));}if(r.cleanup!=='confirmed')process.exitCode=1;}await save();console.log({harness:name,passed:r.passed,error:r.error,cleanup:r.cleanup});}
