import { spawn } from 'node:child_process';
import { connect, createServer } from 'node:net';
import { EventEmitter, once } from 'node:events';
import { PassThrough } from 'node:stream';
import { fileURLToPath } from 'node:url';
import { expect, it, vi } from 'vitest';
import { openCommandTunnel, type TunnelCommand } from './command-tunnel.js';

it('preserves binary close-delimited responses and closes its listener on release', async () => {
  const bytes=Buffer.alloc(256*1024);for(let i=0;i<bytes.length;i++)bytes[i]=i%256;
  const upstream=createServer(socket=>socket.once('data',()=>socket.end(Buffer.concat([Buffer.from('HTTP/1.0 200 OK\r\nContent-Type: application/octet-stream\r\n\r\n'),bytes]))));
  upstream.listen(0,'127.0.0.1');await once(upstream,'listening');
  const address=upstream.address();if(!address||typeof address==='string')throw new Error('missing_port');
  const children:ReturnType<typeof spawn>[]=[];
  const target=await openCommandTunnel(async()=>{
    const child=spawn('python3',[fileURLToPath(new URL('./stdio-tcp-relay.py',import.meta.url)),String(address.port)],{stdio:'pipe'});
    children.push(child);await once(child,'spawn');return child as unknown as TunnelCommand;
  });
  try {
    const response=await fetch(target.url,{signal:AbortSignal.timeout(5000)});
    expect(Buffer.from(await response.arrayBuffer())).toEqual(bytes);
    target.release!();target.release!();
    await expect(fetch(target.url)).rejects.toThrow();
  }finally{
    target.release!();for(const child of children)child.kill();
    await new Promise<void>(resolve=>upstream.close(()=>resolve()));
  }
});

it('closes a late remote command when its local request was already released', async () => {
  let ready!: (command: TunnelCommand) => void;
  const start=vi.fn(()=>new Promise<TunnelCommand>(resolve=>{ready=resolve;}));
  const target=await openCommandTunnel(start);
  const socket=connect(Number(new URL(target.url).port),'127.0.0.1');
  socket.on('error',()=>{});
  const closed=once(socket,'close');
  const command=Object.assign(new EventEmitter(),{stdin:new PassThrough(),stdout:new PassThrough(),stderr:new PassThrough(),kill:vi.fn(),close:vi.fn()});
  try{
    await vi.waitFor(()=>expect(start).toHaveBeenCalledTimes(1));
    target.release!();await closed;
    ready(command);
    await vi.waitFor(()=>expect(command.close).toHaveBeenCalledTimes(1));
    expect(command.kill).toHaveBeenCalledWith('SIGTERM');
    target.release!();expect(command.close).toHaveBeenCalledTimes(1);
  }finally{target.release!();socket.destroy();}
});
