import { EventEmitter } from 'node:events';
import { createServer } from 'node:net';
import { PassThrough } from 'node:stream';
import { afterEach, expect, it, vi } from 'vitest';
const state = vi.hoisted(() => ({ children: [] as any[], httpFailures: 0 }));
vi.mock('node:child_process', () => ({ spawn: (_file: string, args: string[]) => {
  const child = Object.assign(new EventEmitter(), { stdin: new PassThrough(), stdout: new PassThrough(), stderr: new PassThrough(), kill: vi.fn() });
  const server = createServer(socket => socket.once('data', () => {
    if (state.httpFailures > 0) { state.httpFailures--; socket.destroy(); }
    else socket.end('HTTP/1.0 401 Unauthorized\r\nContent-Length: 0\r\n\r\n');
  }));
  child.kill.mockImplementation(() => { server.close(() => child.emit('close', 0)); return true; });
  state.children.push(child);
  server.listen(Number(args[1]!.split(':')[0]), '127.0.0.1', () => child.emit('spawn'));
  return child;
} }));
import { acquireFlyProxy, closeFlyProxies } from './fly-machines-proxy.js';
const app = 'hexagon-00000000-0000-4000-8000-000000000000';
afterEach(async () => { await closeFlyProxies(app); state.children.length = 0; state.httpFailures = 0; });
it('shares concurrent leases, preserves another active lease, and closes on App cleanup', async () => {
  const prepare = vi.fn().mockResolvedValue({ port: 1234, close: vi.fn().mockResolvedValue(undefined) });
  const [a, b] = await Promise.all([acquireFlyProxy(app, 'abc', 'fixture', 8765, prepare), acquireFlyProxy(app, 'abc', 'fixture', 8765, prepare)]);
  expect(a.url).toBe(b.url); expect(prepare).toHaveBeenCalledTimes(1); expect(state.children).toHaveLength(1);
  a.release!(); a.release!(); expect(state.children[0].kill).not.toHaveBeenCalled();
  b.release!();
  const c = await acquireFlyProxy(app, 'abc', 'fixture', 8765, prepare); expect(c.url).toBe(a.url);
  await closeFlyProxies(app); expect(state.children[0].kill).toHaveBeenCalledTimes(1); c.release!();
});
it('does not share a tunnel after credential rotation', async () => {
  const a = await acquireFlyProxy(app, 'abc', 'first-credential', 8765);
  const b = await acquireFlyProxy(app, 'abc', 'rotated-credential', 8765);
  expect(a.url).not.toBe(b.url); expect(state.children).toHaveLength(2); a.release!(); b.release!();
});
it('waits for remote HTTP after the local listener is already available', async () => {
  state.httpFailures = 1;
  const target = await acquireFlyProxy(app, 'abc', 'fixture', 8765);
  expect(state.httpFailures).toBe(0);
  expect((await fetch(target.url)).status).toBe(401);
  target.release!();
});
