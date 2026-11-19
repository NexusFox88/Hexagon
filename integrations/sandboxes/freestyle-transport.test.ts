import type { Vm, PtyOpenOptions, PtySessionEvents, PtySession } from 'freestyle';
import { once } from 'node:events';
import { expect, it, vi } from 'vitest';
import { freestyleRelay } from './freestyle-transport.js';

function fixture() {
  let options!: PtyOpenOptions & PtySessionEvents;
  const handle = { sessionId: 7, write: vi.fn(), signal: vi.fn(), detach: vi.fn() } as unknown as PtySession;
  const close = vi.fn(async () => ({ sessionId: 7 }));
  const vm = { pty: { close, open: async (value: PtyOpenOptions & PtySessionEvents) => {
    options = value;
    const marker = value.exec!.match(/HEXAGON-RAW-[a-f0-9-]+/)![0] + '\n';
    value.onData!(Buffer.from(marker.slice(0, 8))); value.onData!(Buffer.from(marker.slice(8)));
    return handle;
  } } } as unknown as Vm;
  return { vm, handle, close, output: (bytes: Uint8Array) => options.onData!(bytes), exit: (code: number) => options.onExit!(code) };
}
it('waits for raw-mode readiness, preserves binary bytes and EOF, and deletes its PTY session', async () => {
  const f = fixture(), command = await freestyleRelay(f.vm, 'source', 8765);
  const chunks: Buffer[] = []; command.stdout.on('data', bytes => chunks.push(bytes));
  const ended = once(command.stdout, 'end');
  const bytes = Buffer.from([0, 10, 13, 255, 128]);
  command.stdin.write(bytes); f.output(bytes); f.exit(0); await ended;
  expect(f.handle.write).toHaveBeenCalledWith(bytes); expect(Buffer.concat(chunks)).toEqual(bytes);
  command.kill(); command.close?.(); expect(f.close).toHaveBeenCalledWith(7); expect(f.handle.detach).toHaveBeenCalled();
});
it('fails on unbounded callback output rather than dropping or indefinitely buffering it', async () => {
  const f = fixture(), command = await freestyleRelay(f.vm, 'source', 8765);
  const errors: Error[] = []; command.on('error', error => errors.push(error));
  f.output(Buffer.alloc(9 * 1024 * 1024));
  expect(errors).toHaveLength(1); expect(command.stdout.destroyed).toBe(true);
  command.kill(); command.close?.();
});
