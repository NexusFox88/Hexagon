import {afterEach,expect,it,vi} from 'vitest';
import {responsesModelConnection} from './openai-responses.js';
import {openCodeRequest} from '../harnesses/opencode.js';
import {piAdapter} from '../harnesses/pi.js';
afterEach(()=>vi.unstubAllGlobals());
it.each(['https://provider.test','https://provider.test/v1/'])('validates Responses with bearer credentials at %s',async base_url=>{
 const fetch=vi.fn().mockResolvedValue(new Response(JSON.stringify({object:'response',status:'completed',output:[{type:'message',content:[{type:'output_text',text:'OK'}]}]})));vi.stubGlobal('fetch',fetch);
 await responsesModelConnection.validate({base_url,model:'test'},'account-key');
 const [url,request]=fetch.mock.calls[0]!;expect(url).toBe('https://provider.test/v1/responses');expect(request.headers.Authorization).toBe('Bearer account-key');expect(request.redirect).toBe('error');
});
it('rejects successful HTTP responses that are not Responses',async()=>{
 vi.stubGlobal('fetch',vi.fn().mockResolvedValue(new Response('{"content":[]}')));await expect(responsesModelConnection.validate({base_url:'https://provider.test',model:'test'},'key')).rejects.toThrow('model_response_invalid');
});
it('selects native OpenAI wire implementations without altering the user model name',()=>{
 const model={base_url:'https://proxy.test/access/grant',model:'deepseek-ai/model',provider:'openai-responses',credential:'scoped-grant'};
 const oc=openCodeRequest('run','hello',model);const config=JSON.parse(oc.env.OPENCODE_CONFIG_CONTENT!);expect(config.provider.hexagon.npm).toBe('@ai-sdk/openai');expect(config.model).toBe('hexagon/deepseek-ai/model');expect(oc.command.join(' ')).not.toContain(model.credential);
 const pi=piAdapter.invocation('run','hello',model);const meta=JSON.parse(pi.env.HEXAGON_MODEL_CONFIG!);expect(meta.provider).toBe('openai-responses');expect(meta.base_url).toBe('https://proxy.test/access/grant/v1');
});
it('uses OpenAI bearer auth and exact path policy at the external credential boundary',async()=>{
 const {ConnectionAccess}=await import('../../modules/access/access.js');const {createAccessServer}=await import('../../apps/control-plane/access-server.js');const {MockAgent}=await import('undici');
 const row={tenant_id:'tenant',secret_id:'secret',connection_id:'connection',kind:'model',provider:'openai-responses',config:{base_url:'https://provider.test/v1'}};
 const access=new ConnectionAccess({query:async()=>({rows:[row]})} as any,{read:async()=> 'upstream-account-key'} as any);
 const mock=new MockAgent();mock.disableNetConnect();const app=createAccessServer(access,mock);
 const grant='12345678-1234-4234-8234-123456789012',headers={authorization:'Bearer '+'a'.repeat(64),'content-type':'application/json'};
 try{
  mock.get('https://provider.test').intercept({path:'/v1/responses',method:'POST',headers:{authorization:'Bearer upstream-account-key'}}).reply(200,'data: fixture\n\ndata: [DONE]\n\n',{headers:{'content-type':'text/event-stream'}});
  const result=await app.inject({method:'POST',url:`/access/${grant}/v1/responses`,headers,payload:'{}'});expect(result.statusCode).toBe(200);expect(result.body).toContain('[DONE]');expect(result.body).not.toContain('upstream-account-key');
  for(const path of ['/v1/messages','/v1/chat/completions','/v1/models'])expect((await app.inject({method:'POST',url:`/access/${grant}${path}`,headers,payload:'{}'})).statusCode).toBe(403);
  mock.assertNoPendingInterceptors();
 }finally{await app.close();}
});
