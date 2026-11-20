import fs from 'node:fs';import path from 'node:path';import {fileURLToPath} from 'node:url';import {Resvg} from '@resvg/resvg-js';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../../..');
for(const theme of ['dark','light']){
 const folder=path.join(root,'.local/gtm-motion',theme);
 for(const file of fs.readdirSync(folder).filter(f=>f.endsWith('.svg'))){fs.writeFileSync(path.join(folder,file.replace('.svg','.png')),new Resvg(fs.readFileSync(path.join(folder,file))).render().asPng());}
 fs.copyFileSync(path.join(folder,'0024.png'),path.join(root,`brand-assets/gtm/motion/formation-${theme}-poster.png`));
}
