// Request mappings adapted from Activepieces Dropbox, HubSpot and Calendly community pieces (MIT).
import {type AppDefinition,operation,string,id,page,encode} from './types.js';
const db='https://api.dropboxapi.com/2';
const dropPath={type:'string',maxLength:2048,description:'Dropbox path beginning with /, id: identifier, or empty string for root.'};
export const dropbox:AppDefinition={id:'dropbox',name:'Dropbox',category:'knowledge',credential_url:'https://www.dropbox.com/developers/apps',oauth:{authorize:'https://www.dropbox.com/oauth2/authorize',token:'https://api.dropboxapi.com/oauth2/token',issuer:'https://www.dropbox.com',pkce:true,client_auth:'basic',scopes:['account_info.read','files.metadata.read','files.metadata.write','files.content.read','files.content.write'],params:{token_access_type:'offline'}},verify:()=>({url:db+'/users/get_current_account',method:'POST',body:null}),identity:b=>b.email,operations:{
 list_files:operation('List folder entries. Pass returned cursor to continue; root accepts / or empty path.',false,{path:dropPath,cursor:string,limit:page,recursive:{type:'boolean'}},[],a=>({url:db+'/files/list_folder'+(a.cursor?'/continue':''),method:'POST',body:a.cursor?{cursor:a.cursor}:{path:a.path==='/'?'':a.path??'',recursive:a.recursive??false,limit:a.limit??100}})),
 read_file:operation('Read file/folder metadata, not binary file content.',false,{path:dropPath},['path'],a=>({url:db+'/files/get_metadata',method:'POST',body:{path:a.path}})),
 search_files:operation('Search accessible file names and metadata; continue with returned cursor.',false,{query:string,cursor:string},[],a=>({url:db+'/files/'+(a.cursor?'search/continue_v2':'search_v2'),method:'POST',body:a.cursor?{cursor:a.cursor}:{query:a.query??'',options:{max_results:100}}})),
 create_folder:operation('Create a Dropbox folder. Existing names cause an error rather than auto-renaming.',true,{path:{...dropPath,minLength:2,pattern:'^/'}},['path'],a=>({url:db+'/files/create_folder_v2',method:'POST',body:{path:a.path,autorename:false}})),
 move_file:operation('Move or rename a file or folder. Confirm both paths.',true,{from_path:{...dropPath,minLength:1},to_path:{...dropPath,minLength:2,pattern:'^/'}},['from_path','to_path'],a=>({url:db+'/files/move_v2',method:'POST',body:{...a,autorename:false}})),
}};
const hub='https://api.hubapi.com/crm/v3/objects';
const propertyMap={type:'object',minProperties:1,maxProperties:100,additionalProperties:{type:['string','number','boolean']}};
export const hubspot:AppDefinition={id:'hubspot',name:'HubSpot',category:'crm',credential_url:'https://app.hubspot.com/private-apps',oauth:{authorize:'https://app.hubspot.com/oauth/authorize',token:'https://api.hubapi.com/oauth/v3/token',issuer:'https://api.hubapi.com',pkce:false,client_auth:'post',scopes:[]},
 verify:()=>({url:'https://api.hubapi.com/account-info/v3/details',method:'GET'}),identity:b=>b.portalId===undefined?undefined:String(b.portalId),
 permissionProbe:(name)=>name.startsWith('create_')||name.startsWith('update_')?undefined:({url:hub+(name.includes('deal')?'/deals':'/contacts'),method:'GET',query:{limit:1}}),operations:{
 list_contacts:operation('List CRM contacts; follow paging.next.after. Requires contacts read scope.',false,{after:string,limit:page},[],a=>({url:hub+'/contacts',method:'GET',query:a})),
 search_contacts:operation('Search CRM contacts by text. Use after from paging.next.',false,{query:string,after:string,limit:page},['query'],a=>({url:hub+'/contacts/search',method:'POST',body:a})),
 read_contact:operation('Read one CRM contact.',false,{contact_id:id},['contact_id'],a=>({url:hub+'/contacts/'+encode(a.contact_id),method:'GET'})),
 create_contact:operation('Create a CRM contact from HubSpot internal property names and values.',true,{properties:propertyMap},['properties'],a=>({url:hub+'/contacts',method:'POST',body:a})),
 update_contact:operation('Update selected CRM contact properties.',true,{contact_id:id,properties:propertyMap},['contact_id','properties'],a=>({url:hub+'/contacts/'+encode(a.contact_id),method:'PATCH',body:{properties:a.properties}})),
 list_deals:operation('List CRM deals; requires deals read scope.',false,{after:string,limit:page},[],a=>({url:hub+'/deals',method:'GET',query:a})),
 create_deal:operation('Create a CRM deal; include required pipeline/stage internal identifiers.',true,{properties:propertyMap},['properties'],a=>({url:hub+'/deals',method:'POST',body:a})),
}};
const cal='https://api.calendly.com';const uri={type:'string',pattern:'^https://api\\.calendly\\.com/(users|organizations|event_types)/[A-Za-z0-9-]+$',maxLength:512};
export const calendly:AppDefinition={id:'calendly',name:'Calendly',category:'calendar',credential_url:'https://calendly.com/integrations/api_webhooks',verify:()=>({url:cal+'/users/me',method:'GET'}),identity:b=>b.resource?.email,operations:{
 read_profile:operation('Read own profile including user and organization URIs needed by list operations.',false,{},[],()=>({url:cal+'/users/me',method:'GET'})),
 list_events:operation('List scheduled meetings for the user URI from read_profile; follow pagination.next_page_token.',false,{user:uri,page_token:string,count:page,min_start_time:string,max_start_time:string,status:{type:'string',enum:['active','canceled']}},['user'],a=>({url:cal+'/scheduled_events',method:'GET',query:a})),
 read_event:operation('Read a scheduled event using the UUID from its URI.',false,{event_id:id},['event_id'],a=>({url:cal+'/scheduled_events/'+encode(a.event_id),method:'GET'})),
 list_invitees:operation('List event invitees, one page at a time.',false,{event_id:id,page_token:string,count:page},['event_id'],({event_id,...query})=>({url:cal+'/scheduled_events/'+encode(event_id)+'/invitees',method:'GET',query})),
 list_event_types:operation('List scheduling event types belonging to a user URI.',false,{user:uri,page_token:string,count:page},['user'],a=>({url:cal+'/event_types',method:'GET',query:a})),
 create_scheduling_link:operation('Create a single-use scheduling link for an event type URI.',true,{event_type_uri:uri},['event_type_uri'],a=>({url:cal+'/scheduling_links',method:'POST',body:{max_event_count:1,owner:a.event_type_uri,owner_type:'EventType'}})),
 cancel_event:operation('Cancel a scheduled event; invitees may be notified.',true,{event_id:id,reason:string},['event_id','reason'],a=>({url:cal+'/scheduled_events/'+encode(a.event_id)+'/cancellation',method:'POST',body:{reason:a.reason}})),
}};
for(const [name,op] of Object.entries(hubspot.operations))op.scopes=[`crm.objects.${name.includes('deal')?'deals':'contacts'}.${op.write?'write':'read'}`];
export const businessApps=[dropbox,hubspot,calendly];
