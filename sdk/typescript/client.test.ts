import { afterEach, describe, expect, it, vi } from 'vitest';
import { Hexagon } from './index.js';

describe('TypeScript SSE client', () => {
  afterEach(() => vi.unstubAllGlobals());
  it('decodes split UTF-8 and keeps event ids for reconnect', async () => {
    const bytes = new TextEncoder().encode('id: 12\nevent: run.completed\ndata: {"text":"\u5b8c\u6210"}\n\nevent: stream.end\ndata: {"state":"completed"}\n\n');
    const stream = new ReadableStream({ start(controller) { for (const byte of bytes) controller.enqueue(new Uint8Array([byte])); controller.close(); } });
    vi.stubGlobal('fetch', vi.fn(async () => new Response(stream)));
    const rows = [];
    for await (const event of new Hexagon('http://example.test', 'token').stream('run')) rows.push(event);
    expect(rows).toEqual([{ id: '12', type: 'run.completed', data: { text: '\u5b8c\u6210' } }, { type: 'stream.end', data: { state: 'completed' } }]);
  });
  it('reports a clean transport EOF before terminal state as a disconnect', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('id: 1\nevent: run.queued\ndata: {}\n\n')));
    const stream = new Hexagon('http://example.test', 'token').stream('run');
    expect((await stream.next()).value?.id).toBe('1');
    await expect(stream.next()).rejects.toThrow('disconnected before terminal');
  });
});
