import {it,expect} from 'vitest';
import {mkdtemp,writeFile,rm,chmod} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {spawn} from 'node:child_process';
import {createServer} from 'node:http';
const {Hexagon}=await import(process.env.HEXAGON_TEST_TS_MODULE||'../sdk/typescript/index.js') as typeof import('../sdk/typescript/index.js');
it('both SDKs discover private local credentials without a token argument and reject remote discovery',async()=>{
 const directory=await mkdtemp(join(tmpdir(),'hexagon-local-sdk-'));let requests=0;
 const server=createServer((req,res)=>{requests++;expect(req.headers.authorization).toBe('Bearer local-test-identity');res.setHeader('content-type','application/json');res.end('{"sessions":[]}');});await new Promise<void>(r=>server.listen(0,'127.0.0.1',r));
 const base=`http://127.0.0.1:${(server.address() as any).port}`,descriptor={version:1,base_url:base,data_directory:directory};
 try{
  await writeFile(join(directory,'owner.json'),JSON.stringify({tenant:'local-workspace',token:'local-test-identity'}),{mode:0o600});
  await writeFile(join(directory,'connection.json'),JSON.stringify(descriptor),{mode:0o600});
  const client=await Hexagon.local({dataDirectory:directory});expect((await client.listSessions()).sessions).toEqual([]);
  const python=await new Promise<{code:number|null;output:string}>((done,reject)=>{const child=spawn('python3',['-c','from hexagon import Hexagon; assert Hexagon.local().list_sessions()["sessions"] == []; print("local_python_ok")'],{cwd:directory,env:{...process.env,HEXAGON_DATA_DIR:directory,HEXAGON_API_TOKEN:'',PYTHONPATH:process.env.HEXAGON_TEST_PYTHON_PATH||resolve('sdk/python')}});let output='';child.stdout.on('data',d=>output+=d);child.stderr.on('data',d=>output+=d);child.on('error',reject);child.on('close',code=>done({code,output}));});expect(python.code,python.output).toBe(0);expect(requests).toBe(2);
  await expect(Hexagon.local({dataDirectory:directory,baseUrl:base.replace('127.0.0.1','localhost')})).resolves.toBeInstanceOf(Hexagon);
  await expect(Hexagon.local({dataDirectory:directory,baseUrl:'http://127.0.0.1:1'})).rejects.toThrow('local_workspace_endpoint_mismatch');
  await writeFile(join(directory,'connection.json'),JSON.stringify({...descriptor,base_url:'https://attacker.example'}));await expect(Hexagon.local({dataDirectory:directory})).rejects.toThrow('local_endpoint_required');expect(requests).toBe(2);
  await writeFile(join(directory,'connection.json'),JSON.stringify(descriptor));await chmod(join(directory,'owner.json'),0o644);await expect(Hexagon.local({dataDirectory:directory})).rejects.toThrow('local_identity_permissions');
 }finally{server.closeAllConnections();await new Promise<void>(r=>server.close(()=>r()));await rm(directory,{recursive:true,force:true});}
});
