/** Actual OCI binaries against a deterministic Anthropic fixture, NOT cloud/model acceptance. */
import {createServer} from 'node:http';
import {spawn} from 'node:child_process';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {randomUUID} from 'node:crypto';
import {ociAdapter} from '../modules/harnesses/runtime-adapter.js';
import type {ImageDefinition} from '../modules/harnesses/images.js';
import {harnessTemplates} from '../modules/harnesses/templates.js';
const modelProvider=process.argv[3]==='responses'?'openai-responses':process.argv[3]==='openai'?'openai-compatible':'anthropic-compatible';
let requests=0;
const server=createServer(async(req,res)=>{
 let body='';for await(const data of req)body+=data;const value=JSON.parse(body||'{}');
 console.log({path:req.url,tools:value.tools?.map((t:any)=>t.name??t.function?.name)});
 if(req.url?.endsWith('/count_tokens')){res.setHeader('content-type','application/json');res.end(JSON.stringify({input_tokens:10}));return;}
 if(req.url?.endsWith('/responses')){
  requests++;await writeFile('.local/oci-harness/responses-fixture-request.json',JSON.stringify(value,null,2));res.setHeader('content-type','text/event-stream');
  const namespace=value.tools?.find((t:any)=>t.type==='namespace'&&t.tools?.some((f:any)=>f.name==='fixture_echo'));
  const tool=namespace?.tools.find((t:any)=>t.name==='fixture_echo')??value.tools?.find((t:any)=>t.type==='function'&&t.name.endsWith('fixture_echo'));
  if(tool&&!body.includes('MCP_FIXTURE_OK')){
   const item={type:'function_call',id:'fc_fixture',call_id:'call_fixture',name:tool.name,...(namespace?{namespace:namespace.name}:{}),arguments:'{}',status:'completed'};
   const response={id:'resp_tool',object:'response',created_at:1,status:'completed',model:value.model,output:[item],usage:{input_tokens:10,output_tokens:5,total_tokens:15}};
   [{type:'response.created',response:{...response,status:'in_progress',output:[]}},{type:'response.output_item.added',output_index:0,item:{...item,status:'in_progress',arguments:''}},{type:'response.function_call_arguments.delta',item_id:item.id,output_index:0,delta:'{}'},{type:'response.function_call_arguments.done',item_id:item.id,output_index:0,arguments:'{}'},{type:'response.output_item.done',output_index:0,item},{type:'response.completed',response}].forEach((event,sequence_number)=>res.write(`event: ${event.type}\ndata: ${JSON.stringify({...event,sequence_number})}\n\n`));res.end();return;
  }
  const item={id:'msg_fixture',type:'message',role:'assistant',status:'completed',content:[{type:'output_text',text:'OCI_FIXTURE_OK',annotations:[]}]};
  const response={id:'resp_fixture',object:'response',created_at:1,status:'completed',model:value.model,output:[item],usage:{input_tokens:10,output_tokens:5,total_tokens:15,input_tokens_details:{cached_tokens:0},output_tokens_details:{reasoning_tokens:0}}};
  const events=[{type:'response.created',response:{...response,status:'in_progress',output:[]}},{type:'response.output_item.added',output_index:0,item:{...item,status:'in_progress',content:[]}},{type:'response.content_part.added',item_id:item.id,output_index:0,content_index:0,part:{type:'output_text',text:'',annotations:[]}},{type:'response.output_text.delta',item_id:item.id,output_index:0,content_index:0,delta:'OCI_FIXTURE_OK'},{type:'response.output_text.done',item_id:item.id,output_index:0,content_index:0,text:'OCI_FIXTURE_OK'},{type:'response.content_part.done',item_id:item.id,output_index:0,content_index:0,part:item.content[0]},{type:'response.output_item.done',output_index:0,item},{type:'response.completed',response}];
  events.forEach((event,sequence_number)=>res.write(`event: ${event.type}\ndata: ${JSON.stringify({...event,sequence_number})}\n\n`));res.end();return;
 }
 if(req.url?.endsWith('/chat/completions')){
  requests++;if(value.tools)await writeFile('.local/oci-harness/chat-fixture-request.json',JSON.stringify(value,null,2));
  const direct=value.tools?.find((t:any)=>t.function?.name?.includes('fixture_echo'));
  const tool=direct??(body.includes('Call fixture_echo')?value.tools?.find((t:any)=>['dispatch_action','tool_call'].includes(t.function?.name)):undefined);
  const args=direct?'{}':JSON.stringify(tool?.function?.name==='tool_call'?{calls:[{name:'mcp__hexagon__fixture_echo',arguments:{}}]}:{id:'hexagon__fixture_echo',args:{}});
  const useTool=tool&&!body.includes('MCP_FIXTURE_OK');
  const message=useTool?{role:'assistant',content:null,tool_calls:[{id:'call_fixture',type:'function',function:{name:tool.function.name,arguments:args}}]}:{role:'assistant',content:'OCI_FIXTURE_OK'};
  const finish=useTool?'tool_calls':'stop';
  if(!value.stream){res.setHeader('content-type','application/json');res.end(JSON.stringify({id:'chatcmpl-fixture',object:'chat.completion',created:1,model:value.model,choices:[{index:0,message,finish_reason:finish}],usage:{prompt_tokens:10,completion_tokens:5,total_tokens:15}}));return;}
  res.setHeader('content-type','text/event-stream');
  const delta=useTool?{...message,tool_calls:message.tool_calls!.map((t:any,index:number)=>({...t,index}))}:message;
  res.write('data: '+JSON.stringify({id:'chatcmpl-fixture',object:'chat.completion.chunk',created:1,model:value.model,choices:[{index:0,delta,finish_reason:null}]})+'\n\n');
  res.write('data: '+JSON.stringify({id:'chatcmpl-fixture',object:'chat.completion.chunk',created:1,model:value.model,choices:[{index:0,delta:{},finish_reason:finish}],usage:{prompt_tokens:10,completion_tokens:5,total_tokens:15}})+'\n\ndata: [DONE]\n\n');res.end();return;
 }
 if(!req.url?.includes('/messages')){res.writeHead(404);res.end('{}');return;}
 requests++;
 const fixtureTool=value.tools?.find((tool:any)=>tool.name?.endsWith('fixture_echo'));
 const useTool=fixtureTool&&!body.includes('MCP_FIXTURE_OK');
 const block=useTool?{type:'tool_use',id:'call_fixture',name:fixtureTool.name,input:{}}:{type:'text',text:'OCI_FIXTURE_OK'};
 const message={id:'msg_fixture_'+requests,type:'message',role:'assistant',model:value.model,content:[block],stop_reason:useTool?'tool_use':'end_turn',stop_sequence:null,usage:{input_tokens:10,output_tokens:5}};
 if(!value.stream){res.setHeader('content-type','application/json');res.end(JSON.stringify(message));return;}
 res.setHeader('content-type','text/event-stream');
 for(const event of [{type:'message_start',message:{...message,content:[],stop_reason:null}},{type:'content_block_start',index:0,content_block:useTool?{...block,input:{}}:{type:'text',text:''}},{type:'content_block_delta',index:0,delta:useTool?{type:'input_json_delta',partial_json:'{}'}:{type:'text_delta',text:'OCI_FIXTURE_OK'}},{type:'content_block_stop',index:0},{type:'message_delta',delta:{stop_reason:message.stop_reason,stop_sequence:null},usage:{output_tokens:5}},{type:'message_stop'}])res.write(`event: ${event.type}\ndata: ${JSON.stringify(event)}\n\n`);res.end();
});
await new Promise<void>(resolve=>server.listen(0,'0.0.0.0',resolve));const port=(server.address() as any).port;
async function command(args:string[],input?:string,timeout=90000){return new Promise<{stdout:string;stderr:string;code:number|null}>((resolve,reject)=>{const p=spawn('docker',args,{stdio:['pipe','pipe','pipe']});let stdout='',stderr='';p.stdout.on('data',b=>stdout+=b);p.stderr.on('data',b=>stderr+=b);const timer=setTimeout(()=>p.kill('SIGKILL'),timeout);p.on('error',reject);p.on('close',code=>{clearTimeout(timer);resolve({stdout,stderr,code});});p.stdin.end(input);});}
await mkdir('.local/oci-harness',{recursive:true});const report:any[]=[];
try{for(const t of harnessTemplates.filter(t=>!process.argv[2]||t.id===process.argv[2])){
 const tag=`hexagon-local/${t.id}:${t.version}`,name='hexagon-oci-fixture-'+randomUUID();const row:any={template:t.id,distribution:tag,mode:'real-binary-fixture-model'};report.push(row);
 try{
  const inspected=await command(['image','inspect',tag]);if(inspected.code)throw new Error('image_missing');const config=JSON.parse(inspected.stdout)[0].Config;
  const def:ImageDefinition={id:`custom.${t.id}`,name:t.name,version:t.version,protocol:t.protocol as any,source:'oci',registration_digest:'fixture',capabilities:t.capabilities,model_providers:['anthropic-compatible'],image:{reference:tag,digest:'local',platform:'linux/amd64',user:config.User||'root'},command:[...(config.Entrypoint??[]),...(config.Cmd??[])]};
  const created=await command(['run','--detach','--name',name,'--platform','linux/amd64','--entrypoint','sleep',tag,'infinity']);if(created.code)throw new Error('container_create_failed');
  const connector={execute:async(_id:string,cmd:string)=>{const r=await command(['exec',name,'sh','-c',cmd]);return {stdout:r.stdout,stderr:r.stderr,exit_code:r.code};},write:async(_id:string,path:string,bytes:Uint8Array)=>{const r=await command(['exec','-i',name,'sh','-c',`cat > '${path}'`],Buffer.from(bytes).toString());if(r.code)throw new Error('write_failed');}};
  await connector.execute(name,'mkdir -p /tmp/hexagon-runtime /tmp/hexagon-fixture');
  const adapter=ociAdapter(def);await adapter.install(connector as any,name);
  const invocation=adapter.invocation(randomUUID(),'Reply OCI_FIXTURE_OK',{provider:modelProvider,base_url:`http://host.docker.internal:${port}/v1`,model:'claude-sonnet-4-5',credential:'fixture-scoped-grant'});
  const result=await command(['exec','-i','--workdir','/tmp/hexagon-fixture',...Object.entries(invocation.env??{}).flatMap(([k,v])=>['--env',`${k}=${v}`]),name,...invocation.command],invocation.stdin);
  row.exit_code=result.code;row.result=adapter.result(result.stdout);await writeFile(`.local/oci-harness/${t.id}-${modelProvider}-fixture.log`,result.stdout+'\n'+result.stderr,{mode:0o600});
  if(result.code!==0||row.result.failed||!row.result.text.includes('OCI_FIXTURE_OK'))throw new Error('fixture_execution_failed');if(['deepseek','codex','hermes','openclaw'].includes(t.id)||modelProvider==='openai-responses'){
   const python=t.id==='pi'?{exit_code:0}:await connector.execute(name,'command -v python3 || (command -v apk >/dev/null && apk add --no-cache python3 || (apt-get update -qq && apt-get install -y -qq python3))');if(python.exit_code)throw new Error('fixture_python_prerequisite_failed');
   await connector.write(name,'/tmp/hexagon-runtime/tool_bridge.py',await readFile('runtime/tool_bridge.py'));
   const mailbox=`from http.server import BaseHTTPRequestHandler, HTTPServer
from pathlib import Path
class H(BaseHTTPRequestHandler):
 def do_POST(self):
  assert self.headers.get('Authorization')=='Bearer fixture-tool-grant'
  self.rfile.read(int(self.headers['Content-Length']))
  Path('/tmp/hexagon-fixture/tool-called').write_text('called')
  self.send_response(200);self.end_headers();self.wfile.write(b'{"state":"completed","result":{"content":[{"type":"text","text":"MCP_FIXTURE_OK"}]}}')
 def log_message(self,*args):pass
HTTPServer(('127.0.0.1',8765),H).serve_forever()
`;
   await connector.write(name,'/tmp/hexagon-runtime/fixture-mailbox.py',Buffer.from(mailbox));
   await connector.write(name,'/tmp/hexagon-runtime/fixture-mailbox.cjs',Buffer.from(`const http=require('http'),fs=require('fs');http.createServer((req,res)=>{if(req.headers.authorization!=='Bearer fixture-tool-grant'){res.writeHead(403);return res.end();}req.resume();req.on('end',()=>{fs.writeFileSync('/tmp/hexagon-fixture/tool-called','called');res.end(JSON.stringify({state:'completed',result:{content:[{type:'text',text:'MCP_FIXTURE_OK'}]}}));});}).listen(8765,'127.0.0.1');`));
   const started=await command(['exec','--detach',name,...(t.id==='pi'?['node','/tmp/hexagon-runtime/fixture-mailbox.cjs']:['python3','/tmp/hexagon-runtime/fixture-mailbox.py'])]);if(started.code)throw new Error('fixture_mailbox_failed');
   const follow=adapter.invocation(randomUUID(),'Call fixture_echo, then reply OCI_FIXTURE_OK',{provider:modelProvider,base_url:`http://host.docker.internal:${port}/v1`,model:'claude-sonnet-4-5',credential:'fixture-scoped-grant'},row.result.native_session,{token:'fixture-tool-grant',definitions:[{name:'fixture_echo',binding:'fixture',operation:'echo',description:'Return a fixture result',inputSchema:{type:'object',properties:{}}}]});
   const next=await command(['exec','-i','--workdir','/tmp/hexagon-fixture',...Object.entries(follow.env??{}).flatMap(([k,v])=>['--env',`${k}=${v}`]),name,...follow.command],follow.stdin);
   row.continuation=adapter.result(next.stdout);await writeFile(`.local/oci-harness/${t.id}-${modelProvider}-continuation.log`,next.stdout+'\n'+next.stderr,{mode:0o600});
   const called=await command(['exec',name,'cat','/tmp/hexagon-fixture/tool-called']);
   if(next.code!==0||row.continuation.failed||row.continuation.native_session!==row.result.native_session||called.stdout!=='called')throw new Error('continuation_or_mcp_failed');
   row.mcp_bridge_verified=true;
  }row.passed=true;
 }catch(e:any){row.error=e.message;process.exitCode=1;}finally{row.cleanup=(await command(['rm','--force',name])).code===0;await writeFile(`.local/oci-harness/fixture-results-${process.argv[2]??'all'}-${modelProvider}.json`,JSON.stringify(report,null,2));console.log(row);}
}}finally{await new Promise<void>(resolve=>server.close(()=>resolve()));}
