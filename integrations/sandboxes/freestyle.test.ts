import { afterEach, expect, it, vi } from 'vitest';
import { FreestyleConnector } from './freestyle.js';
afterEach(() => vi.unstubAllGlobals());
it('does not allocate for unsupported network restrictions', async () => {
  const fetch = vi.fn(); vi.stubGlobal('fetch', fetch);
  await expect(new FreestyleConnector({}, 'fixture').create({ operation_id: 'op', session_id: 'session', timeout_seconds: 60,
    network: { mode: 'allowlist', allowed_hosts: ['example.com'] } })).rejects.toThrow('freestyle_network_allowlist_unsupported');
  expect(fetch).not.toHaveBeenCalled();
});
it('does not wake paused compute for execution', async () => {
  const connector = new FreestyleConnector({}, 'fixture');
  vi.spyOn(connector, 'inspect').mockResolvedValue({ id: 'vm', state: 'paused', memory_mb: 4096 });
  const fetch = vi.fn(); vi.stubGlobal('fetch', fetch);
  await expect(connector.execute('vm', 'echo unexpected')).rejects.toThrow('freestyle_sandbox_not_running');
  expect(fetch).not.toHaveBeenCalled();
});
it('uses the filesystem owner identity for foreground and background processes',async()=>{
 const connector=new FreestyleConnector({},'fixture');
 const exec=vi.fn().mockResolvedValueOnce({stdout:'ok',stderr:'',statusCode:0}).mockResolvedValueOnce({stdout:'42\n',statusCode:0});
 vi.spyOn(connector as any,'running').mockResolvedValue({exec});
 await connector.execute('vm','python3 /tmp/hexagon-runtime/launch.py');
 expect(await connector.execute('vm','python3 /tmp/hexagon-runtime/launch.py',{background:true})).toMatchObject({pid:42});
 expect(exec.mock.calls.map(([request])=>request.linuxUser)).toEqual(['root','root']);
});
