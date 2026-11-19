import {it,expect} from 'vitest';
import {mkdtemp,writeFile,readFile,rm} from 'node:fs/promises';
import {join} from 'node:path';import {tmpdir} from 'node:os';
import {consoleRelease} from '../modules/deployment/console-release.js';
it('pins markup, styles and scripts to one immutable release while source changes',async()=>{
 const source=await mkdtemp(join(tmpdir(),'hexagon-release-source-'));let release:{root:string;version:string}|undefined;
 try{await writeFile(join(source,'index.html'),'<html><head></head></html>');await writeFile(join(source,'style.css'),'body{color:black}');release=await consoleRelease(source);await writeFile(join(source,'style.css'),'body{color:red}');expect(await readFile(join(release.root,'style.css'),'utf8')).toBe('body{color:black}');expect(await readFile(join(release.root,'index.html'),'utf8')).toContain(release.version);}finally{await rm(source,{recursive:true,force:true});if(release)await rm(release.root,{recursive:true,force:true});}
});
