// Request mappings adapted from Activepieces Google community pieces (MIT).
import {type AppDefinition,operation,string,id,page,object,encode} from './types.js';
import {googleCalendar} from './google.js';
const auth=(scopes:string[])=>({...googleCalendar.oauth!,scopes:scopes.map(s=>'https://www.googleapis.com/auth/'+s)});
const credential_url=googleCalendar.credential_url;
const sheets='https://sheets.googleapis.com/v4/spreadsheets';
const values={type:'array',minItems:1,maxItems:100,items:{type:'array',maxItems:100,items:{type:['string','number','boolean','null']}}};
const valueArgs={spreadsheet_id:id,range:string,values,value_input_option:{type:'string',enum:['RAW','USER_ENTERED']}};
export const googleSheets:AppDefinition={id:'google-sheets',name:'Google Sheets',category:'knowledge',credential_url,oauth:auth(['spreadsheets','drive.metadata.readonly']),verify:()=>({url:'https://www.googleapis.com/drive/v3/files',method:'GET',query:{pageSize:1,fields:'files(id)',q:"mimeType = 'application/vnd.google-apps.spreadsheet'"}}),operations:{
 search_spreadsheets:operation('List accessible Sheets files. Follow nextPageToken.',false,{pageToken:string,pageSize:page},[],a=>({url:'https://www.googleapis.com/drive/v3/files',method:'GET',query:{...a,q:"mimeType = 'application/vnd.google-apps.spreadsheet' and trashed = false",fields:'nextPageToken,files(id,name,webViewLink)'}})),
 read_spreadsheet:operation('Read spreadsheet and tab metadata without cell data.',false,{spreadsheet_id:id},['spreadsheet_id'],a=>({url:sheets+'/'+encode(a.spreadsheet_id),method:'GET',query:{includeGridData:false}})),
 read_values:operation('Read cell values in an A1 range such as Sheet1!A1:D20.',false,{spreadsheet_id:id,range:string},['spreadsheet_id','range'],a=>({url:`${sheets}/${encode(a.spreadsheet_id)}/values/${encode(a.range)}`,method:'GET'})),
 append_values:operation('Append rows after a table. RAW is default; USER_ENTERED interprets formulas.',true,valueArgs,['spreadsheet_id','range','values'],a=>({url:`${sheets}/${encode(a.spreadsheet_id)}/values/${encode(a.range)}:append`,method:'POST',query:{valueInputOption:a.value_input_option??'RAW',insertDataOption:'INSERT_ROWS'},body:{majorDimension:'ROWS',values:a.values}})),
 update_values:operation('Overwrite cells in an A1 range; RAW is default.',true,valueArgs,['spreadsheet_id','range','values'],a=>({url:`${sheets}/${encode(a.spreadsheet_id)}/values/${encode(a.range)}`,method:'PUT',query:{valueInputOption:a.value_input_option??'RAW'},body:{majorDimension:'ROWS',values:a.values}})),
 create_spreadsheet:operation('Create a spreadsheet with a title.',true,{title:string},['title'],a=>({url:sheets,method:'POST',body:{properties:{title:a.title}}})),
}};
const tasks='https://tasks.googleapis.com/tasks/v1';
const path=(a:Record<string,any>)=>tasks+'/lists/'+encode(a.list_id)+'/tasks';
export const googleTasks:AppDefinition={id:'google-tasks',name:'Google Tasks',category:'tasks',credential_url,oauth:auth(['tasks']),verify:()=>({url:tasks+'/users/@me/lists',method:'GET',query:{maxResults:1}}),operations:{
 list_task_lists:operation('List task lists; follow nextPageToken.',false,{pageToken:string,maxResults:page},[],a=>({url:tasks+'/users/@me/lists',method:'GET',query:a})),
 list_tasks:operation('List tasks including completed ones when requested.',false,{list_id:id,pageToken:string,maxResults:page,showCompleted:{type:'boolean'}},['list_id'],({list_id,...query})=>({url:path({list_id}),method:'GET',query})),
 create_task:operation('Create a task. Due dates are calendar dates; parent and previous IDs control placement.',true,{list_id:id,title:string,notes:string,due_date:{type:'string',pattern:'^\\d{4}-\\d{2}-\\d{2}$'},parent:id,previous:id},['list_id','title'],a=>({url:path(a),method:'POST',query:{parent:a.parent,previous:a.previous},body:{title:a.title,notes:a.notes,due:a.due_date?`${a.due_date}T00:00:00Z`:undefined}})),
 complete_task:operation('Mark a Google task completed.',true,{list_id:id,task_id:id},['list_id','task_id'],a=>({url:path(a)+'/'+encode(a.task_id),method:'PATCH',body:{status:'completed'}})),
}};
const people='https://people.googleapis.com/v1';const personFields='names,emailAddresses,phoneNumbers,organizations,metadata';
export const googleContacts:AppDefinition={id:'google-contacts',name:'Google Contacts',category:'knowledge',credential_url,oauth:auth(['contacts']),verify:()=>({url:people+'/people/me/connections',method:'GET',query:{pageSize:1,personFields:'names'}}),operations:{
 list_contacts:operation('List personal contacts with names, emails and phone numbers; follow nextPageToken.',false,{pageToken:string,pageSize:page},[],a=>({url:people+'/people/me/connections',method:'GET',query:{...a,personFields}})),
 read_contact:operation('Read one contact. Supply the ID after people/ from resourceName.',false,{person_id:id},['person_id'],a=>({url:people+'/people/'+encode(a.person_id),method:'GET',query:{personFields}})),
 create_contact:operation('Create a personal contact with name and optional email and phone.',true,{given_name:string,family_name:string,email:string,phone:string},['given_name'],a=>({url:people+'/people:createContact',method:'POST',query:{personFields},body:{names:[{givenName:a.given_name,familyName:a.family_name}],...(a.email?{emailAddresses:[{value:a.email}]}:{}),...(a.phone?{phoneNumbers:[{value:a.phone}]}:{})}})),
 update_contact:operation('Replace contact names using the latest etag from read_contact. Protects concurrent changes.',true,{person_id:id,etag:string,given_name:string,family_name:string},['person_id','etag','given_name'],a=>({url:people+'/people/'+encode(a.person_id)+':updateContact',method:'PATCH',query:{updatePersonFields:'names',personFields},body:{etag:a.etag,names:[{givenName:a.given_name,familyName:a.family_name}]}})),
}};
export const googleWorkspaceApps=[googleSheets,googleTasks,googleContacts];
