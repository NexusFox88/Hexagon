import {it,expect} from 'vitest';
import {createServer} from 'node:http';
import {mkdtemp,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
it('refuses to stop queued Runs or an unverified process identity',async()=>{
 const data=await mkdtemp(join(tmpdir(),'hexagon-local-command-'));
 let state={process_id:2147483646,active_runs:true,execution:{busy:false}};
 const server=createServer((_request,response)=>{response.setHeader('content-type','application/json');response.end(JSON.stringify(state));});
 await new Promise<void>(resolve=>server.listen(0,'127.0.0.1',resolve));
 try{
  await writeFile(join(data,'owner.json'),JSON.stringify({token:'fixture'}));await writeFile(join(data,'service.pid'),'2147483647');
  const run=()=>promisify(execFile)(process.execPath,['--import','tsx','tooling/local.ts','stop'],{env:{...process.env,HEXAGON_DATA_DIR:data,PORT:String((server.address() as {port:number}).port)},timeout:10000});
  await expect(run()).rejects.toMatchObject({code:1,stderr:expect.stringContaining('Active Run')});
  state={...state,active_runs:false};
  await expect(run()).rejects.toMatchObject({code:1,stderr:expect.stringContaining('identity cannot be verified')});
 }finally{await new Promise<void>(resolve=>server.close(()=>resolve()));await rm(data,{recursive:true,force:true});}
});
