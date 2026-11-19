// Fixed request mappings from the providers' public API references; see docs/application-connectors.md.
import {type AppDefinition,operation,string,id,page,encode} from './types.js';
const webUrl={type:'string',pattern:'^https?://',maxLength:2048};
export const firecrawl:AppDefinition={id:'firecrawl',name:'Firecrawl',category:'search',credential_url:'https://www.firecrawl.dev/app/api-keys',verify:()=>({url:'https://api.firecrawl.dev/v2/team/credit-usage',method:'GET'}),operations:{
 scrape_page:operation('Scrape a public page into Markdown. Consumes Firecrawl credits.',false,{url:webUrl},['url'],a=>({url:'https://api.firecrawl.dev/v2/scrape',method:'POST',body:{url:a.url,formats:['markdown']}})),
 map_site:operation('Discover URLs on a public website with a bounded result limit. Consumes credits.',false,{url:webUrl,search:string,limit:{type:'integer',minimum:1,maximum:100}},['url'],a=>({url:'https://api.firecrawl.dev/v2/map',method:'POST',body:{...a,limit:a.limit??20}})),
}};
export const brave:AppDefinition={id:'brave-search',name:'Brave Search',category:'search',credential_url:'https://api-dashboard.search.brave.com/app/keys',authHeader:key=>({'X-Subscription-Token':key}),verify:()=>({url:'https://api.search.brave.com/res/v1/web/search',method:'GET',query:{q:'Brave Search API',count:1}}),operations:{
 web_search:operation('Search the web with Brave. Results include titles, links and snippets; consumes API quota.',false,{query:string,count:{type:'integer',minimum:1,maximum:20},offset:{type:'integer',minimum:0,maximum:9}},['query'],a=>({url:'https://api.search.brave.com/res/v1/web/search',method:'GET',query:{q:a.query,count:a.count??10,offset:a.offset??0}})),
}};
const apifyBase='https://api.apify.com/v2';
export const apify:AppDefinition={id:'apify',name:'Apify',category:'development',credential_url:'https://console.apify.com/settings/integrations',verify:()=>({url:apifyBase+'/users/me',method:'GET'}),identity:b=>b.data?.username,operations:{
 list_actors:operation('List actors belonging to this account. Follow offset for further pages.',false,{offset:{type:'integer',minimum:0},limit:page},[],a=>({url:apifyBase+'/acts',method:'GET',query:{...a,limit:a.limit??20}})),
 start_actor:operation('Start an Actor asynchronously. May incur charges and external side effects; requires approval. Read its run ID to follow completion.',true,{actor_id:id,input:{type:'object',additionalProperties:true}},['actor_id','input'],a=>({url:apifyBase+'/acts/'+encode(a.actor_id)+'/runs',method:'POST',body:a.input})),
 read_actor_run:operation('Read Actor run state, including its default dataset ID.',false,{run_id:id},['run_id'],a=>({url:apifyBase+'/actor-runs/'+encode(a.run_id),method:'GET'})),
 read_dataset:operation('Read a bounded page of JSON dataset items.',false,{dataset_id:id,offset:{type:'integer',minimum:0},limit:page},['dataset_id'],({dataset_id,...query})=>({url:apifyBase+'/datasets/'+encode(dataset_id)+'/items',method:'GET',query:{...query,limit:query.limit??20,format:'json'}})),
}};
const git='https://gitlab.com/api/v4';
export const gitlab:AppDefinition={id:'gitlab',name:'GitLab',category:'development',credential_url:'https://gitlab.com/-/user_settings/personal_access_tokens',authHeader:key=>({'PRIVATE-TOKEN':key}),verify:()=>({url:git+'/user',method:'GET'}),identity:b=>b.username,operations:{
 list_projects:operation('List GitLab.com projects accessible through membership.',false,{search:string,page:{type:'integer',minimum:1},per_page:page},[],a=>({url:git+'/projects',method:'GET',query:{...a,membership:true,per_page:a.per_page??20}})),
 list_issues:operation('List issues in a GitLab.com project; project_id accepts a numeric ID or namespace/project.',false,{project_id:id,page:{type:'integer',minimum:1},per_page:page},['project_id'],({project_id,...query})=>({url:git+'/projects/'+encode(project_id)+'/issues',method:'GET',query:{...query,per_page:query.per_page??20}})),
 create_issue:operation('Create an issue in a GitLab.com project.',true,{project_id:id,title:{...string,maxLength:255},description:string},['project_id','title'],({project_id,...body})=>({url:git+'/projects/'+encode(project_id)+'/issues',method:'POST',body})),
}};
export const readwise:AppDefinition={id:'readwise',name:'Readwise Reader',category:'knowledge',credential_url:'https://readwise.io/access_token',authHeader:key=>({Authorization:`Token ${key}`}),verify:()=>({url:'https://readwise.io/api/v2/auth/',method:'GET'}),operations:{
 list_documents:operation('List Reader documents. Use nextPageCursor from the response as pageCursor.',false,{pageCursor:string,updatedAfter:string,location:{type:'string',enum:['new','later','archive','feed']},withHtmlContent:{type:'boolean'}},[],a=>({url:'https://readwise.io/api/v3/list/',method:'GET',query:a})),
 save_document:operation('Save a URL to Readwise Reader. Existing documents may be updated.',true,{url:webUrl,title:string,tags:{type:'array',items:string,maxItems:20}},['url'],a=>({url:'https://readwise.io/api/v3/save/',method:'POST',body:a})),
}};
export const researchDevelopmentApps=[firecrawl,brave,apify,gitlab,readwise];
