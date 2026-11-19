import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { createServer } from 'node:net';
import type { Sandbox } from '@vercel/sandbox';
import { expect, it } from 'vitest';
import { openVercelTunnel } from './vercel-transport.js';

it('preserves binary bytes through fragmented text logs, EOF and stdin backpressure', async () => {
  const bytes = Buffer.alloc(256 * 1024); for (let i = 0; i < bytes.length; i++) bytes[i] = i % 256;
  const upstream = createServer(socket => socket.once('data', data => {
    expect(data.toString()).toContain('Authorization: Bearer test');
    socket.end(Buffer.concat([Buffer.from('HTTP/1.0 200 OK\r\n\r\n'), bytes]));
  }));
  upstream.listen(0, '127.0.0.1'); await once(upstream, 'listening');
  const address = upstream.address(); if (!address || typeof address === 'string') throw new Error('port');
  const children: ReturnType<typeof spawn>[] = [];
  const box = { runCommand: async ({ args }: { args: string[] }) => {
    // Real Python relay, with SDK-shaped text log and acknowledged stdin APIs.
    const child = spawn('python3', args.slice(3), { stdio: 'pipe' }); children.push(child);
    const done = once(child, 'exit').then(([code]) => ({ exitCode: code }));
    await once(child, 'spawn'); child.stderr.resume();
    return {
      async *logs() { for await (const chunk of child.stdout) {
        const text = chunk.toString('utf8');
        for (let i = 0; i < text.length; i += 731) yield { stream: 'stdout', data: text.slice(i, i + 731) };
      } },
      writeStdin: (bytes: Buffer) => new Promise<void>((resolve, reject) => child.stdin.write(bytes, error => error ? reject(error) : resolve())),
      closeStdin: async () => { child.stdin.end(); }, wait: () => done,
      kill: async () => { child.kill(); },
    };
  } } as unknown as Sandbox;
  const target = await openVercelTunnel(box, address.port);
  try {
    const response = await fetch(target.url, { headers: { Authorization: 'Bearer test' }, signal: AbortSignal.timeout(5000) });
    expect(Buffer.from(await response.arrayBuffer())).toEqual(bytes);
    target.release?.(); target.release?.();
    await expect(fetch(target.url)).rejects.toThrow();
  } finally {
    target.release?.(); for (const child of children) child.kill();
    await new Promise<void>(resolve => upstream.close(() => resolve()));
  }
});
