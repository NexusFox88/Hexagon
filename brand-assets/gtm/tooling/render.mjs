import fs from 'node:fs';
import {createHash} from 'node:crypto';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {Resvg} from '@resvg/resvg-js';
const base=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const data=JSON.parse(fs.readFileSync(path.join(base,'index.generated.json')));
for(const a of data.assets){
 if(a.export&&(!fs.existsSync(path.join(base,a.export))||fs.statSync(path.join(base,a.file)).mtimeMs>fs.statSync(path.join(base,a.export)).mtimeMs))fs.writeFileSync(path.join(base,a.export),new Resvg(fs.readFileSync(path.join(base,a.file))).render().asPng());
}
const groups={website:data.assets.filter(a=>a.kind==='website-story'),concepts:data.assets.filter(a=>a.kind==='concept-card'&&a.file.includes('wide-')),templates:data.assets.filter(a=>a.kind==='campaign-template'&&a.theme==='dark'),carousel:data.assets.filter(a=>a.kind==='carousel-slide'&&a.theme==='dark'),product:data.assets.filter(a=>a.kind==='product-story')};
for(const name of ['launch','feature','code','explainer','carousel','release'])groups['template-'+name]=data.assets.filter(a=>a.kind==='campaign-template'&&a.template===name);
for(const [name,assets] of Object.entries(groups)){
 if(!assets.length)continue;
 const cols=name==='carousel'?5:2,cw=name==='carousel'?216:640;let y=0,body='';
 for(let i=0;i<assets.length;i+=cols){
  let rh=0;
  for(let j=0;j<cols&&assets[i+j];j++){
   const a=assets[i+j],h=a.height*cw/a.width;rh=Math.max(rh,h);
   body+=`<image x="${j*cw}" y="${y}" width="${cw}" height="${h}" href="data:image/png;base64,${fs.readFileSync(path.join(base,a.export)).toString('base64')}"/>`;
  }y+=rh+8;
 }
 const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="${cols*cw}" height="${Math.ceil(y)}">${body}</svg>`;
 fs.writeFileSync(path.join(base,`previews/${name}.png`),new Resvg(svg).render().asPng());
}
const escape=s=>s.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('"','&quot;');
const cards=data.assets.filter(a=>a.export).map(a=>`<article data-kind="${a.kind}" data-theme="${a.theme}" data-text="${escape(a.alt.toLowerCase())}"><a href="${a.export}"><img loading="lazy" src="${a.export}" alt="${escape(a.alt)}" width="${a.width}" height="${a.height}"></a><h2>${escape(a.alt)}</h2><p>${a.kind} · ${a.theme} · ${a.width} × ${a.height}</p><a href="${a.file}">SVG source</a> · <a href="${a.export}" download>PNG export</a></article>`).join('');
fs.writeFileSync(path.join(base,'index.html'),`<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Hexagon / GTM studio</title><style>*{box-sizing:border-box}body{margin:0;background:#101112;color:#f4f4f1;font:16px system-ui}header{padding:40px 5vw;border-bottom:1px solid #333}h1{font-size:36px;margin:0 0 12px}p{color:#aaa}nav{display:flex;flex-wrap:wrap;gap:8px;padding:16px 5vw;position:sticky;top:0;background:#101112;z-index:2}button,input{background:#202224;color:inherit;border:1px solid #555;padding:10px 16px;font:inherit}button{cursor:pointer}button[aria-pressed=true]{background:#f4f4f1;color:#111}button:focus-visible,a:focus-visible,input:focus-visible{outline:3px solid #9cf;outline-offset:3px}main{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:32px;padding:24px 5vw}article{min-width:0}article img{width:100%;height:230px;object-fit:contain;background:#191b1c}h2{font-size:17px}a{color:inherit}footer{padding:40px 5vw}article[hidden]{display:none}@media(max-width:900px){main{grid-template-columns:repeat(2,minmax(0,1fr))}}@media(max-width:560px){main{grid-template-columns:1fr}h1{font-size:28px}input{width:100%}}</style><header><h1>Hexagon / GTM studio</h1><p>Your agent fleet. Your infrastructure stack.</p><a href="README.md">Start here</a> · <a href="AGENT-GUIDE.md">Agent guide</a> · <a href="asset-index.json">Asset index</a></header><nav aria-label="Filter assets"><input aria-label="Search assets" placeholder="Search the collection"><button aria-pressed="true" data-filter="all">All</button><button aria-pressed="false" data-filter="website-story">Website story</button><button aria-pressed="false" data-filter="concept-card">Concepts</button><button aria-pressed="false" data-filter="campaign-template">Templates</button><button aria-pressed="false" data-filter="carousel-slide">Carousel</button><button aria-pressed="false" data-filter="product-story">Product</button></nav><p id="results" role="status" style="padding:0 5vw"></p><main>${cards}</main><footer>Local asset workbench. Illustrations are not execution evidence. See each product story for provenance.</footer><script>let filter='all';function apply(){const q=document.querySelector('input').value.toLowerCase();document.querySelectorAll('article').forEach(a=>a.hidden=(filter!=='all'&&a.dataset.kind!==filter)||!a.dataset.text.includes(q));const count=[...document.querySelectorAll('article')].filter(a=>!a.hidden).length;document.querySelector('#results').textContent=count?count+' assets':'No matching assets. Try a different topic or filter.';}document.querySelector('input').addEventListener('input',apply);document.querySelectorAll('button').forEach(b=>b.addEventListener('click',()=>{filter=b.dataset.filter;document.querySelectorAll('button').forEach(x=>x.setAttribute('aria-pressed',String(x===b)));apply();}));apply();</script></html>`);
console.log(`Rendered ${data.assets.filter(a=>a.export).length} PNG exports and local gallery`);

const media=[];
for(const theme of ['dark','light'])for(const suffix of ['.svg','-poster.png']){const file=`motion/flyby-${theme}${suffix}`;if(fs.existsSync(path.join(base,file)))media.push({id:`motion.flyby.${theme}.${suffix}`,file,kind:'brand-motion',theme,width:1280,height:720,claim_type:'illustration',source:'tooling/website-motion.py',visual_source:'WEBSITE-REUSE.md',duration_seconds:suffix==='-poster.png'?null:4});}
for(const theme of ['dark','light'])for(const suffix of ['.svg','-poster.png'])media.push({id:`motion.formation.${theme}.${suffix}`,file:`motion/formation-${theme}${suffix}`,kind:'brand-motion',theme,width:1280,height:720,claim_type:'illustration',source:'tooling/motion.py',duration_seconds:suffix==='-poster.png'?null:4});
for(const file of fs.readdirSync(path.join(base,'product/captures')).filter(f=>f.endsWith('.png')))media.push({id:'capture.'+file,file:'product/captures/'+file,kind:'real-product-capture',claim_type:'retained-product-ui',source:'Live Console browser capture, 2026-11-20',provenance:'product/provenance.json'});
const assets=[...data.assets,...media];
for(const a of assets){const bytes=fs.readFileSync(path.join(base,a.file));a.sha256=createHash('sha256').update(bytes).digest('hex');}
fs.writeFileSync(path.join(base,'asset-index.json'),JSON.stringify({version:1,brand:'Hexagon',language:'en',visual_system:'WEBSITE-REUSE.md',typography:['Funnel Display','IBM Plex Mono','Geist'],headline_source:'../brand-copy.json',paths_relative_to:'brand-assets/gtm',generated_assets:'index.generated.json',claims:'claims.json',provenance:'product/provenance.json',assets},null,2)+'\n');
