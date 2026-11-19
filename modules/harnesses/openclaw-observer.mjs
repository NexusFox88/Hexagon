// OpenClaw 2026.11.5 exposes its public event bus from a generated named-export module.
// Observe tool boundaries only: never forward arguments, results, messages or reasoning.
import {readdir} from 'node:fs/promises';
import {dirname,join} from 'node:path';
import {pathToFileURL} from 'node:url';
const entryDirectory=dirname(process.argv[1]??'/app/openclaw.mjs');
const roots=[join(entryDirectory,'dist'),entryDirectory,'/app/dist','/usr/local/lib/node_modules/openclaw/dist'];
// Keep NODE_OPTIONS for OpenClaw's own compile-cache/runtime respawn.
let subscribed=false;
for(const root of roots){
 try{
  for(const file of (await readdir(root)).filter(name=>/^agent-events-[\w-]+\.mjs$/.test(name))){
   const module=await import(pathToFileURL(join(root,file)).href);
   if(typeof module.onAgentEvent!=='function')continue;
   module.onAgentEvent(event=>{
    const data=event?.data;
    if(event?.stream!=='tool'||!['start','result'].includes(data?.phase)||typeof data.name!=='string')return;
    process.stdout.write(JSON.stringify({type:'hexagon.openclaw.activity',phase:data.phase,name:data.name.slice(0,256),...(typeof data.toolCallId==='string'?{id:data.toolCallId.slice(0,512)}:{}),...(typeof data.isError==='boolean'?{is_error:data.isError}:{})})+'\n');
   });
   subscribed=true;break;
  }
 }catch{/* Custom images can omit the native observer; final results still work. */}
 if(subscribed)break;
}
if(!subscribed)process.stderr.write('hexagon_openclaw_activity_unavailable\n');
