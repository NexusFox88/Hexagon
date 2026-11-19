import {type AppDefinition,operation,string,id,page,encode} from './types.js';
const gh='https://api.github.com';
const repo=(a:Record<string,any>)=>`${gh}/repos/${encode(a.owner)}/${encode(a.repo)}`;
const repoArgs={owner:id,repo:id};
export const github:AppDefinition={id:'github',name:'GitHub',category:'development',credential_url:'https://github.com/settings/personal-access-tokens',headers:{Accept:'application/vnd.github+json','X-GitHub-Api-Version':'2022-11-28'},verify:()=>({url:`${gh}/user`,method:'GET'}),identity:b=>b.login,
 oauth:{authorize:'https://github.com/login/oauth/authorize',token:'https://github.com/login/oauth/access_token',issuer:'https://github.com',pkce:true,client_auth:'post',scopes:['repo','read:user']},operations:{
 list_repositories:operation('List repositories accessible to the authenticated account.',false,{page:page,per_page:page},[],a=>({url:`${gh}/user/repos`,method:'GET',query:a})),
 list_issues:operation('List repository issues and pull requests.',false,{...repoArgs,state:{type:'string',enum:['open','closed','all']},page:page},['owner','repo'],a=>({url:`${repo(a)}/issues`,method:'GET',query:{state:a.state,page:a.page}})),
 read_issue:operation('Read an issue or pull request.',false,{...repoArgs,issue_number:{type:'integer',minimum:1}},['owner','repo','issue_number'],a=>({url:`${repo(a)}/issues/${a.issue_number}`,method:'GET'})),
 read_file:operation('Read a repository file; content may be base64 encoded.',false,{...repoArgs,path:{...string,pattern:'^(?!.*(?:^|/)\\.{1,2}(?:/|$)).+'},ref:string},['owner','repo','path'],a=>({url:`${repo(a)}/contents/${a.path.split('/').map(encode).join('/')}`,method:'GET',query:{ref:a.ref}})),
 create_issue:operation('Create a repository issue.',true,{...repoArgs,title:string,body:string},['owner','repo','title'],a=>({url:`${repo(a)}/issues`,method:'POST',body:{title:a.title,body:a.body}})),
 add_comment:operation('Post a comment to an issue or pull request.',true,{...repoArgs,issue_number:{type:'integer',minimum:1},body:string},['owner','repo','issue_number','body'],a=>({url:`${repo(a)}/issues/${a.issue_number}/comments`,method:'POST',body:{body:a.body}})),
}};
const slackBase='https://slack.com/api';
export const slack:AppDefinition={id:'slack',name:'Slack',category:'communication',credential_url:'https://api.slack.com/apps',verify:()=>({url:`${slackBase}/auth.test`,method:'POST'}),identity:b=>b.team&&b.user?`${b.team} / ${b.user}`:undefined,
 oauth:{authorize:'https://slack.com/oauth/v2/authorize',token:`${slackBase}/oauth.v2.access`,issuer:'https://slack.com',pkce:false,client_auth:'basic',scope_separator:',',scopes:['channels:read','channels:history','groups:read','groups:history','chat:write']},operations:{
 list_channels:operation('List channels visible to the connected Slack bot.',false,{cursor:string,limit:page},[],a=>({url:`${slackBase}/conversations.list`,method:'GET',query:a})),
 read_history:operation('Read channel messages visible to this connection.',false,{channel:id,cursor:string,limit:page},['channel'],a=>({url:`${slackBase}/conversations.history`,method:'GET',query:a})),
 read_thread:operation('Read replies where the connected token has access; bot access varies by conversation type.',false,{channel:id,ts:string,cursor:string},['channel','ts'],a=>({url:`${slackBase}/conversations.replies`,method:'GET',query:a})),
 post_message:operation('Send a message as the connected Slack app. Confirm channel and text.',true,{channel:id,text:string,thread_ts:string},['channel','text'],a=>({url:`${slackBase}/chat.postMessage`,method:'POST',body:a})),
}};
const graph=(query:string,variables:Record<string,unknown>={})=>({url:'https://api.linear.app/graphql',method:'POST',body:{query,variables}});
export const linear:AppDefinition={id:'linear',name:'Linear',category:'tasks',credential_url:'https://linear.app/settings/api',authHeader:token=>({Authorization:token.startsWith('lin_api_')?token:`Bearer ${token}`}),verify:()=>graph('{ viewer { id name email } }'),identity:b=>b.data?.viewer?.email,
 oauth:{authorize:'https://linear.app/oauth/authorize',token:'https://api.linear.app/oauth/token',issuer:'https://linear.app',pkce:true,client_auth:'post',scopes:['read','write']},operations:{
 list_teams:operation('List accessible Linear teams.',false,{},[],()=>graph('{ teams(first:100) { nodes { id name key } } }')),
 list_issues:operation('List Linear issues. Use endCursor to request another page.',false,{after:string},[],a=>graph('query($after:String){issues(first:50,after:$after){nodes{id identifier title description url} pageInfo{hasNextPage endCursor}}}',a)),
 read_issue:operation('Read one Linear issue by ID or identifier.',false,{issue_id:id},['issue_id'],a=>graph('query($id:String!){issue(id:$id){id identifier title description url}}',{id:a.issue_id})),
 create_issue:operation('Create a Linear issue in a team.',true,{team_id:id,title:string,description:string},['team_id','title'],a=>graph('mutation($input:IssueCreateInput!){issueCreate(input:$input){success issue{id identifier url}}}',{input:{teamId:a.team_id,title:a.title,description:a.description}})),
 update_issue:operation('Update a Linear issue title or description.',true,{issue_id:id,title:string,description:string},['issue_id'],({issue_id,...input})=>graph('mutation($id:String!,$input:IssueUpdateInput!){issueUpdate(id:$id,input:$input){success issue{id url}}}',{id:issue_id,input})),
 add_comment:operation('Add a comment to a Linear issue.',true,{issue_id:id,body:string},['issue_id','body'],a=>graph('mutation($input:CommentCreateInput!){commentCreate(input:$input){success comment{id}}}',{input:{issueId:a.issue_id,body:a.body}})),
}};
