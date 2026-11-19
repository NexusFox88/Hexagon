import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {consoleRoutes,auditConsoleLayout} from './console-layout.mjs';
const base='http://127.0.0.1:8787/console/#';
export async function auditSurfaces(page,directory){
 await mkdir(directory,{recursive:true});const results=[];
 async function measure(name){
  await page.evaluate(()=>document.fonts.ready);
  const data=await page.evaluate(()=>{
   const visible=e=>e.getClientRects().length&&!e.closest('[hidden]');
   const modal=[...document.querySelectorAll('.modal-layer')].find(visible),panel=modal?.querySelector('.modal-panel'),footer=modal?.querySelector('.dialog-footer');
   const rect=e=>{const r=e.getBoundingClientRect();return {x:r.x,y:r.y,right:r.right,bottom:r.bottom,width:r.width,height:r.height};};
   return {viewport:{width:innerWidth,height:innerHeight},panel:panel&&rect(panel),footer:footer&&rect(footer),
    documentOverflow:document.documentElement.scrollWidth>innerWidth+1,
    controls:[...(modal??document.querySelector('#workspace')).querySelectorAll('input:not([type=hidden]),textarea,.select-trigger,label')].filter(visible).map(e=>({tag:e.tagName,id:e.id,font:getComputedStyle(e).fontFamily,size:getComputedStyle(e).fontSize,rect:rect(e)})),
    options:[...document.querySelectorAll('.select-options:not([hidden])')].filter(visible).map(rect)};
  });
  assert(!data.documentOverflow,name+' document overflow');
  if(data.panel){assert(data.panel.x>=0&&data.panel.right<=data.viewport.width+1,name+' modal width');assert(data.panel.y>=0&&data.panel.bottom<=data.viewport.height+1,name+' modal height');}
  if(data.footer)assert(data.footer.bottom<=data.viewport.height+1,name+' footer');
  for(const r of data.options)assert(r.x>=0&&r.right<=data.viewport.width+1&&r.y>=0&&r.bottom<=data.viewport.height+1,name+' dropdown bounds');
  results.push({name,...data});
  await page.screenshot({path:`${directory}/${name}.png`});
 }
 async function inspectDialog(name){
  await page.waitForSelector('.modal-layer:not([hidden])');await measure(name);
  const details=await page.evaluate(()=>[...document.querySelectorAll('.modal-layer:not([hidden]) details')].map((e,i)=>i));
  for(const i of details)await page.evaluate(i=>{document.querySelectorAll('.modal-layer:not([hidden]) details')[i].open=true},i);
  const selects=await page.evaluate(()=>[...document.querySelectorAll('.modal-layer:not([hidden]) hx-select')].filter(e=>e.getClientRects().length).map(e=>e.id));
  for(const id of selects){await page.press(`#${id} .select-trigger`,'ArrowDown');await measure(name+'-select-'+id);await page.keyboard.press('Escape');}
  await measure(name+'-expanded');await page.keyboard.press('Escape');await page.waitForSelector('.modal-layer:not([hidden])',{state:'hidden'});
 }
 for(const locale of ['en','zh-CN'])for(const width of [1440,390]){
  await page.cdp('Emulation.setDeviceMetricsOverride',{width,height:640,deviceScaleFactor:1,mobile:true});
  await page.evaluate(async locale=>(await import('/console/i18n.js')).setLocale(locale),locale);
  const prefix=locale+'-'+width;
  const layouts=await auditConsoleLayout(page);results.push({name:prefix+'-routes',layouts});
  for(const route of consoleRoutes){await page.goto(base+route);await page.waitForFunction(()=>document.querySelector('#content').getAttribute('aria-busy')==='false');await measure(prefix+'-'+route);}
  for(const route of ['sandboxes','models','tools']){
   await page.goto(base+route);await page.waitForFunction(()=>document.querySelector('#content').getAttribute('aria-busy')==='false');
   await page.press('#create','Enter');await page.waitForSelector('.catalog-options');
   const count=await page.evaluate(()=>document.querySelectorAll('.catalog-options button').length);await measure(prefix+'-'+route+'-catalog');await page.keyboard.press('Escape');
   for(let i=0;i<count;i++){
    await page.press('#create','Enter');await page.waitForSelector('.catalog-options');await page.press(`.catalog-options button:nth-child(${i+1})`,'Enter');
    await inspectDialog(prefix+'-'+route+'-form-'+i);
   }
  }
  for(const route of ['secrets','harnesses']){await page.goto(base+route);await page.waitForFunction(()=>document.querySelector('#content').getAttribute('aria-busy')==='false');await page.press('#create','Enter');await inspectDialog(prefix+'-'+route+'-create');}
  await writeFile(`${directory}/results.json`,JSON.stringify(results,null,2));console.log('finished',prefix,results.length);
 }
 return results.length;
}
