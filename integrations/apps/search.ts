// Tavily search mapping adapted from Activepieces (MIT), third_party/activepieces/.
import {type AppDefinition,operation,string} from './types.js';
export const tavily:AppDefinition={id:'tavily',name:'Tavily',category:'search',credential_url:'https://app.tavily.com/',verify:()=>({url:'https://api.tavily.com/usage',method:'GET'}),operations:{
 search:operation('Search the web for a query and return source URLs and snippets.',false,{query:string,search_depth:{type:'string',enum:['basic','advanced']},topic:{type:'string',enum:['general','news']},max_results:{type:'integer',minimum:1,maximum:20}},['query'],a=>({url:'https://api.tavily.com/search',method:'POST',body:a})),
 extract:operation('Extract content from known public URLs.',false,{urls:{type:'array',items:{type:'string',pattern:'^https?://',maxLength:2048},minItems:1,maxItems:10}},['urls'],a=>({url:'https://api.tavily.com/extract',method:'POST',body:a})),
}};
export const exa:AppDefinition={id:'exa',name:'Exa',category:'search',credential_url:'https://dashboard.exa.ai/api-keys',authHeader:token=>({'x-api-key':token}),
 verify:()=>({url:'https://api.exa.ai/search',method:'POST',body:{query:'Exa API documentation',type:'auto'}}),operations:{
 search:operation('Search the web with Exa and return source URLs and content highlights.',false,{query:string},['query'],a=>({url:'https://api.exa.ai/search',method:'POST',body:{query:a.query,type:'auto',contents:{highlights:true}}})),
 contents:operation('Read highlights from known web URLs.',false,{urls:{type:'array',items:{type:'string',pattern:'^https?://',maxLength:2048},minItems:1,maxItems:10}},['urls'],a=>({url:'https://api.exa.ai/contents',method:'POST',body:{ids:a.urls,highlights:true}})),
}};
