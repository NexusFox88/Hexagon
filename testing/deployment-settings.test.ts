import {mkdtemp,readFile,rm,stat} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {afterEach,expect,it} from 'vitest';
import {DeploymentSettings,deploymentEnvironment,deploymentInput} from '../modules/deployment/settings.js';
import {DevelopmentIngress} from '../modules/deployment/ingress.js';
const directories:string[]=[];afterEach(async()=>{await Promise.all(directories.splice(0).map(d=>rm(d,{recursive:true,force:true})));});
it('persists atomic private configuration and rejects stale writes',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'hexagon-deployment-'));directories.push(dir);const settings=new DeploymentSettings(dir);const before=await settings.read();
 const config={no_proxy:['api.instabox.sh'],ingress:{mode:'disabled'}};
 const saved=await settings.update({config,expected_revision:before.revision});expect(saved.restart_required).toBe(true);
 expect((await new DeploymentSettings(dir).read()).config).toEqual(config);
 await expect(settings.update({config:{no_proxy:[],ingress:{mode:'cloudflare'}},expected_revision:before.revision})).rejects.toMatchObject({code:'deployment_configuration_changed'});
 expect((await stat(join(dir,'deployment.json'))).mode&0o777).toBe(0o600);expect(JSON.parse(await readFile(join(dir,'deployment.json'),'utf8')).no_proxy).toEqual(['api.instabox.sh']);
});
it('applies environment overrides and persists bypass without dropping loopback',()=>{
 const config=deploymentInput.parse({outbound_proxy:'http://127.0.0.1:8888',no_proxy:['api.instabox.sh'],ingress:{mode:'external',url:'https://access.example.com'}});
 const env=deploymentEnvironment(config,{HTTPS_PROXY:'http://127.0.0.1:9999',NO_PROXY:'local.example'});
 expect(env.HTTPS_PROXY).toBe('http://127.0.0.1:9999');expect(env.https_proxy).toBe(env.HTTPS_PROXY);expect(env.http_proxy).toBe(env.HTTP_PROXY);expect(env.NO_PROXY).toBe('127.0.0.1,localhost,api.instabox.sh,local.example');expect(env.HEXAGON_ACCESS_TUNNEL).toBe('');expect(env.HEXAGON_ACCESS_URL).toBe('https://access.example.com');
 expect(deploymentInput.safeParse({outbound_proxy:'http://user:secret@proxy.example'}).success).toBe(false);
 expect(deploymentInput.safeParse({ingress:{mode:'external',url:'http://example.com'}}).success).toBe(false);
});
it('keeps failed ingress separate from management and retries without parallel opens',async()=>{
 let attempts=0,closed=0;const published:string[]=[];
 const ingress=new DevelopmentIngress(async()=>{attempts++;if(attempts===1)throw new Error('private proxy URL and secret');return {origin:'https://test.example',close:async()=>{closed++;}};},origin=>published.push(origin));
 await Promise.all([ingress.start(),ingress.start()]);expect(attempts).toBe(1);expect(ingress.status()).toMatchObject({state:'unavailable',code:'credential_proxy_tunnel_unavailable'});expect(JSON.stringify(ingress.status())).not.toContain('secret');
 await ingress.start();expect(published).toEqual(['https://test.example']);await ingress.start();expect(attempts).toBe(2);await ingress.close();expect(closed).toBe(1);
});
it('closes a late tunnel instead of publishing it during shutdown',async()=>{
 let finish!:(v:any)=>void,closed=0,published=false;const ingress=new DevelopmentIngress(()=>new Promise(resolve=>{finish=resolve;}),origin=>{if(origin)published=true;});
 const opening=ingress.start();await Promise.resolve();const stopping=ingress.close();finish({origin:'https://test.example',close:async()=>{closed++;}});await Promise.all([opening,stopping]);expect(published).toBe(false);expect(closed).toBe(1);
});

it('routes a bypassed provider directly with inherited IPv6 and CIDR entries',async()=>{
 const {createServer}=await import('node:http');const {getGlobalDispatcher,setGlobalDispatcher}=await import('undici');const {configureOutboundProxy}=await import('../modules/deployment/outbound.js');
 const original=getGlobalDispatcher();let proxied=0;
 const target=createServer((_req,res)=>res.end('direct')),proxy=createServer((_req,res)=>{proxied++;res.writeHead(502);res.end();});
 await new Promise<void>(r=>target.listen(0,'127.0.0.1',r));await new Promise<void>(r=>proxy.listen(0,'127.0.0.1',r));
 const dispatcher=configureOutboundProxy({HTTP_PROXY:`http://127.0.0.1:${(proxy.address() as {port:number}).port}`,NO_PROXY:'127.0.0.1,localhost,::1,.local,10.0.0.0/8,172.16.0.0/12'});
 try{const response=await fetch(`http://127.0.0.1:${(target.address() as {port:number}).port}`);expect(await response.text()).toBe('direct');expect(proxied).toBe(0);}finally{setGlobalDispatcher(original);await dispatcher.close();await Promise.all([target,proxy].map(s=>new Promise<void>(r=>s.close(()=>r()))));}
});

it('coalesces retries while the previous tunnel is closing',async()=>{
 let opens=0,closes=0,release!:()=>void;const published:string[]=[];
 const ingress=new DevelopmentIngress(async()=>{opens++;return {origin:'https://test.example',close:async()=>{closes++;if(closes===1)await new Promise<void>(r=>{release=r;});}};},v=>published.push(v));
 await ingress.start();const first=ingress.retry();await Promise.resolve();const second=ingress.retry();expect(first).toBe(second);expect(opens).toBe(1);release();await Promise.all([first,second]);expect(opens).toBe(2);expect(published).toEqual(['https://test.example','','https://test.example']);await ingress.close();
});

it('stops development ingress without stopping management and permits explicit restart',async()=>{let closed=0,opened=0;const origins:string[]=[];const ingress=new DevelopmentIngress(async()=>{opened++;return {origin:'https://test.example',close:async()=>{closed++;}};},v=>origins.push(v));await ingress.start();await Promise.all([ingress.stop(),ingress.stop()]);expect(ingress.status().state).toBe('disabled');expect(closed).toBe(1);expect(origins.at(-1)).toBe('');await ingress.retry();expect(opened).toBe(2);expect(ingress.status().state).toBe('ready');await ingress.close();});
