import {mcpOperations,executeMcp} from '../../integrations/mcp/remote.js';
import {application,applicationOperations,applicationRequest,AppRequestError} from '../../integrations/apps/registry.js';
import {httpToolConfig,httpToolRequest} from '../../integrations/tools/http-json.js';
export function toolOperations(provider:string,config:Record<string,unknown>){
 if(provider==='mcp-remote')return mcpOperations(config);
 if(provider==='http-json')return httpToolConfig.parse(config).operations;
 const app=application(provider);if(!app)throw new Error('tool_provider_unsupported');return applicationOperations(app,config);
}
export async function executeTool(provider:string,config:Record<string,unknown>,credential:string,operation:string,args:Record<string,unknown>,call:string){
 if(provider==='mcp-remote')return executeMcp(config,credential,operation,args);
 if(provider==='http-json')return httpToolRequest(httpToolConfig.parse(config),credential,operation,args,call);
 const app=application(provider),op=app?.operations[operation];if(!app||!op||!Object.hasOwn(toolOperations(provider,config),operation))throw new Error('tool_operation_unavailable');
 let request;try{request=op.request(args,config);}catch{throw new AppRequestError('app_arguments_invalid',400);}
 return applicationRequest(app,credential,request,{write:op.write});
}
