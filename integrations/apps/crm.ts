// Fixed request mappings from official Attio and Salesforce REST documentation.
// See docs/plans/2026-11-18-crm-authorization.md for source references.
import {z} from 'zod';
import {type AppDefinition,operation,string,id,page,encode} from './types.js';
export const salesforceOrigin=z.string().url().refine(value=>{
 const u=new URL(value);
 return u.protocol==='https:'&&!u.port&&!u.username&&!u.password&&!u.search&&!u.hash&&u.pathname==='/'&&/^[-a-z0-9]+(?:\.[-a-z0-9]+)*\.my\.salesforce\.com$/.test(u.hostname);
},'salesforce_instance_invalid').transform(value=>new URL(value).origin);
const sfBase=(c:Record<string,any>)=>salesforceOrigin.parse(c.instance_url);
const recordId={...id,pattern:'^[a-zA-Z0-9]{15}(?:[a-zA-Z0-9]{3})?$'};
const fields={type:'object',minProperties:1,maxProperties:100,propertyNames:{pattern:'^[a-zA-Z][a-zA-Z0-9_]*$'},additionalProperties:{type:['string','number','boolean','null']}};
const sfOperations:AppDefinition['operations']={};
for(const [kind,object] of Object.entries({contacts:'Contact',accounts:'Account',opportunities:'Opportunity'})){
 const path=(c:Record<string,any>)=>sfBase(c)+'/services/data/v62.0/sobjects/'+object;
 sfOperations['list_'+kind]=operation(`List recent Salesforce ${kind}; this endpoint is a bounded recent-items view, not a complete export.`,false,{},[],(_,c)=>({url:path(c),method:'GET'}),['api']);
 sfOperations['read_'+kind]=operation(`Read one Salesforce ${object}.`,false,{record_id:recordId},['record_id'],(a,c)=>({url:path(c)+'/'+encode(a.record_id),method:'GET'}),['api']);
 sfOperations['create_'+kind]=operation(`Create a Salesforce ${object} using API field names.`,true,{fields},['fields'],(a,c)=>({url:path(c),method:'POST',body:a.fields}),['api']);
 sfOperations['update_'+kind]=operation(`Update a Salesforce ${object} using API field names.`,true,{record_id:recordId,fields},['record_id','fields'],(a,c)=>({url:path(c)+'/'+encode(a.record_id),method:'PATCH',body:a.fields}),['api']);
}
export const salesforce:AppDefinition={id:'salesforce',name:'Salesforce',category:'crm',credential_url:'https://help.salesforce.com/s/articleView?id=sf.connected_app_overview.htm',
 oauth:{authorize:'https://login.salesforce.com/services/oauth2/authorize',token:'https://login.salesforce.com/services/oauth2/token',issuer:'https://login.salesforce.com',pkce:true,client_auth:'post',scopes:['api','refresh_token','openid']},
 verify:c=>({url:sfBase(c)+'/services/oauth2/userinfo',method:'GET'}),identity:b=>typeof b.organization_id==='string'&&typeof b.user_id==='string'?`${b.organization_id}/${b.user_id}`:undefined,
 operations:sfOperations,
 permissionProbe:(name,c)=>({url:sfBase(c)+'/services/data/v62.0/sobjects/'+({contacts:'Contact',accounts:'Account',opportunities:'Opportunity'} as Record<string,string>)[name.split('_').at(-1)!]+'/describe',method:'GET'}),
 permissionResult:(name,b)=>name.startsWith('create_')?b.createable===true:name.startsWith('update_')?b.updateable===true:b.queryable===true,
};
const attioBase='https://api.attio.com/v2';
const object={type:'string',enum:['people','companies','deals']};
const uuid={type:'string',pattern:'^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$'};
const values={type:'object',minProperties:1,maxProperties:100,additionalProperties:true};
export const attio:AppDefinition={id:'attio',name:'Attio',category:'crm',credential_url:'https://app.attio.com/',
 oauth:{authorize:'https://app.attio.com/authorize',token:'https://app.attio.com/oauth/token',issuer:'https://app.attio.com',pkce:false,client_auth:'post',scopes:[]},
 verify:()=>({url:attioBase+'/self',method:'GET'}),identity:b=>b.workspace_id,
 grantedScopes:b=>typeof b.scope==='string'?b.scope.split(' '):undefined,
 verificationActive:b=>b.active===true,
 operations:{
 list_records:operation('List records of a standard Attio object with bounded offset pagination.',false,{object,limit:page,offset:{type:'integer',minimum:0,maximum:1000000}},['object'],a=>({url:`${attioBase}/objects/${encode(a.object)}/records/query`,method:'POST',body:{limit:a.limit??25,offset:a.offset??0}}),['record_permission:read']),
 read_record:operation('Read one Attio record.',false,{object,record_id:uuid},['object','record_id'],a=>({url:`${attioBase}/objects/${encode(a.object)}/records/${encode(a.record_id)}`,method:'GET'}),['record_permission:read']),
 create_record:operation('Create an Attio record using attribute values.',true,{object,values},['object','values'],a=>({url:`${attioBase}/objects/${encode(a.object)}/records`,method:'POST',body:{data:{values:a.values}}}),['record_permission:read-write']),
 update_record:operation('Update an Attio record using attribute values.',true,{object,record_id:uuid,values},['object','record_id','values'],a=>({url:`${attioBase}/objects/${encode(a.object)}/records/${encode(a.record_id)}`,method:'PATCH',body:{data:{values:a.values}}}),['record_permission:read-write']),
 }};
export const crmApps=[salesforce,attio];
