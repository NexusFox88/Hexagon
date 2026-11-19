import { afterEach, expect, it, vi } from 'vitest';
import extension from './pi-extension.mjs';

afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); });
it('retries the identical mailbox call and surfaces rejected tool results', async () => {
  vi.stubEnv('HEXAGON_MODEL_CONFIG', JSON.stringify({ base_url: 'https://model.example', model: 'model', run_id: 'run' }));
  vi.stubEnv('HEXAGON_TOOLS', JSON.stringify([{ name: 'report__write', description: 'write', inputSchema: { type: 'object' } }]));
  vi.stubEnv('HEXAGON_RUN_ID', 'run'); vi.stubEnv('HEXAGON_TOOL_TOKEN', 'scoped-token');
  let tool;
  extension({ registerProvider: vi.fn(), registerTool: value => { tool = value; } });
  const fetch = vi.fn().mockRejectedValueOnce(new Error('lost response')).mockResolvedValueOnce(new Response(JSON.stringify({ state: 'completed', result: { content: [{ type: 'text', text: 'saved' }] } })));
  vi.stubGlobal('fetch', fetch);
  expect((await tool.execute('native-tool-id', { summary: 'done' })).content[0].text).toBe('saved');
  expect(fetch.mock.calls[0][1].body).toBe(fetch.mock.calls[1][1].body);
  expect(fetch.mock.calls[0][0]).toBe('http://127.0.0.1:8765/tools/run/call');
  expect(fetch.mock.calls[0][1].headers.Authorization).toBe('Bearer scoped-token');
  fetch.mockResolvedValueOnce(new Response(JSON.stringify({ state: 'completed', result: { isError: true, content: [{ type: 'text', text: 'Not approved' }] } })));
  await expect(tool.execute('another', {})).rejects.toThrow('Not approved');
});
