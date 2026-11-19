import {readdir,readFile,lstat} from 'node:fs/promises';
import {join,relative} from 'node:path';
import {createHash} from 'node:crypto';

export type Finding={path:string;code:string};
export const sourceRoots=['apps','modules','runtime','integrations','protocols','sdk','tooling','testing','docs','examples','third_party','.github'];
const ignored=new Set(['node_modules','.git','.local','.venv','__pycache__','dist']);
const privateName=/(^|\/)(?:\.env(?:\..*)?|owner\.json|master\.key|deployment\.json|.*\.pem|.*\.p12|.*\.sqlite|.*\.dump|\.DS_Store)$/;
const suspicious=[/-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/,/\b(?:ghp_|github_pat_|sk_live_)[A-Za-z0-9_]{20,}/];
export async function inventory(root:string,artifact=false){
 const files:{path:string;sha256:string;bytes:number}[]=[],findings:Finding[]=[];
 async function walk(dir:string){for(const entry of (await readdir(dir,{withFileTypes:true})).sort((a,b)=>a.name.localeCompare(b.name))){
  const file=join(dir,entry.name),path=relative(root,file).replaceAll('\\','/');
  if(entry.isSymbolicLink()){findings.push({path,code:'symlink_not_allowed'});continue;}
  if(entry.isDirectory()){
   if((ignored.has(entry.name)&&!(artifact&&path==='sdk/typescript/dist'))||entry.name.endsWith('.egg-info')||path==='sdk/python/build'){if(artifact)findings.push({path,code:'private_or_generated_directory'});continue;}
   // Source evidence screenshots/logs require human review; do not include them in release artifacts.
   if(!artifact&&path==='testing/evidence')continue;
   await walk(file);continue;
  }
  if(privateName.test(path)&&!path.endsWith('.env.example')){findings.push({path,code:'private_filename'});continue;}
  if(path.endsWith('.pyc')){if(artifact)findings.push({path,code:'python_cache'});continue;}
  const bytes=await readFile(file);if(suspicious.some(pattern=>pattern.test(bytes.toString('utf8'))))findings.push({path,code:'possible_credential'});
  files.push({path,sha256:createHash('sha256').update(bytes).digest('hex'),bytes:bytes.length});
 }}
 if(artifact)await walk(root);else{
  for(const dir of sourceRoots){try{await walk(join(root,dir));}catch(e){if((e as NodeJS.ErrnoException).code!=='ENOENT')throw e;}}
  for(const ent of await readdir(root,{withFileTypes:true})){if(!ent.isFile()||!/^([A-Z][A-Z_.-]*|package(?:-lock)?\.json|release-policy\.json|tsconfig.*\.json|vitest\.config\.ts|\.gitignore)$/.test(ent.name))continue;const bytes=await readFile(join(root,ent.name));files.push({path:ent.name,sha256:createHash('sha256').update(bytes).digest('hex'),bytes:bytes.length});}
 }
 return {files,findings};
}
export async function verifyProvenance(root:string){
 const findings:Finding[]=[];
 for(const dir of ['third_party/activepieces','third_party/activepieces/expansion']){
  const data=JSON.parse(await readFile(join(root,dir,'provenance.json'),'utf8'));
  for(const file of data.files){if(typeof file.file!=='string'||file.file.includes('..')||file.file.includes('/'))throw Error('invalid_provenance_path');const bytes=await readFile(join(root,dir,file.file));if(createHash('sha256').update(bytes).digest('hex')!==file.sha256)findings.push({path:join(dir,file.file),code:'provenance_hash_mismatch'});}
 }
 return findings;
}
export async function publicBlockers(root:string){
 const policy=JSON.parse(await readFile(join(root,'release-policy.json'),'utf8'));const blockers:string[]=[];
 if(policy.project_license!=='Apache-2.0')blockers.push('project_license');
 try{if(!(await readFile(join(root,'LICENSE'),'utf8')).includes('Version 2.0, January 2004'))blockers.push('license_text');}catch{blockers.push('license_text');}
 if(typeof policy.private_security_contact!=='string'||! /^(https:\/\/|mailto:)/.test(policy.private_security_contact))blockers.push('private_security_contact');
 for(const flag of ['third_party_review_complete','artifact_review_complete','repository_and_package_ownership_confirmed','publication_approved'])if(policy[flag]!==true)blockers.push(flag);
 for(const key of ['clean_install_evidence','cloud_journey_evidence']){
  const path=policy[key];if(typeof path!=='string'||!path.startsWith('testing/evidence/')||path.includes('..')){blockers.push(key);continue;}
  try{if(!(await lstat(join(root,path))).isFile())blockers.push(key);}catch{blockers.push(key);}
 }
 return blockers;
}
