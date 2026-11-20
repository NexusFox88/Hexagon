import fs from 'node:fs';import path from 'node:path';import assert from 'node:assert/strict';import {fileURLToPath} from 'node:url';
const base=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const read=f=>JSON.parse(fs.readFileSync(path.join(base,f)));
const index=read('index.generated.json'),ids=new Set();
for(const a of index.assets){
 assert(!ids.has(a.id),'Duplicate asset '+a.id);ids.add(a.id);
 const svg=fs.readFileSync(path.join(base,a.file),'utf8');
 assert(svg.includes('<svg')&&svg.includes('</svg>'),a.file);
 assert(!svg.includes('<script')&&!svg.includes('<text'),a.file+' must use outlined text');
 assert(!/[\p{Script=Han}]/u.test(svg),a.file+' must be English');
 assert(!/Your agents\.|Your infrastructure\./.test(svg),a.file+' legacy headline');
 if(a.export){const png=fs.readFileSync(path.join(base,a.export));assert.equal(png.readUInt32BE(16),a.width,a.export);assert.equal(png.readUInt32BE(20),a.height,a.export);}
 if(a.evidence)assert(fs.existsSync(path.resolve(base,a.evidence)),a.evidence);
 if(a.capture)assert(fs.existsSync(path.resolve(base,'..',a.capture)),a.capture);
 if(a.claim_type==='real-product-framing')assert(a.provenance&&a.limits,'Missing product limits');
}
const expected={'concept-component':16,'concept-card':48,'campaign-template':60,'carousel-slide':10,'product-story':14,'website-story':12,'website-component':4};
for(const [kind,count]of Object.entries(expected))assert.equal(index.assets.filter(a=>a.kind===kind).length,count,kind);
for(const c of read('claims.json').claims)for(const f of c.sources)assert(fs.existsSync(path.resolve(base,f)),f);
const provenance=read('product/provenance.json');assert.equal(provenance.stories.length,7);
for(const s of provenance.stories){assert(fs.existsSync(path.resolve(base,'product',s.capture)),s.capture);for(const e of s.evidence)assert(fs.existsSync(path.resolve(base,'product',e)),e);}
for(const family of ['formation','flyby'])for(const theme of ['dark','light'])for(const ext of ['svg'])assert(fs.statSync(path.join(base,`motion/${family}-${theme}.${ext}`)).size>0);
assert(read('asset-index.json').assets.every(a=>!a.file.toLowerCase().endsWith('.mp4')),'MP4 exports must remain local');
console.log(`PASS: ${index.assets.length} indexed SVGs, ${index.assets.filter(a=>a.export).length} dimension-checked PNGs, 7 sourced stories, claim references and public animation assets; MP4 excluded`);
