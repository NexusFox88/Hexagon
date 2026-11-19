// Request mappings adapted from Activepieces community Asana, Airtable, ClickUp and Trello (MIT).
import {type AppDefinition,operation,string,id,page,encode} from './types.js';
import {ToolAuthenticationError} from '../tools/http-json.js';
const asanaBase='https://app.asana.com/api/1.0';
export const asana:AppDefinition={id:'asana',name:'Asana',category:'tasks',credential_url:'https://app.asana.com/0/my-apps',verify:()=>({url:asanaBase+'/users/me',method:'GET'}),identity:b=>b.data?.email,
 oauth:{authorize:'https://app.asana.com/-/oauth_authorize',token:'https://app.asana.com/-/oauth_token',issuer:'https://app.asana.com',pkce:true,client_auth:'post',scopes:['users:read','workspaces:read','projects:read','tasks:read','tasks:write','stories:write']},operations:{
 list_workspaces:operation('List accessible Asana workspaces; follow next_page.offset.',false,{limit:page,offset:string},[],a=>({url:asanaBase+'/workspaces',method:'GET',query:a})),
 list_projects:operation('List workspace projects, one page at a time.',false,{workspace_id:id,limit:page,offset:string},['workspace_id'],({workspace_id,...query})=>({url:asanaBase+'/workspaces/'+encode(workspace_id)+'/projects',method:'GET',query})),
 list_tasks:operation('List tasks in a project; use next_page.offset for pagination.',false,{project_id:id,limit:page,offset:string},['project_id'],({project_id,...query})=>({url:asanaBase+'/projects/'+encode(project_id)+'/tasks',method:'GET',query})),
 get_task:operation('Read a task and its details.',false,{task_id:id},['task_id'],a=>({url:asanaBase+'/tasks/'+encode(a.task_id),method:'GET'})),
 create_task:operation('Create a task in a project with optional notes and due date.',true,{project_id:id,name:string,notes:string,due_on:{type:'string',pattern:'^\\d{4}-\\d{2}-\\d{2}$'},assignee:id},['project_id','name'],({project_id,...data})=>({url:asanaBase+'/tasks',method:'POST',body:{data:{...data,projects:[project_id]}}})),
 update_task:operation('Update task fields, including completion status.',true,{task_id:id,name:string,notes:string,completed:{type:'boolean'}},['task_id'],({task_id,...data})=>({url:asanaBase+'/tasks/'+encode(task_id),method:'PUT',body:{data}})),
 add_comment:operation('Add a plain-text comment to a task.',true,{task_id:id,text:string},['task_id','text'],a=>({url:asanaBase+'/tasks/'+encode(a.task_id)+'/stories',method:'POST',body:{data:{text:a.text}}})),
}};
const air='https://api.airtable.com/v0';const table=(a:Record<string,any>)=>`${air}/${encode(a.base_id)}/${encode(a.table_id)}`;
const fields={type:'object',minProperties:1,maxProperties:100,additionalProperties:true};
export const airtable:AppDefinition={id:'airtable',name:'Airtable',category:'knowledge',credential_url:'https://airtable.com/create/tokens',verify:()=>({url:air+'/meta/bases',method:'GET'}),operations:{
 list_bases:operation('List bases granted to the personal access token; follow offset.',false,{offset:string},[],a=>({url:air+'/meta/bases',method:'GET',query:a})),
 read_base_schema:operation('Read tables and field definitions before creating or updating records.',false,{base_id:id},['base_id'],a=>({url:air+'/meta/bases/'+encode(a.base_id)+'/tables',method:'GET'})),
 list_records:operation('List records with optional formula/view filter; follow offset.',false,{base_id:id,table_id:id,offset:string,pageSize:page,filterByFormula:string,view:string},['base_id','table_id'],({base_id,table_id,...query})=>({url:table({base_id,table_id}),method:'GET',query})),
 read_record:operation('Read one record by ID.',false,{base_id:id,table_id:id,record_id:id},['base_id','table_id','record_id'],a=>({url:table(a)+'/'+encode(a.record_id),method:'GET'})),
 create_record:operation('Create a record with a field-name/value map. Linked fields take arrays of record IDs.',true,{base_id:id,table_id:id,fields,typecast:{type:'boolean'}},['base_id','table_id','fields'],a=>({url:table(a),method:'POST',body:{fields:a.fields,typecast:a.typecast??false}})),
 update_record:operation('Update selected fields of a record.',true,{base_id:id,table_id:id,record_id:id,fields,typecast:{type:'boolean'}},['base_id','table_id','record_id','fields'],a=>({url:table(a)+'/'+encode(a.record_id),method:'PATCH',body:{fields:a.fields,typecast:a.typecast??false}})),
}};
const click='https://api.clickup.com/api/v2';
export const clickup:AppDefinition={id:'clickup',name:'ClickUp',category:'tasks',credential_url:'https://app.clickup.com/settings/apps',authHeader:token=>({Authorization:token}),verify:()=>({url:click+'/user',method:'GET'}),identity:b=>b.user?.email,operations:{
 list_workspaces:operation('List authorized ClickUp workspaces (called teams in API v2).',false,{},[],()=>({url:click+'/team',method:'GET'})),
 list_spaces:operation('List spaces in a workspace.',false,{team_id:id},['team_id'],a=>({url:click+'/team/'+encode(a.team_id)+'/space',method:'GET'})),
 list_lists:operation('List folderless task lists in a space.',false,{space_id:id},['space_id'],a=>({url:click+'/space/'+encode(a.space_id)+'/list',method:'GET'})),
 list_tasks:operation('List tasks in a list. Page numbers start at zero.',false,{list_id:id,page:{type:'integer',minimum:0},include_closed:{type:'boolean'}},['list_id'],({list_id,...query})=>({url:click+'/list/'+encode(list_id)+'/task',method:'GET',query})),
 get_task:operation('Read a ClickUp task.',false,{task_id:id},['task_id'],a=>({url:click+'/task/'+encode(a.task_id),method:'GET'})),
 create_task:operation('Create a task in a list. due_date is a Unix timestamp in milliseconds.',true,{list_id:id,name:string,description:string,priority:{type:'integer',minimum:1,maximum:4},due_date:{type:'integer',minimum:0}},['list_id','name'],({list_id,...body})=>({url:click+'/list/'+encode(list_id)+'/task',method:'POST',body})),
 update_task:operation('Update a task name, description or status.',true,{task_id:id,name:string,description:string,status:string},['task_id'],({task_id,...body})=>({url:click+'/task/'+encode(task_id),method:'PUT',body})),
 add_comment:operation('Post a comment to a task.',true,{task_id:id,text:string},['task_id','text'],a=>({url:click+'/task/'+encode(a.task_id)+'/comment',method:'POST',body:{comment_text:a.text}})),
}};
const trelloBase='https://api.trello.com/1';
export function trelloCredentials(value:string):{api_key:string;token:string}{try{const c=JSON.parse(value);if(typeof c.api_key!=='string'||typeof c.token!=='string'||!c.api_key||!c.token)throw Error();return {api_key:c.api_key,token:c.token};}catch{throw new ToolAuthenticationError();}}
export const trello:AppDefinition={id:'trello',name:'Trello',category:'tasks',credential_url:'https://trello.com/power-ups/admin',credential_fields:[{name:'api_key',label_key:'ui.app_trello_api_key'},{name:'token',label_key:'ui.app_trello_token'}],authHeader:value=>{const c=trelloCredentials(value);return {Authorization:`OAuth oauth_consumer_key="${encode(c.api_key)}", oauth_token="${encode(c.token)}"`};},verify:()=>({url:trelloBase+'/members/me',method:'GET'}),identity:b=>b.username,operations:{
 list_boards:operation('List boards visible to the authorized Trello member.',false,{},[],()=>({url:trelloBase+'/members/me/boards',method:'GET',query:{fields:'id,name,url,closed'}})),
 list_lists:operation('List lists in a board.',false,{board_id:id},['board_id'],a=>({url:trelloBase+'/boards/'+encode(a.board_id)+'/lists',method:'GET'})),
 list_cards:operation('List cards in a list.',false,{list_id:id},['list_id'],a=>({url:trelloBase+'/lists/'+encode(a.list_id)+'/cards',method:'GET'})),
 read_card:operation('Read a card by ID.',false,{card_id:id},['card_id'],a=>({url:trelloBase+'/cards/'+encode(a.card_id),method:'GET'})),
 create_card:operation('Create a card in a list with optional description.',true,{list_id:id,name:string,description:string},['list_id','name'],a=>({url:trelloBase+'/cards',method:'POST',body:{idList:a.list_id,name:a.name,desc:a.description}})),
 update_card:operation('Update or archive a card.',true,{card_id:id,name:string,desc:string,closed:{type:'boolean'}},['card_id'],({card_id,...body})=>({url:trelloBase+'/cards/'+encode(card_id),method:'PUT',body})),
 add_comment:operation('Post a comment on a card.',true,{card_id:id,text:string},['card_id','text'],a=>({url:trelloBase+'/cards/'+encode(a.card_id)+'/actions/comments',method:'POST',body:{text:a.text}})),
}};
export const projectManagementApps=[asana,airtable,clickup,trello];
