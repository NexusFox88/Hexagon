import { afterEach, expect, it, vi } from 'vitest';
import { BlaxelConnector } from './blaxel.js';
import { createSandboxConnector } from './registry.js';
afterEach(() => vi.unstubAllGlobals());
it('does not mistake authentication or transport failure for resource absence', async () => {
  const fetcher = vi.fn().mockResolvedValue(new Response('', { status: 404 })); vi.stubGlobal('fetch', fetcher);
  const connector = new BlaxelConnector({ workspace: 'team' }, 'fixture');
  expect(await connector.inspect('sandbox')).toBeNull();
  fetcher.mockResolvedValue(new Response(JSON.stringify({metadata:{name:'sandbox'},status:'TERMINATED'})));
  expect(await connector.inspect('sandbox')).toBeNull();
  fetcher.mockResolvedValue(new Response('', { status: 401 }));
  await expect(connector.inspect('sandbox')).rejects.toThrow('blaxel_request_failed_401');
  fetcher.mockRejectedValue(new Error('transport'));
  await expect(connector.findByOperation('operation')).rejects.toThrow('transport');
});
it('isolates connection credentials and rejects unsupported network policies before allocation', async () => {
  const fetcher = vi.fn().mockImplementation(async () => new Response('{}')); vi.stubGlobal('fetch', fetcher);
  const a = new BlaxelConnector({ workspace: 'one' }, 'first'), b = new BlaxelConnector({ workspace: 'two' }, 'second');
  await Promise.all([a.validate(), b.validate()]);
  expect(fetcher.mock.calls.map(call => call[1].headers['X-Blaxel-Workspace'])).toEqual(['one','two']);
  expect(fetcher.mock.calls.map(call => call[1].headers.Authorization)).toEqual(['Bearer first','Bearer second']);
  await expect(a.create({operation_id:'op',session_id:'session',timeout_seconds:300,network:{mode:'allowlist',allowed_hosts:[]}})).rejects.toThrow('unsupported');
  expect(fetcher).toHaveBeenCalledTimes(2);
});
it('refuses public or redirected preview credentials', async () => {
  let preview = {spec:{port:8765,public:true,url:'https://example.bl.run'}};
  const fetcher = vi.fn().mockImplementation(async (url:string) => {
    if (url.includes('/process/')) return new Response(JSON.stringify({status:'running',command:'python3 bridge.py serve 8765 /tmp/hexagon-blaxel-ports/state-1234.json'}));
    if (url.includes('/filesystem/')) return new Response(JSON.stringify({port:8765}));
    return new Response(JSON.stringify(preview));
  });
  vi.stubGlobal('fetch', fetcher);
  const connector = new BlaxelConnector({workspace:'team'}, 'fixture');
  vi.spyOn(connector,'inspect').mockImplementation(async id => {
    // Data-plane addressing is separately checked; this test isolates preview policy.
    (connector as any).urls.set(id,'https://sandbox.bl.run');
    return {id,state:'running',expires_at:undefined,memory_mb:undefined};
  });
  await expect(connector.preview('sandbox',8765)).rejects.toThrow('not_private');
  preview = {spec:{port:8765,public:false,url:'https://attacker.example'}};
  await expect(connector.preview('sandbox',8765)).rejects.toThrow('url_invalid');
  expect(fetcher.mock.calls.some(call => call[0].endsWith('/tokens'))).toBe(false);
});
it('does not silently fall back to another provider for invalid registrations', () => {
  expect(() => createSandboxConnector('unknown',{},'fixture')).toThrow('unsupported');
  expect(() => createSandboxConnector('__proto__',{},'fixture')).toThrow('unsupported');
});
it('reuses private preview tokens and leaves native IPv6 services untouched', async () => {
  const fetcher = vi.fn().mockImplementation(async (url:string) => new Response(JSON.stringify(url.endsWith('/tokens')
    ? {data:[{spec:{token:'scoped-preview-token',expired:false,expiresAt:new Date(Date.now()+3600000).toISOString()}}]}
    : {spec:{port:3000,public:false,url:'https://preview.bl.run'}})));
  vi.stubGlobal('fetch', fetcher);
  const connector = new BlaxelConnector({workspace:'team'}, 'account-key');
  vi.spyOn(connector,'execute').mockResolvedValue({stdout:'native\n',stderr:'',exit_code:0,pid:1});
  const target = await connector.preview('sandbox',3000);
  expect(target).toEqual({url:'https://preview.bl.run',headers:{'X-Blaxel-Preview-Token':'scoped-preview-token'}});
  expect(fetcher.mock.calls.every(call => call[1].method === 'GET')).toBe(true);
  expect(JSON.stringify(target)).not.toContain('account-key');
});
it('removes associated previews and verifies absence separately from compute', async () => {
  let listed=0;
  const fetcher=vi.fn().mockImplementation(async (_url:string, options:RequestInit) => {
    if(options.method==='DELETE')return new Response(null,{status:204});
    return new Response(JSON.stringify({data:listed++===0?[{metadata:{name:'owned-preview'}}]:[]}));
  });
  vi.stubGlobal('fetch',fetcher);
  await new BlaxelConnector({workspace:'team'},'fixture').cleanupAssociatedResources('expired-compute');
  expect(fetcher.mock.calls.filter(call=>call[1].method==='DELETE').map(call=>call[0])).toEqual(['https://api.blaxel.ai/v0/sandboxes/expired-compute/previews/owned-preview']);
  expect(listed).toBe(2);
  fetcher.mockResolvedValue(new Response('',{status:403}));
  await expect(new BlaxelConnector({workspace:'team'},'fixture').cleanupAssociatedResources('expired-compute')).rejects.toThrow('blaxel_request_failed_403');
});
it('reconciles a concurrent preview creation conflict without issuing another create', async () => {
  let reads = 0, creates = 0;
  const fetcher = vi.fn().mockImplementation(async (url: string, options: RequestInit) => {
    if (url.endsWith('/tokens')) return new Response(JSON.stringify([{spec:{token:'scoped',expiresAt:new Date(Date.now()+3600000).toISOString()}}]));
    if (options.method === 'POST') { creates++; return new Response('',{status:409}); }
    reads++;
    return reads === 1 ? new Response('',{status:404}) : new Response(JSON.stringify({spec:{port:8765,public:false,url:'https://preview.bl.run'}}));
  });
  vi.stubGlobal('fetch',fetcher);
  expect(await new BlaxelConnector({workspace:'team'},'fixture').preview('sandbox',8765)).toEqual({url:'https://preview.bl.run',headers:{'X-Blaxel-Preview-Token':'scoped'}});
  expect(creates).toBe(1);expect(reads).toBe(2);
});
