import { afterEach, expect, it, vi } from 'vitest';
import { Agent37Connector } from './agent37.js';
afterEach(() => vi.unstubAllGlobals());
const connector = () => new Agent37Connector({}, 'account-secret');

it('preserves inspection uncertainty and does not wake stopped compute', async () => {
  const fetch = vi.fn().mockResolvedValueOnce(new Response('', { status: 404 }))
    .mockResolvedValueOnce(new Response('', { status: 401 }))
    .mockRejectedValueOnce(new Error('network'))
    .mockResolvedValueOnce(Response.json({ id: 'owned', status: 'sleeping' }));
  vi.stubGlobal('fetch', fetch);
  expect(await connector().inspect('owned')).toBeNull();
  await expect(connector().inspect('owned')).rejects.toThrow('agent37_http_401');
  await expect(connector().inspect('owned')).rejects.toThrow('network');
  await expect(connector().execute('owned', 'echo should-not-run')).rejects.toThrow('agent37_sandbox_not_running');
  expect(fetch).toHaveBeenCalledTimes(4);
});

it('rejects unsupported egress before provider allocation', async () => {
  const fetch = vi.fn(); vi.stubGlobal('fetch', fetch);
  await expect(connector().create({ operation_id: 'operation', session_id: 'session', timeout_seconds: 60,
    network: { mode: 'allowlist', allowed_hosts: ['example.com'] } })).rejects.toThrow('agent37_network_allowlist_unsupported');
  expect(fetch).not.toHaveBeenCalled();
});

it('rejects truncated command output and does not report it as file data or successful execution', async () => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce(Response.json({ id: 'owned', status: 'running' }))
    .mockResolvedValueOnce(Response.json({ exit_code: 0, stdout: 'partial', stderr: '', truncated: true })));
  await expect(connector().execute('owned', 'cat file')).rejects.toThrow('agent37_command_output_truncated');
});

it('reconciles both operation metadata and the exact name, returning every matching resource', async () => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(Response.json({ data: [
    { id: 'one', status: 'running', name: 'hexagon-op', metadata: { hexagon_operation: 'op' } },
    { id: 'two', status: 'running', name: 'hexagon-op', metadata: { hexagon_operation: 'op' } },
    { id: 'other', status: 'running', name: 'hexagon-op', metadata: { hexagon_operation: 'different' } },
  ] })));
  expect((await connector().findByOperation('op')).map(row => row.id)).toEqual(['one', 'two']);
});
