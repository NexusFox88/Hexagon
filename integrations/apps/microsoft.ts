// Adapted request mappings from Activepieces community pieces (MIT).
// Snapshots and provenance: third_party/activepieces/expansion/.
import {type AppDefinition,type RequestSpec,operation,string,id,page,object,encode} from './types.js';
const base='https://graph.microsoft.com/v1.0';
const oauth=(scopes:string[]):AppDefinition['oauth']=>({authorize:'https://login.microsoftonline.com/common/oauth2/v2.0/authorize',token:'https://login.microsoftonline.com/common/oauth2/v2.0/token',issuer:'https://login.microsoftonline.com/common/v2.0',pkce:true,client_auth:'post',scopes:['offline_access','User.Read',...scopes]});
const common={credential_url:'https://entra.microsoft.com/',verify:()=>({url:base+'/me',method:'GET',query:{$select:'id,displayName,mail,userPrincipalName'}}),identity:(b:any)=>b.mail||b.userPrincipalName};
const paging={top:page,next_page_url:{...string,maxLength:8192}};
/** Follow Graph's opaque nextLink without allowing a different host or resource. */
export function graphPage(path:string,args:Record<string,any>,query:Record<string,unknown>={}):RequestSpec {
 const target=new URL(base+path);
 if(args.next_page_url){const next=new URL(args.next_page_url);if(next.origin!==target.origin||next.pathname!==target.pathname||next.username||next.password||next.hash)throw new Error('invalid_application_page_url');return {url:next.toString(),method:'GET'};}
 return {url:target.toString(),method:'GET',query:{$top:args.top??50,...query}};
}
const json=(path:string,method:string,body?:unknown):RequestSpec=>({url:base+path,method,body});
const mailFields={to:string,subject:string,text:string};
const message=(a:Record<string,any>)=>({subject:a.subject,body:{contentType:'Text',content:a.text},toRecipients:[{emailAddress:{address:a.to}}]});
export const outlook:AppDefinition={...common,id:'outlook',name:'Microsoft Outlook',category:'communication',oauth:oauth(['Mail.ReadWrite','Mail.Send']),operations:{
 list_messages:operation('List mail messages, one page at a time. Continue using @odata.nextLink as next_page_url.',false,{...paging,search:string},[],a=>graphPage('/me/messages',a,a.search?{$search:JSON.stringify(a.search)}:{})),
 read_message:operation('Read an Outlook message by ID.',false,{message_id:id},['message_id'],a=>json('/me/messages/'+encode(a.message_id),'GET')),
 create_draft:operation('Create a plain-text Outlook draft; does not send it.',true,mailFields,['to','subject','text'],a=>json('/me/messages','POST',message(a))),
 send_message:operation('Send an email. Confirm recipient, subject and text before approval.',true,mailFields,['to','subject','text'],a=>json('/me/sendMail','POST',{message:message(a),saveToSentItems:true})),
}};
const date=object({dateTime:string,timeZone:string},['dateTime','timeZone']);
const eventFields={subject:string,start:date,end:date,description:string};
const event=(a:Record<string,any>)=>({subject:a.subject,start:a.start,end:a.end,...(a.description?{body:{contentType:'Text',content:a.description}}:{})});
export const outlookCalendar:AppDefinition={...common,id:'outlook-calendar',name:'Microsoft Outlook Calendar',category:'calendar',oauth:oauth(['Calendars.ReadWrite']),operations:{
 list_calendars:operation('List Outlook calendars. Follow @odata.nextLink with next_page_url.',false,paging,[],a=>graphPage('/me/calendars',a)),
 list_events:operation('List events in a calendar, one page at a time.',false,{calendar_id:id,...paging},['calendar_id'],a=>graphPage(`/me/calendars/${encode(a.calendar_id)}/events`,a)),
 create_event:operation('Create an Outlook event with explicit local date-time and time zone.',true,{calendar_id:id,...eventFields},['calendar_id','subject','start','end'],a=>json(`/me/calendars/${encode(a.calendar_id)}/events`,'POST',event(a))),
 update_event:operation('Update an event; existing attendees may receive updates.',true,{event_id:id,...eventFields},['event_id'],a=>json('/me/events/'+encode(a.event_id),'PATCH',event(a))),
}};
const folder=(a:Record<string,any>)=>a.folder_id?'/me/drive/items/'+encode(a.folder_id):'/me/drive/root';
export const oneDrive:AppDefinition={...common,id:'onedrive',name:'Microsoft OneDrive',category:'knowledge',oauth:oauth(['Files.ReadWrite']),operations:{
 list_files:operation('List folder children (root by default); follow @odata.nextLink as next_page_url. Metadata only.',false,{folder_id:id,...paging},[],a=>graphPage(folder(a)+'/children',a)),
 read_file:operation('Read file or folder metadata, not binary file contents.',false,{item_id:id},['item_id'],a=>json('/me/drive/items/'+encode(a.item_id),'GET')),
 create_folder:operation('Create a folder under the selected parent; conflicts fail.',true,{folder_id:id,name:{...string,maxLength:255}},['name'],a=>json(folder(a)+'/children','POST',{name:a.name,folder:{},'@microsoft.graph.conflictBehavior':'fail'})),
 rename_file:operation('Rename a file or folder.',true,{item_id:id,name:{...string,maxLength:255}},['item_id','name'],a=>json('/me/drive/items/'+encode(a.item_id),'PATCH',{name:a.name})),
}};
const taskPath=(a:Record<string,any>)=>'/me/todo/lists/'+encode(a.list_id)+'/tasks';
export const microsoftTodo:AppDefinition={...common,id:'microsoft-todo',name:'Microsoft To Do',category:'tasks',oauth:oauth(['Tasks.ReadWrite']),operations:{
 list_task_lists:operation('List Microsoft To Do lists; follow @odata.nextLink.',false,paging,[],a=>graphPage('/me/todo/lists',a)),
 list_tasks:operation('List tasks in a Microsoft To Do list.',false,{list_id:id,...paging},['list_id'],a=>graphPage(taskPath(a),a)),
 create_task:operation('Create a To Do task with optional plain-text notes.',true,{list_id:id,title:string,notes:string},['list_id','title'],a=>json(taskPath(a),'POST',{title:a.title,...(a.notes?{body:{contentType:'text',content:a.notes}}:{})})),
 complete_task:operation('Mark a To Do task completed.',true,{list_id:id,task_id:id},['list_id','task_id'],a=>json(taskPath(a)+'/'+encode(a.task_id),'PATCH',{status:'completed'})),
}};
export const teams:AppDefinition={...common,id:'microsoft-teams',name:'Microsoft Teams',category:'communication',oauth:oauth(['Chat.Read','ChatMessage.Send','Team.ReadBasic.All','Channel.ReadBasic.All']),operations:{
 list_teams:operation('List joined Teams; organization consent may be required.',false,{},[],()=>json('/me/joinedTeams','GET')),
 list_channels:operation('List channels in a joined team.',false,{team_id:id},['team_id'],a=>json('/teams/'+encode(a.team_id)+'/channels','GET')),
 list_chats:operation('List chats visible to the signed-in user; follow @odata.nextLink.',false,paging,[],a=>graphPage('/me/chats',a)),
 read_history:operation('Read chat messages with delegated user permission.',false,{chat_id:id,...paging},['chat_id'],a=>graphPage('/chats/'+encode(a.chat_id)+'/messages',a)),
 send_message:operation('Send a plain-text message to an existing chat as the authorized user.',true,{chat_id:id,text:string},['chat_id','text'],a=>json('/chats/'+encode(a.chat_id)+'/messages','POST',{body:{contentType:'text',content:a.text}})),
}};
export const microsoftApps=[outlook,outlookCalendar,oneDrive,microsoftTodo,teams];
