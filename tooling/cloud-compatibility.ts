import {readFile,writeFile,mkdir,open} from 'node:fs/promises';
import {resolve,join} from 'node:path';
import {pathToFileURL} from 'node:url';
import {randomUUID} from 'node:crypto';
import {spawn} from 'node:child_process';
import {Hexagon} from '../sdk/typescript/index.js';
import {compatibilityPlan} from './compatibility-plan.js';

// Connection IDs only. Provider/model credentials remain in the control plane.
if(!process.argv[2])throw Error('Usage: npm run verify:compatibility -- <private-config.json>');
const config=JSON.parse(await readFile(resolve(process.argv[2]),'utf8'));
const languages:string[]=config.clients??['python','typescript'];
if(!Array.isArray(languages)||!languages.length||new Set(languages).size!==languages.length||languages.some(l=>!['python','typescript'].includes(l)))throw Error('clients must select python, typescript, or both');
const packages=JSON.parse(await readFile('.local/evidence/sdk-packages.json','utf8'));
if(packages.state!=='verified')throw Error('Run verify:packages first');
const client=await Hexagon.local({dataDirectory:config.data_directory});
const catalog=await client.catalog();
const configuredConnections=new Map((await client.listConnections()).connections.map((connection:any)=>[connection.id,connection]));
const rows=compatibilityPlan(catalog).map(row=>({...row,attempts:[] as {language:string;exit_code:number;evidence:string}[]}));
const root=resolve('.local/evidence/compatibility-'+randomUUID());await mkdir(root,{mode:0o700});
const save=()=>writeFile(join(root,'matrix.json'),JSON.stringify({model:config.model_name,rows},null,2),{mode:0o600});
let stopping=false;process.on('SIGTERM',()=>{stopping=true;});process.on('SIGINT',()=>{stopping=true;});
await save();console.log({evidence:root,planned:rows.filter(r=>r.status==='unverified').length});
for(const row of rows){
 if(stopping)break;
 if(row.status!=='unverified')continue;
 if(config.cells&&!config.cells.includes([row.sandbox,row.harness,row.protocol].join('/')))continue;
 if(config.skip_cells?.includes([row.sandbox,row.harness,row.protocol].join('/')))continue;
 if(config.protocols&&!config.protocols.includes(row.protocol))continue;
 if(config.providers&&!config.providers.includes(row.sandbox))continue;
 if(config.harness_filter&&!config.harness_filter.includes(row.harness))continue;
 const sandbox=config.sandboxes[row.sandbox],model=config.models[row.protocol],harness=config.harnesses[row.harness];
 if(!sandbox||!model||!harness){row.status='unverified_configuration';await save();continue;}
 const sandboxConnection:any=configuredConnections.get(sandbox),modelConnection:any=configuredConnections.get(model);
 if(sandboxConnection?.provider!==row.sandbox||modelConnection?.provider!==row.protocol||modelConnection?.config?.model!==config.model_name){row.status='unverified_configuration';await save();continue;}
 const name=row.harness.replace(':','-'),directory=join(root,`${row.sandbox}-${name}-${row.protocol}`);await mkdir(directory,{mode:0o700});
 const input=join(directory,'config.json');await writeFile(input,JSON.stringify({data_directory:config.data_directory,sandbox,model,chat:model,model_by_harness:{[name]:model},tool:config.tool,harnesses:{[name]:harness},profile:row.scenarios.includes('remote_tool')?'tools':'conversation',evidence_directory:directory,run_timeout_ms:config.run_timeout_ms??900000}),{mode:0o600});
 for(const language of languages){
  const log=await open(join(directory,language+'.log'),'w',0o600);
  const child=spawn(language==='python'?'python3':process.execPath,language==='python'?['tooling/cloud-journey.py',name]:['--import','tsx','tooling/cloud-journey.ts',name],{env:{...process.env,HEXAGON_JOURNEY_CONFIG:input,PYTHONPATH:join(packages.root,'python'),HEXAGON_TEST_TS_MODULE:pathToFileURL(join(packages.root,'consumer/node_modules/@hexagon/agent-sdk/dist/index.js')).href},stdio:['ignore',log.fd,log.fd]});
  const code=await new Promise<number>((done,reject)=>{child.once('error',reject);child.once('exit',code=>done(code??1));});await log.close();
  row.attempts.push({language,exit_code:code,evidence:join(directory,`${name}-${language}.json`)});await save();
 }
 row.status=row.attempts.every(a=>a.exit_code===0)?(languages.length===2?'passed':'partially_verified'):'failed';await save();console.log({sandbox:row.sandbox,harness:row.harness,protocol:row.protocol,status:row.status});
}
await save();console.log({evidence:root,interrupted:stopping});if(rows.some(r=>r.status==='failed'||r.status==='unverified_configuration')||stopping)process.exitCode=1;
