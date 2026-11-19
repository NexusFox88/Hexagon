import {Connections} from '../modules/connections/connections.js';
import {SecretStore,SecretCipher} from '../modules/credentials/secret-store.js';
import {randomBytes} from 'node:crypto';
import {it,expect} from 'vitest';
import {LocalAccess} from '../modules/credentials/local-access.js';
import {createServer} from '../apps/control-plane/server.js';
const pool={query:async()=>({rows:[],rowCount:0})};
it('bootstraps only a same-origin loopback Console and retains protected API access',async()=>{
 const localAccess=new LocalAccess('/private/workspace');
 const connections=new Connections(pool as any,new SecretStore(pool as any,new SecretCipher(randomBytes(32))),[]);
 const app=createServer(pool as any,{localAccess,connections} as any);
 try{
  const base=await app.listen({host:'127.0.0.1',port:0});
  expect((await fetch(base+'/v1/tokens')).status).toBe(401);
  for(const headers of [{},{origin:'https://attacker.example','x-hexagon-local':'1','sec-fetch-site':'cross-site'},{origin:base,'x-hexagon-local':'1','sec-fetch-site':'cross-site'}] as Record<string,string>[])expect((await fetch(base+'/local/connect',{method:'POST',headers})).status).toBe(403);
  const result=await fetch(base+'/local/connect',{method:'POST',headers:{origin:base,'x-hexagon-local':'1','sec-fetch-site':'same-origin'}});
  expect(result.headers.get('cache-control')).toBe('no-store');const grant=await result.json();expect(grant.mode).toBe('local');
  expect((await fetch(base+'/v1/tokens',{headers:{authorization:`Bearer ${grant.token}`}})).status).toBe(200);
  expect((await fetch(base+'/v1/tokens',{headers:{authorization:'Bearer invalid'}})).status).toBe(401);
  const fake=(host:string,remote:string)=>({headers:{host,origin:`http://${host}`,'x-hexagon-local':'1','sec-fetch-site':'same-origin'},raw:{socket:{remoteAddress:remote,localPort:8787}}}) as any;
  expect(localAccess.bootstrap(fake('evil.example:8787','127.0.0.1'))).toBeNull();
  expect(localAccess.bootstrap(fake('127.0.0.1:8787','192.0.2.2'))).toBeNull();
  expect(localAccess.bootstrap(fake('127.0.0.1:8788','127.0.0.1'))).toBeNull();
 }finally{await app.close();}
});
it('does not expose bootstrap when local access is absent, as in hosted mode',async()=>{
 const app=createServer(pool as any);try{expect((await app.inject({method:'POST',url:'/local/connect'})).statusCode).toBe(404);expect((await app.inject({url:'/v1/tokens'})).statusCode).toBe(401);}finally{await app.close();}
});
