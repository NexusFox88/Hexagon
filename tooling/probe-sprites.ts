import { SpritesClient, type ProxySession } from '@fly/sprites';
import { openSpritesTunnel } from '../integrations/sandboxes/sprites-transport.js';
import { localTestCredential } from './local-test-credentials.js';
import { randomUUID } from 'node:crypto';
import { writeFile } from 'node:fs/promises';
const api = new SpritesClient(await localTestCredential('fly_sprites_token','sandbox'), {timeout:30000});
const name = `hexagon-${randomUUID()}`;
const file = `.local/evidence/sprites-${name}.json`, evidence: Record<string,unknown> = {name,state:'intent',started_at:new Date().toISOString()};
const save = () => writeFile(file,JSON.stringify(evidence,null,2),{mode:0o600}); await save();
// Diagnostic only: observe handshake phases, never headers, tokens or payloads.
const NativeWebSocket=globalThis.WebSocket;
const sockets=new Set<WebSocket>();
const trace:unknown[]=[];evidence.proxy_transport=trace;
globalThis.WebSocket=class extends NativeWebSocket {
 constructor(url:string|URL,protocols?:string|string[]){
  super(url,protocols);
  if(String(url).endsWith('/proxy')){
   sockets.add(this);trace.push({phase:'construct'});
   this.addEventListener('open',()=>trace.push({phase:'open'}));
   this.addEventListener('message',event=>trace.push({phase:'message',kind:typeof event.data,bytes:typeof event.data==='string'?event.data.length:event.data?.byteLength}));
   this.addEventListener('error',()=>trace.push({phase:'error'}));
   this.addEventListener('close',event=>trace.push({phase:'close',code:event.code}));
  }
 }
};
let proxy: ProxySession | undefined;
let release: (()=>void) | undefined;
try {
 const sprite = await api.createSprite(name,{config:{ramMB:2048,cpus:2},urlSettings:{auth:'sprite'},labels:['hexagon-probe']});
 evidence.created = true; await save();
 evidence.command = await sprite.execFile('bash',['-lc','python3 --version && node --version'],{timeout:60000});
 evidence.url_private = sprite.urlSettings?.auth === 'sprite';
 if (!evidence.url_private) throw new Error('sprite_url_not_private');
 const filesystem = sprite.filesystem('/tmp');
 const bytes = Buffer.alloc(256*1024); for(let i=0;i<bytes.length;i++)bytes[i]=i%256;
 await filesystem.writeFile('hexagon-probe.bin',bytes,{mode:0o600});
 if(!bytes.equals(await filesystem.readFile('hexagon-probe.bin',null)))throw new Error('file_roundtrip_failed');
 evidence.binary_file_roundtrip=true;
 await filesystem.writeFile('hexagon-probe.py',`from http.server import BaseHTTPRequestHandler,ThreadingHTTPServer
class Handler(BaseHTTPRequestHandler):
 def do_GET(self):
  ok=self.headers.get('Authorization')=='Bearer runtime-probe'
  body=b'private-port-ok' if ok else b'denied'
  self.send_response(200 if ok else 401)
  if self.path != '/eof': self.send_header('Content-Length',str(len(body)))
  self.end_headers();self.wfile.write(body)
ThreadingHTTPServer(('0.0.0.0',8765),Handler).serve_forever()
`,{mode:0o600});
 evidence.stage='service_create';await save();
 const startup = await sprite.createService('hexagon-probe',{cmd:'python3',args:['/tmp/hexagon-probe.py']},'2s');
 try { await startup.processAll(()=>{}); } finally { startup.close(); }
 evidence.stage='service_started';await save();
 const internal=await sprite.execFile('python3',['-c',"import urllib.request; r=urllib.request.urlopen(urllib.request.Request('http://127.0.0.1:8765',headers={'Authorization':'Bearer runtime-probe'}),timeout=5); print(r.status); print(r.read().decode())"],{timeout:15000});
 evidence.internal_http={exit_code:internal.exitCode,verified:String(internal.stdout).includes('private-port-ok')};
 let url:string;
 if(process.env.HEXAGON_SPRITES_TRANSPORT==='command'){
  const target=await openSpritesTunnel(sprite,8765);
  url=target.url;release=target.release;evidence.transport='command';
 }else{
  proxy=await sprite.proxyPort(0,8765,'127.0.0.1');
  proxy.on('error',()=>{evidence.proxy_error=true;});
  const address=proxy.localAddr();if(!address)throw new Error('proxy_address_missing');
  url=`http://${address}`;evidence.transport='provider_proxy';
 }
 evidence.stage='private_proxy_fetch';await save();
 const response=await fetch(url,{headers:{Authorization:'Bearer runtime-probe'},signal:AbortSignal.timeout(15000)});
 if(response.status!==200 || await response.text()!=='private-port-ok')throw new Error('private_proxy_failed');
 const denied=await fetch(url,{signal:AbortSignal.timeout(15000)});await denied.body?.cancel();
 if(denied.status!==401)throw new Error('runtime_auth_not_preserved');
 if(evidence.transport==='command'){
  const eof=await fetch(url+'/eof',{headers:{Authorization:'Bearer runtime-probe'},signal:AbortSignal.timeout(15000)});
  if(eof.status!==200 || await eof.text()!=='private-port-ok')throw new Error('eof_response_failed');
  evidence.close_delimited_response=true;
 }
 evidence.private_proxy={verified:true,runtime_auth_preserved:true};evidence.state='verified';
} catch(error) { evidence.state='failed'; evidence.error = error instanceof Error ? error.name : 'unknown'; }
finally { release?.();proxy?.close(); for(const socket of sockets)socket.close();globalThis.WebSocket=NativeWebSocket; try { await api.deleteSprite(name); const rows = await api.listSprites({prefix:name}); evidence.cleanup=rows.sprites.some(s=>s.name===name)?'unconfirmed':'confirmed'; } catch { evidence.cleanup='requires_reconciliation'; } await save(); console.log(JSON.stringify({file,state:evidence.state,cleanup:evidence.cleanup})); if(evidence.state!=='verified'||evidence.cleanup!=='confirmed')process.exitCode=1; }
