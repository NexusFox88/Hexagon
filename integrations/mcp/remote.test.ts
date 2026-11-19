import {afterEach,expect,it} from 'vitest';
import {createServer,type Server} from 'node:http';
import {withMcp,listMcpTools,remoteMcpConfig,toolKey,sameTool,publicDispatcher} from './remote.js';
let server:Server|undefined;afterEach(async()=>{await new Promise<void>(resolve=>server?server.close(()=>resolve()):resolve());});
it('uses the official client for authenticated initialize, paginated discovery and tool invocation',async()=>{
 const calls:any[]=[];server=createServer(async(req,res)=>{let raw='';for await(const b of req)raw+=b;const body=JSON.parse(raw||'{}');calls.push({method:body.method,auth:req.headers.authorization,args:body.params});res.setHeader('content-type','application/json');if(body.id===undefined){res.writeHead(202);res.end();return;}
 const result=body.method==='initialize'?{protocolVersion:'2025-03-26',capabilities:{tools:{}},serverInfo:{name:'fixture',version:'1'}}:body.method==='tools/list'?{tools:[{name:body.params?.cursor?'second.tool':'first-tool',description:'Fixture tool',inputSchema:{type:'object',properties:{text:{type:'string'}}}}],...(!body.params?.cursor?{nextCursor:'page2'}:{})}:{content:[{type:'text',text:body.params.arguments.text}]};res.end(JSON.stringify({jsonrpc:'2.0',id:body.id,result}));});
 await new Promise<void>(r=>server!.listen(0,'127.0.0.1',r));const port=(server.address() as any).port;
 const config=remoteMcpConfig.parse({endpoint:'https://mcp.fixture.test/mcp'});
 const fetchLocal:typeof fetch=(input,init)=>fetch(`http://127.0.0.1:${port}/mcp`,init);
 await withMcp(config,'secret-token',async client=>{const tools=await listMcpTools(client);expect(Object.keys(tools)).toHaveLength(2);expect(tools[toolKey('first-tool')]?.approval).toBe(true);const result=await client.callTool({name:'first-tool',arguments:{text:'real SDK round trip'}});expect(result.content).toEqual([{type:'text',text:'real SDK round trip'}]);},fetchLocal);
 expect(calls.every(c=>c.auth==='Bearer secret-token')).toBe(true);expect(calls.filter(c=>c.method==='tools/call')).toHaveLength(1);
});
it('rejects private destinations and detects schema changes regardless of key ordering',async()=>{
 for(const endpoint of ['https://127.0.0.1/mcp','https://169.254.169.254/mcp','https://[::1]/mcp','https://user:key@public.test/mcp'])expect(remoteMcpConfig.safeParse({endpoint}).success).toBe(false);
 const a={name:'tool',description:'read',input_schema:{type:'object',properties:{}},approval:true};expect(sameTool(a,{...a,input_schema:{properties:{},type:'object'}})).toBe(true);expect(sameTool(a,{...a,input_schema:{type:'object',required:['x']}})).toBe(false);
 const agent=publicDispatcher();try{await expect(agent.request({origin:'https://localhost',path:'/',method:'GET'})).rejects.toThrow('mcp_private_address_denied');}finally{await agent.destroy();}
});
it('fails closed on cursor cycles, unsupported schemas and changed capabilities',async()=>{
 const repeated={listTools:async()=>({tools:[],nextCursor:'same'})};await expect(listMcpTools(repeated as any)).rejects.toThrow('mcp_cursor_cycle');
 const unsupported={listTools:async()=>({tools:[{name:'bad',inputSchema:{type:'object',$ref:'https://untrusted.test/schema'}}]})};await expect(listMcpTools(unsupported as any)).rejects.toThrow();
 expect(remoteMcpConfig.safeParse({endpoint:'https://public.test/mcp',header_name:'Host'}).success).toBe(false);
 const result=await listMcpTools({listTools:async()=>({tools:[{name:'claimed_readonly',annotations:{readOnlyHint:true},inputSchema:{type:'object'}}]})} as any);expect(Object.values(result)[0]?.approval).toBe(true);
});
it('supports legacy SSE with the same origin-bound authenticated client',async()=>{
 let stream:import('node:http').ServerResponse|undefined;const seen:string[]=[];
 server=createServer(async(req,res)=>{
  expect(req.headers['x-api-key']).toBe('sse-key');seen.push(req.method!);
  if(req.method==='GET'){stream=res;res.writeHead(200,{'content-type':'text/event-stream'});res.write('event: endpoint\ndata: /messages?session=fixture\n\n');return;}
  let raw='';for await(const b of req)raw+=b;const body=JSON.parse(raw);res.writeHead(202);res.end();
  if(body.id!==undefined){const result=body.method==='initialize'?{protocolVersion:'2024-11-05',capabilities:{tools:{}},serverInfo:{name:'sse-fixture',version:'1'}}:{tools:[{name:'echo',inputSchema:{type:'object'}}]};stream!.write('event: message\ndata: '+JSON.stringify({jsonrpc:'2.0',id:body.id,result})+'\n\n');}
 });
 await new Promise<void>(r=>server!.listen(0,'127.0.0.1',r));const port=(server.address() as any).port;
 const local:typeof fetch=(input,init)=>fetch(`http://127.0.0.1:${port}${new URL(String(input)).pathname}`,init);
 await withMcp(remoteMcpConfig.parse({endpoint:'https://sse.fixture.test/sse',transport:'sse',authentication:'header'}),'sse-key',async c=>expect(Object.keys(await listMcpTools(c))).toHaveLength(1),local);
 stream?.end();expect(seen).toContain('POST');
});
it('distinguishes handshake failures from a lost response after tools/call',async()=>{
 const {executeMcp}=await import('./remote.js');
 const {AppRequestError}=await import('../apps/registry.js');
 const key=toolKey('echo'),config={endpoint:'https://mcp.fixture.test/mcp',tools:{[key]:{name:'echo',description:'Echo',input_schema:{type:'object',properties:{}},approval:false}}};
 let handshakes=0;const handshakeFailure:typeof fetch=async()=>{handshakes++;throw new TypeError('network failure');};
 await expect(executeMcp(config,'',key,{},handshakeFailure)).rejects.toMatchObject({code:'mcp_connection_failed'});expect(handshakes).toBe(2);
 const sent:string[]=[];
 const lostResponse:typeof fetch=async(_input,init)=>{
  const body=JSON.parse(String(init?.body));sent.push(body.method);
  if(body.method==='tools/call')throw new TypeError('response lost');
  if(body.id===undefined)return new Response(null,{status:202});
  const result=body.method==='initialize'?{protocolVersion:'2025-03-26',capabilities:{tools:{}},serverInfo:{name:'fixture',version:'1'}}:{tools:[{name:'echo',description:'Echo',inputSchema:{type:'object',properties:{}}}]};
  return new Response(JSON.stringify({jsonrpc:'2.0',id:body.id,result}),{headers:{'content-type':'application/json'}});
 };
 let failure:unknown;try{await executeMcp(config,'',key,{},lostResponse);}catch(error){failure=error;}
 expect(sent.filter(method=>method==='tools/call')).toHaveLength(1);
 expect(failure).toBeInstanceOf(TypeError);expect(failure).not.toBeInstanceOf(AppRequestError);
});

it('reconnects a failed handshake but sends the tool operation only once',async()=>{
 const {executeMcp}=await import('./remote.js');const key=toolKey('echo');let initialize=0,calls=0;
 const transport:typeof fetch=async(_input,init)=>{
  const body=JSON.parse(String(init?.body));
  if(body.method==='initialize'&&++initialize===1)throw new TypeError('connection reset');
  if(body.id===undefined)return new Response(null,{status:202});
  if(body.method==='tools/call')calls++;
  const result=body.method==='initialize'?{protocolVersion:'2025-03-26',capabilities:{tools:{}},serverInfo:{name:'fixture',version:'1'}}:body.method==='tools/list'?{tools:[{name:'echo',description:'Echo',inputSchema:{type:'object'}}]}:{content:[{type:'text',text:'ok'}]};
  return Response.json({jsonrpc:'2.0',id:body.id,result});
 };
 expect(await executeMcp({endpoint:'https://mcp.fixture.test/mcp',tools:{[key]:{name:'echo',description:'Echo',input_schema:{type:'object'},approval:false}}},'',key,{},transport)).toMatchObject({content:[{text:'ok'}]});
 expect(initialize).toBe(2);expect(calls).toBe(1);
});
