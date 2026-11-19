import {createServer} from 'node:http';
import {mkdtemp, mkdir, writeFile, rm} from 'node:fs/promises';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {spawn} from 'node:child_process';
import {expect, it} from 'vitest';
// @ts-expect-error Browser-neutral source generator.
import {quickstartCode} from '../apps/console/quickstart-code.js';

for (const language of ['python','typescript']) {
  for (const outcome of ['completed','failed','cleanup_unknown','preflight_failed','waiting_approval','poll_failed']) {
    it(`${language} generated program: ${outcome}, literal input and lifecycle`, async()=>{
      const calls:Array<{path:string;body:any;key?:string}>=[];
      const prompt='Literal "quotes" \\ paths\n\u4e2d\u6587 ${process.exit(9)} `backticks`';
      const server=createServer(async(req,res)=>{
        let raw='';for await(const chunk of req)raw+=chunk;
        calls.push({path:req.url!,body:raw?JSON.parse(raw):null,key:req.headers['idempotency-key'] as string|undefined});
        res.setHeader('content-type','application/json');
        if(req.headers.authorization!=='Bearer test-only') {res.writeHead(401);res.end('{}');return;}
        const path=req.url!;
        if(path==='/v1/agents') res.end(JSON.stringify({id:'agent-1'}));
        else if(path==='/v1/sessions/preflight') {if(outcome==='preflight_failed')res.writeHead(409);res.end(JSON.stringify(outcome==='preflight_failed'?{error:{code:'incompatible_model'}}:{ready:true}));}
        else if(path==='/v1/sessions')res.end(JSON.stringify({id:'session-1'}));
        else if(path==='/v1/sessions/session-1/runs')res.end(JSON.stringify({id:'run-1',state:'queued'}));
        else if(path==='/v1/runs/run-1'&&outcome==='poll_failed'){res.writeHead(503);res.end(JSON.stringify({error:{code:'transport_failure'}}));}
        else if(path==='/v1/runs/run-1/cancel')res.end(JSON.stringify({id:'run-1',state:'cancelled'}));
        else if(path==='/v1/runs/run-1')res.end(JSON.stringify({id:'run-1',state:outcome==='waiting_approval'&&calls.filter(c=>c.path==='/v1/runs/run-1').length===1?'waiting_approval':outcome==='failed'?'failed':'completed',output:{text:'verified-answer'},error:{code:'test_failure'}}));
        else if(path==='/v1/sessions/session-1/close'){if(outcome==='cleanup_unknown')res.writeHead(503);res.end(JSON.stringify(outcome==='cleanup_unknown'?{error:{code:'sandbox_deletion_unconfirmed'}}:{state:'closed'}));}
        else {res.writeHead(404);res.end('{}');}
      });
      await new Promise<void>(r=>server.listen(0,'127.0.0.1',r));
      const address=server.address() as {port:number};
      const directory=await mkdtemp(resolve('.local/console-quickstart-test-'));
      try {
        const sdk=resolve(directory,'node_modules/@hexagon/agent-sdk');await mkdir(sdk,{recursive:true});
        await writeFile(resolve(sdk,'package.json'),JSON.stringify({type:'module',exports:'./index.js'}));
        await writeFile(resolve(sdk,'index.js'),`export {Hexagon} from ${JSON.stringify(pathToFileURL(resolve('sdk/typescript/index.ts')).href)};`);
        const code=quickstartCode({language,base:`http://127.0.0.1:${address.port}`,harness:{id:'pi',version:'1.5.2'},sandbox:'sandbox-id',model:'model-id',tools:['tool-id'],http:['http-id'],prompt,messages:{agentName:'test-agent',waiting:'WAIT',timeout:'TIMEOUT',cleanup:'CLEANUP'}});
        const file=resolve(directory,language==='python'?'run.py':'run.mts');await writeFile(file,code);
        const result=await new Promise<{code:number|null;output:string}>((done,reject)=>{
          const child=spawn(language==='python'?'python3':process.execPath,language==='python'?[file]:['--import','tsx',file],{cwd:directory,env:{...process.env,HEXAGON_API_URL:`http://127.0.0.1:${address.port}`,HEXAGON_API_TOKEN:'test-only',PYTHONPATH:resolve('sdk/python')}});
          let output='';child.stdout.on('data',d=>output+=d);child.stderr.on('data',d=>output+=d);child.on('error',reject);child.on('close',code=>done({code,output}));
        });
        expect(result.code).toBe(['completed','waiting_approval'].includes(outcome)?0:1);
        expect(calls[0]!.body.tools).toEqual([{name:'tool_1',required_at_start:true}]);
        expect(calls[1]!.body).toMatchObject({agent_id:'agent-1',sandbox_connection_id:'sandbox-id',model_connection_id:'model-id',tools:{tool_1:'tool-id'},connections:{api_1:'http-id'}});
        if(outcome==='preflight_failed') expect(calls).toHaveLength(2);
        else {
          const submit=calls.filter(c=>c.path.endsWith('/runs'));expect(submit).toHaveLength(1);expect(submit[0]!.body.input).toBe(prompt);expect(submit[0]!.key).toMatch(/^[0-9a-f-]{36}$/);
          expect(calls.filter(c=>c.path.endsWith('/close'))).toHaveLength(1);
          expect(result.output).toContain('Session: session-1');expect(result.output).toContain('Run: run-1');
          if(outcome==='waiting_approval')expect(result.output).toContain('WAIT');
          if(outcome==='poll_failed')expect(calls.slice(-2).map(c=>c.path)).toEqual(['/v1/runs/run-1/cancel','/v1/sessions/session-1/close']);
          if(!['failed','poll_failed'].includes(outcome))expect(result.output).toContain('verified-answer');
          if(outcome==='cleanup_unknown')expect(result.output).toContain('CLEANUP session-1');
        }
      } finally {server.closeAllConnections();await new Promise<void>(r=>server.close(()=>r()));await rm(directory,{recursive:true,force:true});}
    });
  }
}
