import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';
import {Resvg} from '@resvg/resvg-js';
const base=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const root=path.resolve(base,'../..');
for(const theme of ['dark','light']){
 const dir=path.join(root,'.local/gtm-flyby',theme);
 for(const f of fs.readdirSync(dir).filter(f=>f.endsWith('.svg')))fs.writeFileSync(path.join(dir,f.replace('.svg','.png')),new Resvg(fs.readFileSync(path.join(dir,f))).render().asPng());
 fs.copyFileSync(path.join(dir,'0000.png'),path.join(base,`motion/flyby-${theme}-poster.png`));
 const r=spawnSync('ffmpeg',['-y','-framerate','12','-i',path.join(dir,'%04d.png'),'-vf','fps=24','-c:v','libx264','-pix_fmt','yuv420p','-movflags','+faststart',path.join(base,`motion/flyby-${theme}.mp4`)],{encoding:'utf8'});
 if(r.status!==0)throw Error(r.stderr);
 console.log(`Rendered ${theme} flyby: 1280x720, 4 seconds, 24 fps`);
}
