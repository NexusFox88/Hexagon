import {mkdtemp,cp,mkdir,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {spawn} from 'node:child_process';
import {harnessTemplates} from '../modules/harnesses/templates.js';
const selected=process.argv[2]??'all';
for(const template of harnessTemplates.filter(t=>selected==='all'||t.id===selected)){
 const context=await mkdtemp(join(tmpdir(),'hexagon-image-build-'));
 try{
  await cp(template.recipe,join(context,'Dockerfile'));
  if(template.id==='custom-python'){await mkdir(join(context,'examples/harnesses/python-agent'),{recursive:true});await cp('examples/harnesses/python-agent/main.py',join(context,'examples/harnesses/python-agent/main.py'));}
  const status=await new Promise<number|null>((resolve,reject)=>{const child=spawn('docker',['build','--platform=linux/amd64','--tag',`hexagon-local/${template.id}:${template.version}`,context],{stdio:'inherit'});child.on('error',reject);child.on('exit',resolve);});
  if(status!==0)throw new Error(`Image build failed: ${template.id}`);
 }finally{await rm(context,{recursive:true,force:true});}
}
