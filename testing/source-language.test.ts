import {readdir,readFile} from 'node:fs/promises';
import {join,relative} from 'node:path';
import {expect,it} from 'vitest';

// Documentation may be multilingual. Executable source and configuration use
// English; localization and Unicode fixtures use escaped literals when needed.
const excluded=new Set(['.git','.local','.venv','node_modules','dist','__pycache__','build','test-results','playwright-report']);
const textExtensions=/\.(?:[cm]?[jt]sx?|py|json|html|css|svg|ya?ml|toml|sh|sql|txt)$/i;
const han=/[\p{Script=Han}\u3000-\u303f\uff00-\uffef]/u;
it('keeps Chinese characters out of non-documentation source and configuration',async()=>{
 const root=process.cwd(),violations:string[]=[];
 async function walk(dir:string){for(const entry of await readdir(dir,{withFileTypes:true})){
  const path=join(dir,entry.name),name=relative(root,path);
  if(entry.isSymbolicLink())continue;
  if(entry.isDirectory()){if(excluded.has(entry.name)||entry.name.endsWith('.egg-info')||name==='testing/evidence')continue;await walk(path);continue;}
  if(/\.mdx?$/i.test(entry.name)||/^readme(?:\.|$)/i.test(entry.name))continue;
  if(han.test(name))violations.push(name+': filename');
  if(!textExtensions.test(entry.name)&&!['.gitignore','Dockerfile'].includes(entry.name))continue;
  const text=await readFile(path,'utf8');text.split('\n').forEach((line,index)=>{if(han.test(line))violations.push(`${name}:${index+1}`);});
 }}
 await walk(root);expect(violations).toEqual([]);
});
