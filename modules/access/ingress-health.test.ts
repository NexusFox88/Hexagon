import {it,expect,vi} from 'vitest';
import {CredentialIngressHealth,credentialListenerId} from './ingress-health.js';
it('distinguishes missing configuration, wrong listener, unreachable and matching ingress',async()=>{
 const fetcher=vi.fn();
 expect((await new CredentialIngressHealth(()=>({state:'not_configured'}),fetcher).check()).state).toBe('not_configured');expect(fetcher).not.toHaveBeenCalled();
 fetcher.mockResolvedValueOnce(new Response(JSON.stringify({instance:'another-server'})));
 expect((await new CredentialIngressHealth(()=>({state:'configured',origin:'https://proxy.test'}),fetcher).check()).state).toBe('unreachable');
 fetcher.mockRejectedValueOnce(new Error('network'));
 expect((await new CredentialIngressHealth(()=>({state:'configured',origin:'https://proxy.test'}),fetcher).check()).state).toBe('unreachable');
 fetcher.mockResolvedValueOnce(new Response(JSON.stringify({instance:credentialListenerId})));
 const monitor=new CredentialIngressHealth(()=>({state:'configured',origin:'https://proxy.test'}),fetcher);
 const [a,b]=await Promise.all([monitor.check(),monitor.check()]);expect(a.state).toBe('reachable');expect(b).toEqual(a);await monitor.check();expect(fetcher).toHaveBeenCalledTimes(3);
});
