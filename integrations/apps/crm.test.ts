import {afterEach,expect,it,vi} from 'vitest';
import {attio,salesforce,salesforceOrigin} from './crm.js';
import {hubspot} from './business.js';
import {applicationConfig,applicationOperations,applicationOAuth,selectedOAuthScopes,verifyApplication} from './registry.js';
import {executeTool} from '../../modules/tools/adapters.js';
const response=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status});
afterEach(()=>vi.unstubAllGlobals());
it('rejects untrusted Salesforce credential destinations and fixes authorization to the same My Domain',()=>{
 for(const origin of ['http://acme.my.salesforce.com','https://127.0.0.1','https://acme.my.salesforce.com.evil.test','https://u:p@acme.my.salesforce.com','https://acme.my.salesforce.com/path','https://acme.my.salesforce.com:444','https://login.salesforce.com'])expect(salesforceOrigin.safeParse(origin).success).toBe(false);
 const config={instance_url:'https://acme.my.salesforce.com',operations:['read_contacts']};expect(applicationConfig(salesforce).safeParse(config).success).toBe(true);expect(applicationOAuth(salesforce,config)?.token).toBe(config.instance_url+'/services/oauth2/token');
 expect(applicationConfig(attio).safeParse(config).success).toBe(false);
});
it('checks Attio active state and provider scopes without treating local operation names as granted scopes',async()=>{
 const fetch=vi.fn().mockImplementation(async()=>response({active:true,workspace_id:'workspace',scope:'record_permission:read'}));vi.stubGlobal('fetch',fetch);
 expect(await verifyApplication(attio,{operations:['list_records']},'private-key')).toMatchObject({account:'workspace',scope:['record_permission:read'],allowed_operations:['list_records'],permission_checks:[{state:'verified',basis:'scope'}]});
 await expect(verifyApplication(attio,{operations:['create_record']},'private-key')).rejects.toMatchObject({code:'app_permission_denied',verification:{permission_checks:[{state:'denied'}]}});
 fetch.mockImplementation(async()=>response({active:false}));await expect(verifyApplication(attio,{},'private-key')).rejects.toThrow();
 fetch.mockImplementation(async()=>response({active:true}));expect(await verifyApplication(attio,{operations:['list_records']},'private-key')).toMatchObject({scope_source:'unknown',permission_coverage:'partial'});
});
it('never tests HubSpot writes by making writes, and requests only selected OAuth scopes',async()=>{
 const fetch=vi.fn().mockImplementation(async url=>response(String(url).includes('account-info')?{portalId:123}:{}));vi.stubGlobal('fetch',fetch);
 const result=await verifyApplication(hubspot,{operations:['list_contacts','create_deal']},'private-key');expect(result.permission_checks).toEqual([{operation:'list_contacts',state:'verified',basis:'read_probe'},{operation:'create_deal',state:'unknown',basis:'not_tested'}]);expect(fetch.mock.calls.every(c=>c[1].method==='GET')).toBe(true);
 expect(selectedOAuthScopes(hubspot,{operations:['list_contacts']})).toEqual(['crm.objects.contacts.read']);expect(applicationOAuth(hubspot,{})?.token).toContain('/oauth/v3/token');
});
it('uses Salesforce object metadata to detect missing write grants, without creating a record',async()=>{
 const fetch=vi.fn().mockImplementation(async url=>response(String(url).endsWith('userinfo')?{organization_id:'org',user_id:'user'}:{queryable:true,createable:false,updateable:true}));vi.stubGlobal('fetch',fetch);
 const c={instance_url:'https://acme.my.salesforce.com',operations:['read_contacts','create_contacts']};await expect(verifyApplication(salesforce,c,'private-key')).rejects.toMatchObject({code:'app_permission_denied'});expect(fetch).toHaveBeenCalledTimes(2);expect(fetch.mock.calls.every(c=>c[1].method==='GET')).toBe(true);
});
it('maps CRM requests, redacts credentials and retains approval on every write',async()=>{
 const fetch=vi.fn().mockImplementation(async()=>response({echo:'private-key'}));vi.stubGlobal('fetch',fetch);
 expect(await executeTool('attio',{operations:['list_records']},'private-key','list_records',{object:'people',limit:5},'call')).toEqual({echo:'[REDACTED]'});
 expect(fetch.mock.calls[0]![0].toString()).toBe('https://api.attio.com/v2/objects/people/records/query');expect(JSON.parse(fetch.mock.calls[0]![1].body)).toEqual({limit:5,offset:0});
 for(const app of [attio,salesforce,hubspot])for(const [name,op]of Object.entries(app.operations)){const cfg={...(app===salesforce?{instance_url:'https://acme.my.salesforce.com'}:{}),operations:[name]};expect(applicationOperations(app,cfg)[name]?.approval).toBe(op.write);}
});
