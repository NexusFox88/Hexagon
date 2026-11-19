import {it,expect,vi} from 'vitest';
import {CredentialReadiness} from '../modules/deployment/credential-readiness.js';
import {DevelopmentIngress} from '../modules/deployment/ingress.js';
import {CredentialIngressHealth,credentialListenerId} from '../modules/access/ingress-health.js';
function fixture({automatic=true,replace=true,fail=false}={}){
 let origin='',healthy=false;
 const open=vi.fn(async()=>{if(fail)throw Error('private failure');healthy=true;return {origin:'https://example.test',close:async()=>{healthy=false;}};});
 const ingress=new DevelopmentIngress(open,value=>{origin=value;});
 const fetcher=vi.fn(async()=>({ok:healthy,json:async()=>({instance:credentialListenerId})})) as unknown as typeof fetch;
 const health=new CredentialIngressHealth(()=>({state:origin?'configured':'not_configured',origin:origin||undefined}),fetcher);
 const readiness=new CredentialReadiness(health,ingress,automatic,async()=>replace);
 return {ingress,open,health,readiness};
}
it('automatically starts and restores a stopped ingress and coalesces concurrent SDK calls',async()=>{
 const f=fixture();await Promise.all(Array.from({length:10},()=>f.readiness.ensure()));expect(f.open).toHaveBeenCalledTimes(1);
 await f.readiness.ensure();expect(f.open).toHaveBeenCalledTimes(1);
 await f.ingress.stop();expect((await f.health.check()).state).toBe('not_configured');
 await Promise.all([f.readiness.ensure(),f.readiness.ensure()]);expect(f.open).toHaveBeenCalledTimes(2);expect((await f.health.check(true)).state).toBe('reachable');await f.ingress.close();
});
it('fails clearly without replacing an origin already used by existing runtimes',async()=>{
 const f=fixture({replace:false});await expect(f.readiness.ensure()).rejects.toMatchObject({code:'credential_ingress_recovery_blocked'});expect(f.open).not.toHaveBeenCalled();
});
it('does not create development ingress for externally managed or explicitly disabled deployments',async()=>{
 const f=fixture({automatic:false});await expect(f.readiness.ensure()).rejects.toMatchObject({code:'credential_ingress_unreachable'});expect(f.open).not.toHaveBeenCalled();
});
it('reports a sanitized bounded startup failure',async()=>{
 const f=fixture({fail:true});await expect(f.readiness.ensure()).rejects.toMatchObject({code:'credential_proxy_tunnel_unavailable'});
 expect(f.ingress.status()).toMatchObject({state:'unavailable'});expect(f.open).toHaveBeenCalledTimes(1);
});

it('rechecks a transient probe failure without rotating an active origin',async()=>{
 const health={check:vi.fn().mockResolvedValueOnce({state:'unreachable',origin:'https://example.test'}).mockResolvedValue({state:'reachable',origin:'https://example.test'})};
 const ingress={retry:vi.fn()},replace=vi.fn(async()=>false);
 await new CredentialReadiness(health as any,ingress as any,true,replace).ensure();
 expect(replace).not.toHaveBeenCalled();expect(ingress.retry).not.toHaveBeenCalled();
});

it('checks an enabled idle channel in the background and stops its timer on shutdown',async()=>{
 vi.useFakeTimers();const f=fixture();try{
  await f.ingress.start();f.readiness.start();await vi.advanceTimersByTimeAsync(15000);expect(f.readiness.status().state).toBe('ready');
  const calls=f.open.mock.calls.length;f.readiness.stop();await f.ingress.stop();await vi.advanceTimersByTimeAsync(120000);expect(f.open).toHaveBeenCalledTimes(calls);
 }finally{f.readiness.stop();await f.ingress.close();vi.useRealTimers();}
});
it('reports automatic retry time without exposing failure messages',async()=>{
 const f=fixture({fail:true});await expect(f.readiness.ensure()).rejects.toMatchObject({code:'credential_proxy_tunnel_unavailable'});
 expect(f.readiness.status()).toMatchObject({state:'unavailable',code:'credential_proxy_tunnel_unavailable',retry_at:expect.any(String)});
 expect(JSON.stringify(f.readiness.status())).not.toContain('private failure');
});
