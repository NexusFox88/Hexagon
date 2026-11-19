import {cp,mkdir,mkdtemp,readFile,writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join,dirname} from 'node:path';
import {createRequire} from 'node:module';
const resolveModule=createRequire(import.meta.url).resolve;
import {randomUUID} from 'node:crypto';
/** Serve one immutable frontend release per process, never half-written working files. */
export async function consoleRelease(source:string){
 const root=await mkdtemp(join(tmpdir(),'hexagon-console-')),version=randomUUID();
 await cp(source,root,{recursive:true});
 await mkdir(join(root,'vendor'),{recursive:true});
 const markdown=resolveModule('marked');
 await cp(markdown,join(root,'vendor','marked.js'));
 await cp(join(dirname(markdown),'../LICENSE'),join(root,'vendor','marked.LICENSE.md'));
 const index=join(root,'index.html');await writeFile(index,(await readFile(index,'utf8')).replace('<head>',`<head><meta name="hexagon-console-release" content="${version}">`));
 return {root,version};
}
