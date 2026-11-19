import {type AppDefinition,operation,string,id,page,encode} from './types.js';
import {ToolAuthenticationError} from '../tools/http-json.js';
import {z} from 'zod';
const credentials=z.object({app_id:z.string().min(1).max(256),app_secret:z.string().min(1).max(4096)}).strict();
/** Tenant-scoped self-built app authentication; no user OAuth or manual expiring token. */
export async function larkAccessToken(base:string,credential:string){
 let c;try{c=credentials.parse(JSON.parse(credential));}catch{throw new ToolAuthenticationError();}
 const response=await fetch(base+'/auth/v3/tenant_access_token/internal',{method:'POST',redirect:'error',signal:AbortSignal.timeout(15000),headers:{'Content-Type':'application/json'},body:JSON.stringify(c)});
 if(!response.ok){await response.body?.cancel();throw new ToolAuthenticationError();}
 const value=await response.json() as any;if(value.code!==0||typeof value.tenant_access_token!=='string'||!value.tenant_access_token||/[\r\n]/.test(value.tenant_access_token))throw new ToolAuthenticationError();return value.tenant_access_token;
}
function larkApplication(provider:'feishu'|'lark',origin:string,name:string):AppDefinition{
 const base=origin+'/open-apis';return {id:provider,name,category:'communication',credential_url:origin+'/app',credential_fields:[{name:'app_id',label_key:'ui.lark_app_id'},{name:'app_secret',label_key:'ui.lark_app_secret'}],accessToken:credential=>larkAccessToken(base,credential),verify:()=>({url:base+'/im/v1/chats',method:'GET',query:{page_size:1}}),operations:{
 list_chats:operation('List groups this app bot belongs to. Requires chat read permission and bot membership.',false,{page_token:string,page_size:page},[],a=>({url:base+'/im/v1/chats',method:'GET',query:a})),
 read_chat_messages:operation('Read messages in an authorized group. The app needs message read permission; page_token continues the result.',false,{chat_id:id,page_token:string,page_size:{type:'integer',minimum:1,maximum:50}},['chat_id'],({chat_id,...query})=>({url:base+'/im/v1/messages',method:'GET',query:{...query,container_id_type:'chat',container_id:chat_id}})),
 send_chat_message:operation('Send a plain-text message to a group where this bot is authorized. Requires approval.',true,{chat_id:id,text:{...string,maxLength:10000}},['chat_id','text'],a=>({url:base+'/im/v1/messages',method:'POST',query:{receive_id_type:'chat_id'},body:{receive_id:a.chat_id,msg_type:'text',content:JSON.stringify({text:a.text})}})),
 read_document:operation('Read raw text of an authorized cloud document. Share the document with the app and grant docs read permission.',false,{document_id:id},['document_id'],a=>({url:base+'/docx/v1/documents/'+encode(a.document_id)+'/raw_content',method:'GET'})),
 list_bitable_records:operation('Read a bounded page of records in an authorized Bitable table.',false,{app_token:id,table_id:id,page_token:string,page_size:page},['app_token','table_id'],({app_token,table_id,...query})=>({url:base+'/bitable/v1/apps/'+encode(app_token)+'/tables/'+encode(table_id)+'/records',method:'GET',query})),
 create_bitable_record:operation('Create a record in an authorized Bitable table. Requires approval and write permission.',true,{app_token:id,table_id:id,fields:{type:'object',additionalProperties:true,minProperties:1,maxProperties:100}},['app_token','table_id','fields'],a=>({url:base+'/bitable/v1/apps/'+encode(a.app_token)+'/tables/'+encode(a.table_id)+'/records',method:'POST',body:{fields:a.fields}})),
 }};
}
export const larkApplications=[larkApplication('feishu','https://open.feishu.cn','Feishu'),larkApplication('lark','https://open.larksuite.com','Lark')];
