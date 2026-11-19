import {spawn} from 'node:child_process';
import {setTimeout as delay} from 'node:timers/promises';
/** Explicit acceptance-only fallback; forwards only the isolated credential listener. */
export async function openLocalhostAccessTunnel(address:string){
 const local=new URL(address);
 if(local.protocol!=='http:'||local.hostname!=='127.0.0.1'||local.pathname!=='/'||local.username||local.password||local.search||local.hash)throw Error('credential_tunnel_requires_loopback_listener');
 const child=spawn('ssh',['-T','-o','BatchMode=yes','-o','ConnectTimeout=15','-o','StrictHostKeyChecking=accept-new','-o','ExitOnForwardFailure=yes','-o','ServerAliveInterval=15','-R',`80:127.0.0.1:${local.port}`,'nokey@localhost.run'],{stdio:['ignore','pipe','pipe']});
 let tail='',origin='',exited=false;
 const receive=(chunk:Buffer)=>{tail=(tail+chunk.toString()).slice(-8192);origin ||= tail.match(/https:\/\/[a-zA-Z0-9-]+\.(?:lhr\.life|localhost\.run)/)?.[0]??'';};child.stdout.on('data',receive);child.stderr.on('data',receive);
 const exit=new Promise<void>(resolve=>{child.on('error',()=>{exited=true;resolve();});child.on('exit',()=>{exited=true;resolve();});});
 const close=async()=>{if(!exited){child.kill('SIGTERM');const timer=setTimeout(()=>{if(!exited)child.kill('SIGKILL');},3000);try{await exit;}finally{clearTimeout(timer);}}};
 try{const deadline=Date.now()+45000;while(Date.now()<deadline&&!exited){if(origin){try{const response=await fetch(origin+'/health/live',{signal:AbortSignal.timeout(3000)});if(response.ok&&(await response.json()).state==='ready')return {origin,close};}catch{}}await delay(500);}throw Error('credential_proxy_fallback_unavailable');}catch(error){await close();throw error;}
}
