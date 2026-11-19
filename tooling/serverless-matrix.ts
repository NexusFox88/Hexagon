/** Evidence ledger: no capability or historical execution result implies resume verification. */
import {readFile,writeFile} from 'node:fs/promises';
import {Hexagon} from '../sdk/typescript/index.js';
interface MatrixRow {sandbox:string;harness:string;language:string;status:string;protocol:string|null;checks:Record<string,boolean>|null;error?:string}
const client=await Hexagon.local(),catalog=await client.catalog(),rows:MatrixRow[]=[];
for(const provider of catalog.connections.filter((p:any)=>p.kind==='sandbox'&&p.provider!=='daytona')){
 for(const harness of ['opencode','oci-codex','oci-hermes','oci-openclaw','oci-opencode']){
  const unsupported=harness.startsWith('oci-')&&!provider.capabilities.includes('oci_image');
  let report:any;try{report=JSON.parse(await readFile(`.local/serverless-harness-acceptance/${provider.provider}-${harness}.json`,'utf8'));}catch{}
  for(const language of ['python','typescript']){
   const j=report?.journeys.find((j:any)=>j.language===language);
   rows.push({sandbox:provider.provider,harness,language,status:unsupported?'unsupported_oci_provider':j?.passed&&j?.cleanup==='closed'?'passed':j?.error?'failed':'unverified',protocol:j?.protocol??null,checks:j?.passed?{idle:j.auto_slept,wake:j.auto_woke,file:j.file_verified,native_session:j.native_reused,conversation:j.context_retained,closed:j.cleanup==='closed'}:null,...(j?.error?{error:j.error}:{})});
  }
 }
}
await writeFile('testing/evidence/2026-11-19-harness-serverless-matrix.json',JSON.stringify({checked_at:new Date().toISOString(),model:'MiniMax-M3',rows},null,2)+'\n');
console.log(Object.fromEntries(['passed','failed','unverified','unsupported_oci_provider'].map(s=>[s,rows.filter(r=>r.status===s).length])));
