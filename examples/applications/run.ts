/** GUI-created application connections → cloud Agent → real tools → SDK result. */
import {readFile,writeFile} from 'node:fs/promises';
import {createHash,randomUUID} from 'node:crypto';
import {Hexagon} from '../../sdk/typescript/index.js';
const config=JSON.parse(await readFile(process.argv[2]??'.local/applications/connections.json','utf8'));
const token=process.env.HEXAGON_API_TOKEN??JSON.parse(await readFile('.local/control-plane/owner.json','utf8')).token;
const api=new Hexagon(process.env.HEXAGON_API_URL??'http://127.0.0.1:8787',token);
const source=await readFile('examples/harnesses/python-agent/main.py','utf8'),version=createHash('sha256').update(source).digest('hex').slice(0,16);
await api.registerHarnessPackage({id:'custom.applications',version,protocol:'hexagon-json-v1',interpreter:'python3',entrypoint:'main.py',capabilities:['conversation','tools'],model_providers:['anthropic-compatible'],files:[{path:'main.py',content:source}]});
const agent=await api.createAgent({name:'Application connector acceptance',harness:{id:'custom.applications',version},tools:Object.keys(config.tools).map(name=>({name,required_at_start:true})),resources:{timeout_seconds:600}});
const session=await api.createSession({agent_id:agent.id,...config});
const journal=`.local/applications/typescript-${session.id}.json`;let run:any;
await writeFile(journal,JSON.stringify({session:session.id,state:'open'}),{mode:0o600});
try{
 run=await api.submit(session.id,'Use the exa and tavily search tools to find official Model Context Protocol documentation. Use deepl translate_text to translate "Bonjour, le monde." to EN-US. Actually call all three remote tools; do not use shell or create files. Report two documentation links and the translation in English.',randomUUID());
 console.log(JSON.stringify({session:session.id,run:run.id}));
 for await(const event of api.stream(run.id,'0',AbortSignal.timeout(600000)))if(event.type==='tool.completed')console.log('tool.completed');
 const result=await api.run(run.id),calls=await api.toolCalls(run.id);if(result.state!=='completed'||!result.output?.text)throw new Error('agent_result_missing:'+result.state);
 const rows=calls.calls;for(const name of Object.keys(config.tools))if(!rows.some((c:any)=>c.binding===name&&c.state==='completed'&&c.is_error !== true))throw new Error('tool_result_missing:'+name);
 await writeFile(journal,JSON.stringify({session:session.id,run:run.id,state:'passed',output:result.output.text,calls:rows.map((c:any)=>({binding:c.binding,operation:c.operation,state:c.state}))},null,2),{mode:0o600});console.log(result.output.text);
}finally{if(run&&!['completed','failed','cancelled'].includes((await api.run(run.id)).state)){await api.cancel(run.id);for(let i=0;i<30;i++){if(['completed','failed','cancelled'].includes((await api.run(run.id)).state))break;await new Promise(r=>setTimeout(r,1000));}}await api.close(session.id);const record=JSON.parse(await readFile(journal,'utf8'));await writeFile(journal,JSON.stringify({...record,closed:true},null,2),{mode:0o600});}
