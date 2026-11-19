import { createServer, type Socket } from 'node:net';
import type { Readable, Writable } from 'node:stream';
import type { SandboxHttpTarget } from '../../modules/sandboxes/connector.js';

export interface TunnelCommand {
  stdin: Writable;
  stdout: Readable;
  stderr: Readable;
  on(event: string, listener: (...args: any[]) => void): unknown;
  kill(signal?: string): unknown;
  close?(): void;
}

/** Provider-authenticated command stdio carries bytes, never account credentials.
 * start must resolve only after the remote command accepts stdin.
 */
export async function openCommandTunnel(start: () => Promise<TunnelCommand>): Promise<SandboxHttpTarget> {
  const sockets = new Set<Socket>();
  const commands = new Set<TunnelCommand>();
  let released = false;
  const stop = (command: TunnelCommand) => {
    if (!commands.delete(command)) return;
    try { command.kill('SIGTERM'); } finally { command.close?.(); }
  };
  const server = createServer(socket => {
    sockets.add(socket);
    socket.pause();
    const deadline = setTimeout(() => socket.destroy(), 45000);
    deadline.unref();
    let command: TunnelCommand | undefined;
    socket.on('error', () => {});
    socket.once('close', () => {
      clearTimeout(deadline); sockets.delete(socket);
      if (command) stop(command);
    });
    void start().then(remote => {
      command = remote; commands.add(remote);
      remote.on('error', () => socket.destroy());
      remote.stdin.on('error', () => socket.destroy());
      remote.stdout.on('error', () => socket.destroy());
      remote.stderr.on('error', () => socket.destroy());
      remote.stderr.resume();
      if (released || socket.destroyed) { stop(remote); return; }
      socket.pipe(remote.stdin);
      remote.stdout.pipe(socket);
      socket.resume();
    }).catch(() => socket.destroy());
  });
  await new Promise<void>((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => { server.off('error', reject); resolve(); });
  });
  const address = server.address();
  if (!address || typeof address === 'string') { server.close(); throw new Error('tunnel_address_unavailable'); }
  const release = () => {
    if (released) return;
    released = true;
    server.close();
    for (const socket of sockets) socket.destroy();
    for (const command of commands) stop(command);
  };
  return { url: `http://127.0.0.1:${address.port}`, headers: {}, release };
}
