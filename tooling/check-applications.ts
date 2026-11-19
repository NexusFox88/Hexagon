import {writeFile,mkdir} from 'node:fs/promises';
import {application,applicationRequest} from '../integrations/apps/registry.js';
import {localTestCredential} from './local-test-credentials.js';
const rows:any[]=[];
for(const [provider,key,operation,args] of [['exa','EXA_API','search',{query:'official Model Context Protocol documentation'}],['tavily','TAVILY_API_KEY','search',{query:'official Model Context Protocol documentation',max_results:2}],['deepl','DEEPL_API_KEY','translate_text',{text:'你好，世界。',target_lang:'EN-US'}]] as const){
 try{const credential=await localTestCredential(key,'shell');const app=application(provider)!;const config=provider==='deepl'?{region:credential.endsWith(':fx')?'free':'paid'}:{};
 await applicationRequest(app,credential,app.verify(config));const value=await applicationRequest(app,credential,app.operations[operation]!.request(args,config));
 if(!value||JSON.stringify(value).includes(credential))throw new Error('invalid_or_unredacted_result');rows.push({provider,verification:'passed',operation,result_keys:Object.keys(value),state:'passed'});
 }catch(error){rows.push({provider,state:'failed',code:error instanceof Error?error.message:'unknown'});}
}
await mkdir('.local/evidence',{recursive:true});await writeFile('.local/evidence/application-real-api.json',JSON.stringify(rows,null,2),{mode:0o600});console.log(JSON.stringify(rows));if(rows.some(r=>r.state!=='passed'))process.exitCode=1;
