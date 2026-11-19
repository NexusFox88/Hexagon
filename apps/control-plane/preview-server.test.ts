import { connect } from 'node:net';
import { once } from 'node:events';
import { expect, it, vi } from 'vitest';
import { createServer, request } from 'node:http';
import { createPreviewServer } from './preview-server.js';
import type { Previews } from '../../modules/sandboxes/previews.js';

it('shuts down with an idle browser preconnection that never sends HTTP headers', async () => {
  const app = createPreviewServer({} as Previews);
  const base = await app.listen({ host: '127.0.0.1', port: 0 });
  const accepted = once(app.server, 'connection');
  const socket = connect(Number(new URL(base).port), '127.0.0.1');
  try {
    await accepted;
    const closed = once(socket, 'close');
    await app.close();
    await closed;
    expect(socket.destroyed).toBe(true);
  } finally { socket.destroy(); await app.close(); }
}, 3000);

it('releases a preview tunnel after full delivery or browser disconnect, once per request', async () => {
  const upstream=createServer((req,res)=>{
    if(req.url==='/redirect'){res.writeHead(302,{location:'https://outside.invalid/'});res.end();return;}
    res.writeHead(200,{'Content-Type':'text/plain'});
    if(req.url==='/stream')res.write('first');
    else res.end('complete');
  });
  upstream.listen(0,'127.0.0.1');await once(upstream,'listening');
  const address=upstream.address();if(!address||typeof address==='string')throw new Error('missing_address');
  const release=vi.fn();
  const app=createPreviewServer({authorize:async()=>({}),target:async()=>({url:`http://127.0.0.1:${address.port}`,headers:{},release})} as unknown as Previews);
  const base=await app.listen({host:'127.0.0.1',port:0});
  try {
    expect(await (await fetch(base+'/done')).text()).toBe('complete');
    await vi.waitFor(()=>expect(release).toHaveBeenCalledTimes(1));
    expect((await fetch(base+'/redirect')).status).toBe(502);
    await vi.waitFor(()=>expect(release).toHaveBeenCalledTimes(2));
    await new Promise<void>((resolve,reject)=>{
      const req=request(base+'/stream',res=>{res.once('data',()=>{req.destroy();resolve();});});
      req.on('error',reject);req.end();
    });
    await vi.waitFor(()=>expect(release).toHaveBeenCalledTimes(3));
  }finally{await app.close();upstream.closeAllConnections();await new Promise<void>(resolve=>upstream.close(()=>resolve()));}
});
