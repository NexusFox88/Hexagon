import {createServer} from 'node:http';
import {mkdtemp,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {spawn} from 'node:child_process';
import {it,expect} from 'vitest';
// @ts-expect-error Browser-neutral generator.
import {httpCode} from '../apps/console/http-code.js';
it('executes HTTP examples with durable recovery, explicit continuation and cleanup',async()=>{
 let sessions=0,lose=true;const keys:string[]=[];let state='completed';let closes=0;
 const server=createServer(async(req,res)=>{let raw='';for await(const c of req)raw+=c;res.setHeader('content-type','application/json');
 if(req.url==='/v1/sessions/preflight')res.end('{}');
 else if(req.url==='/v1/sessions'){sessions++;res.end('{"id":"session"}');}
 else if(req.url==='/v1/sessions/session/runs'){keys.push(String(req.headers['idempotency-key']));expect(JSON.parse(raw).input).toBe("hello ' \u4e2d\u6587");if(lose){lose=false;res.destroy();}else res.end('{"id":"run"}');}
 else if(req.url==='/v1/runs/run')res.end(JSON.stringify({id:'run',state,output:{text:'answer'}}));
 else if(req.url==='/v1/sessions/session/close'){closes++;res.end('{"state":"closed"}');}
 else{res.writeHead(404);res.end('{}');}});
 await new Promise<void>(r=>server.listen(0,'127.0.0.1',r));const base=`http://127.0.0.1:${(server.address() as {port:number}).port}`;const directory=await mkdtemp(join(tmpdir(),'hexagon-http-'));
 const run=(args:string[]=[])=>new Promise<{code:number|null;output:string}>((resolve,reject)=>{const child=spawn('sh',['run.sh',...args],{cwd:directory,env:{...process.env,HEXAGON_API_TOKEN:'test-token',HEXAGON_API_URL:base}});let output='';child.stdout.on('data',d=>output+=d);child.stderr.on('data',d=>output+=d);child.on('error',reject);child.on('exit',code=>resolve({code,output}));});
 try{await writeFile(join(directory,'run.sh'),httpCode({base,agentId:'agent',bindings:{sandbox_connection_id:'sandbox',model_connection_id:'model'},prompt:"hello ' \u4e2d\u6587"}));
 expect((await run()).code).not.toBe(0);const resumed=await run(['--resume']);expect(resumed.code,resumed.output).toBe(0);expect(resumed.output).toContain('answer');expect(sessions).toBe(1);expect(keys[0]).toBe(keys[1]);
 expect((await run()).code).toBe(0);expect(keys.length).toBe(2);expect(closes).toBe(0);
 state='failed';expect((await run(['--new-turn'])).code).not.toBe(0);expect(keys[2]).not.toBe(keys[0]);
 expect((await run(['--close'])).code).toBe(0);expect(closes).toBe(1);expect((await run()).code).not.toBe(0);expect(sessions).toBe(1);
 }finally{server.closeAllConnections();await new Promise<void>(r=>server.close(()=>r()));await rm(directory,{recursive:true,force:true});}
});
