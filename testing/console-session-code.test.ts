import {createServer} from 'node:http';
import {mkdtemp,mkdir,writeFile,readFile,rm} from 'node:fs/promises';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {spawn} from 'node:child_process';
import {it,expect} from 'vitest';
// @ts-expect-error Browser-neutral generator.
import {sessionCode} from '../apps/console/session-code.js';
for(const first of ['python','typescript'])it(`${first} generated persistent program recovers lost submission and shares journal with the other SDK`,async()=>{
 const calls:string[]=[],keys:string[]=[];let lose=true,runState='completed',closeState='closed';
 const server=createServer(async(req,res)=>{
  let raw='';for await(const chunk of req)raw+=chunk;calls.push(req.url!);res.setHeader('content-type','application/json');
  if(req.url==='/v1/sessions/preflight')res.end('{"ready":true}');
  else if(req.url==='/v1/sessions'){expect(JSON.parse(raw)).toEqual({harness:{id:'pi',version:'1.5.2'},sandbox_connection_id:'sandbox',model_connection_id:'model',tools:{search:'tool'},env:{MODE:'test'}});res.end('{"id":"session-1"}');}
  else if(req.url==='/v1/sessions/session-1/runs'){
   keys.push(String(req.headers['idempotency-key']));expect(JSON.parse(raw).input).toBe('literal "input" \u4e2d\u6587');
   if(lose){lose=false;res.destroy();return;}res.end('{"id":"run-1","state":"queued"}');
  }else if(req.url==='/v1/runs/run-1')res.end(JSON.stringify({id:'run-1',state:runState,output:{text:'answer'}}));
  else if(req.url?.startsWith('/v1/runs/run-1/stream')){res.setHeader('content-type','text/event-stream');res.end('id: 7\nevent: run.completed\ndata: {}\n\nevent: stream.end\ndata: {}\n\n');}
  else if(req.url==='/v1/sessions/session-1/close')res.end(JSON.stringify({state:closeState}));
  else if(req.url==='/v1/runs/run-1/cancel'){runState='cancelled';res.end('{}');}
  else {res.writeHead(404);res.end('{}');}
 });await new Promise<void>(r=>server.listen(0,'127.0.0.1',r));const base=`http://127.0.0.1:${(server.address() as {port:number}).port}`;
 const directory=await mkdtemp(resolve('.local/persistent-example-test-'));
 try{
  const sdk=resolve(directory,'node_modules/@hexagon/agent-sdk');await mkdir(sdk,{recursive:true});await writeFile(resolve(sdk,'package.json'),JSON.stringify({type:'module',exports:'./index.js'}));await writeFile(resolve(sdk,'index.js'),`export {Hexagon} from ${JSON.stringify(pathToFileURL(resolve('sdk/typescript/index.ts')).href)};`);
  for(const language of ['python','typescript'])await writeFile(resolve(directory,language==='python'?'run.py':'run.mts'),sessionCode({language,base,agentId:'agent-1',sessionDefinition:{harness:{id:'pi',version:'1.5.2'},sandbox_connection_id:'sandbox',model_connection_id:'model',tools:{search:'tool'},env:{MODE:'test'}},bindings:{sandbox_connection_id:'sandbox',model_connection_id:'model'},prompt:'literal "input" \u4e2d\u6587'}));
  async function run(language:string,args:string[]=[]){return new Promise<{code:number|null;output:string}>((done,reject)=>{const file=resolve(directory,language==='python'?'run.py':'run.mts');const child=spawn(language==='python'?'python3':process.execPath,language==='python'?[file,...args]:['--import','tsx',file,...args],{cwd:directory,env:{...process.env,HEXAGON_API_TOKEN:'fixture',PYTHONPATH:resolve('sdk/python')}});let output='';child.stdout.on('data',d=>output+=d);child.stderr.on('data',d=>output+=d);child.on('error',reject);child.on('close',code=>done({code,output}));});}
  expect((await run(first)).code).toBe(1);
  const journal=JSON.parse(await readFile(resolve(directory,'hexagon-session.json'),'utf8'));expect(journal).toMatchObject({session_id:'session-1',input:'literal "input" \u4e2d\u6587'});expect(journal.run_id).toBeUndefined();
  const second=first==='python'?'typescript':'python';const resumed=await run(second,['--resume','--stream']);expect(resumed.code,resumed.output).toBe(0);expect(resumed.output).toContain('answer');
  expect(keys).toHaveLength(2);expect(keys[0]).toBe(keys[1]);expect(calls.filter(p=>p==='/v1/sessions')).toHaveLength(1);expect(calls.some(p=>p.endsWith('/close'))).toBe(false);
  expect(JSON.parse(await readFile(resolve(directory,'hexagon-session.json'),'utf8')).cursor).toBe('7');
  expect((await run(first,['--resume'])).code).toBe(0);expect(keys).toHaveLength(2);
  const saved=JSON.parse(await readFile(resolve(directory,'hexagon-session.json'),'utf8'));
  await writeFile(resolve(directory,'hexagon-session.json'),JSON.stringify({...saved,agent_id:'another-agent'}));
  const mismatch=await run(second,['--new-turn']);expect(mismatch.code).toBe(1);expect(mismatch.output).toContain('journal_agent_mismatch');expect(keys).toHaveLength(2);
  await writeFile(resolve(directory,'hexagon-session.json'),JSON.stringify(saved));
  runState='failed';expect((await run(first,['--resume'])).code).toBe(1);
  runState='waiting_approval';const blocked=await run(second,['--new-turn']);expect(blocked.code).toBe(1);expect(blocked.output).toContain('active_run_use_resume');
  closeState='closing';const uncertain=await run(first,['--close']);expect(uncertain.code).toBe(1);expect(uncertain.output).toContain('cleanup_pending_resume_close');expect(runState).toBe('cancelled');
  expect(JSON.parse(await readFile(resolve(directory,'hexagon-session.json'),'utf8')).closed).not.toBe(true);
  closeState='closed';
  expect((await run(second,['--close'])).code).toBe(0);expect(JSON.parse(await readFile(resolve(directory,'hexagon-session.json'),'utf8')).closed).toBe(true);
 }finally{server.closeAllConnections();await new Promise<void>(r=>server.close(()=>r()));await rm(directory,{recursive:true,force:true});}
});
