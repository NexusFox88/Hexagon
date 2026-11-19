import {afterEach,expect,it,vi} from 'vitest';
import {larkApplications} from './lark.js';
import {applicationRequest,applicationOperations} from './registry.js';
import {ToolAuthenticationError} from '../tools/http-json.js';
afterEach(()=>vi.unstubAllGlobals());
it.each(larkApplications)('$id exchanges app credentials, validates permissions and renews automatically',async app=>{
 const requests:any[]=[];vi.stubGlobal('fetch',vi.fn(async(url,init)=>{requests.push({url,init});return new Response(JSON.stringify(String(url).endsWith('/internal')?{code:0,tenant_access_token:'tenant-token',expire:7200}:{code:0,data:{items:[],echo:'tenant-token',secret:'app-secret'}}));}));
 const credential=JSON.stringify({app_id:'app-id',app_secret:'app-secret'});
 for(let i=0;i<2;i++){const result=await applicationRequest(app,credential,app.verify({}),{write:false});expect(JSON.stringify(result)).not.toContain('tenant-token');expect(JSON.stringify(result)).not.toContain('app-secret');}
 expect(requests.filter(r=>String(r.url).endsWith('/internal'))).toHaveLength(2);expect(requests[1].init.headers.Authorization).toBe('Bearer tenant-token');expect(String(requests[1].url).startsWith(app.id==='feishu'?'https://open.feishu.cn/':'https://open.larksuite.com/')).toBe(true);
 expect(applicationOperations(app,{})).not.toHaveProperty('send_chat_message');
 const send=app.operations.send_chat_message!.request({chat_id:'chat',text:'hello'},{});expect(send.body).toEqual({receive_id:'chat',msg_type:'text',content:'{"text":"hello"}'});
});
it('stops invalid app credentials before any application operation',async()=>{
 const fetch=vi.fn().mockResolvedValue(new Response('{"code":10014}'));vi.stubGlobal('fetch',fetch);const app=larkApplications[0]!;await expect(applicationRequest(app,JSON.stringify({app_id:'id',app_secret:'bad'}),app.verify({}),{write:false})).rejects.toBeInstanceOf(ToolAuthenticationError);expect(fetch).toHaveBeenCalledTimes(1);
});
