import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {randomUUID,createHash} from 'node:crypto';
import {Hexagon} from '../../sdk/typescript/index.js';
const config=JSON.parse(await readFile(process.argv[2]??'.local/manual-journey/connections.json','utf8'));
const token=process.env.HEXAGON_API_TOKEN??JSON.parse(await readFile('.local/control-plane/owner.json','utf8')).token;
const client=new Hexagon(process.env.HEXAGON_API_URL??'http://127.0.0.1:8787',token);
let session:any,run:any,journal='';
const interrupted=new AbortController();const interrupt=()=>interrupted.abort();
process.once('SIGINT',interrupt);process.once('SIGTERM',interrupt);
try{
 const health=await client.request('GET','/health');
 if(health.credential_access.state!=='reachable')throw new Error('Credential ingress is not reachable. Check Console and npm run local -- status.');
 const source=await readFile('examples/manual-journey/protected-prefix.py','utf8')+await readFile('examples/harnesses/python-agent/main.py','utf8');
 const version=createHash('sha256').update(source).digest('hex').slice(0,16);
 await client.registerHarnessPackage({id:'custom.manual-protected',version,protocol:'hexagon-json-v1',interpreter:'python3',entrypoint:'main.py',capabilities:['conversation'],model_providers:['anthropic-compatible'],files:[{path:'main.py',content:source}]});
 const agent=await client.createAgent({name:'Manual protected journey',harness:{id:'custom.manual-protected',version},variables:{APP_MODE:'manual-acceptance'},resources:{timeout_seconds:600}});
 const definition={agent_id:agent.id,sandbox_connection_id:config.sandbox_connection_id,model_connection_id:config.model_connection_id,connections:{catalog:config.http_connection_id},variables:{HTTP_PATH:config.http_path??'/v1/models'}};
 console.log('Preflight:',JSON.stringify(await client.preflightSession(definition)));
 session=await client.createSession(definition);
 await mkdir('.local/manual-journey',{recursive:true,mode:0o700});journal=`.local/manual-journey/typescript-${session.id}.json`;
 await writeFile(journal,JSON.stringify({session:session.id,state:'open'}),{mode:0o600});
 console.log(`Session: ${session.id}`);
 interrupted.signal.throwIfAborted();
 run=await client.submit(session.id,'Introduce yourself in one English sentence and state that you are running in a cloud Sandbox. Do not run shell tools.',randomUUID());
 console.log(`Run: ${run.id}`);
 let cursor='0',httpVerified=false;
 for(let attempt=0;attempt<3;attempt++){
  try{for await(const event of client.stream(run.id,cursor,AbortSignal.any([AbortSignal.timeout(600000),interrupted.signal]))){if(event.id)cursor=event.id;if(event.type.startsWith('run.'))console.log(event.type);if(event.type==='harness.stdout'&&JSON.stringify(event.data).includes('protected_http_ok'))httpVerified=true;}break;}
  catch(error){if(attempt===2)throw error;console.log('Reconnecting the same Run from its event cursor.');}
 }
 const result=await client.run(run.id);
 if(result.state!=='completed'||!result.output?.text||!httpVerified)throw new Error(`Journey failed: ${result.error?.code??result.state}; protected HTTP=${httpVerified}`);
 console.log('Protected HTTP and ordinary variables verified.\nAgent:',result.output.text);
 await writeFile(journal,JSON.stringify({session:session.id,run:run.id,state:'completed',http_verified:true,output:result.output.text}),{mode:0o600});
}finally{
 process.removeListener('SIGINT',interrupt);process.removeListener('SIGTERM',interrupt);
 if(session){try{await client.close(session.id);const stored=JSON.parse(await readFile(journal,'utf8'));await writeFile(journal,JSON.stringify({...stored,closed:true}),{mode:0o600});console.log(`Session closed: ${session.id}`);}catch{console.error(`Cleanup needs reconciliation. Close Session ${session.id} in Fleet; journal: ${journal}`);process.exitCode=1;}}
}
