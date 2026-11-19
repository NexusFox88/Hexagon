import {it,expect} from 'vitest';
import {mkdtemp,mkdir,writeFile,symlink,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {inventory,publicBlockers} from './release-audit.js';
it('rejects private data, credential patterns and symlinks without printing values',async()=>{
 const root=await mkdtemp(join(tmpdir(),'hexagon-release-'));
 try{await mkdir(join(root,'.local'));await writeFile(join(root,'owner.json'),'private-owner');await writeFile(join(root,'app.js'),'ghp_'+'x'.repeat(30));await symlink('/etc/hosts',join(root,'link'));const result=await inventory(root,true);expect(result.findings.map(f=>f.code)).toEqual(expect.arrayContaining(['private_or_generated_directory','private_filename','possible_credential','symlink_not_allowed']));expect(JSON.stringify(result)).not.toContain('private-owner');expect(JSON.stringify(result.findings)).not.toContain('x'.repeat(30));}finally{await rm(root,{recursive:true,force:true});}
});
it('cannot certify a public release from empty policy or missing evidence',async()=>{
 const root=await mkdtemp(join(tmpdir(),'hexagon-policy-'));try{await writeFile(join(root,'release-policy.json'),'{}');expect(await publicBlockers(root)).toEqual(expect.arrayContaining(['project_license','license_text','private_security_contact','publication_approved','clean_install_evidence','cloud_journey_evidence']));}finally{await rm(root,{recursive:true,force:true});}
});
it('keeps documentation build sections and compiled SDK while rejecting stale Python build output',async()=>{
 const root=await mkdtemp(join(tmpdir(),'hexagon-layout-'));try{
  for(const dir of ['docs/product/en/build','sdk/typescript/dist','sdk/python/build'])await mkdir(join(root,dir),{recursive:true});
  await writeFile(join(root,'docs/product/en/build/tools.md'),'docs');await writeFile(join(root,'sdk/typescript/dist/index.js'),'export {}');
  const audit=await inventory(root,true);expect(audit.files.map(f=>f.path)).toEqual(expect.arrayContaining(['docs/product/en/build/tools.md','sdk/typescript/dist/index.js']));expect(audit.findings).toEqual([{path:'sdk/python/build',code:'private_or_generated_directory'}]);
 }finally{await rm(root,{recursive:true,force:true});}
});
