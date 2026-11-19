import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {consoleRoutes,auditConsoleLayout} from './console-layout.mjs';

/** Read-only review of real Console routes using a managed ego-browser Page. */
export async function reviewConsoleDesign(page,{directory,baseUrl='http://127.0.0.1:8787'}={}){
 await mkdir(directory,{recursive:true});
 const report=[];
 for(const locale of ['en','zh-CN']){
  await page.evaluate(async value=>(await import('/console/i18n.js')).setLocale(value),locale);
  for(const theme of ['light','dark']){
   await page.evaluate(value=>window.hexagonTheme.set(value),theme);
   for(const width of [1440,390]){
    await page.cdp('Emulation.setDeviceMetricsOverride',{width,height:900,deviceScaleFactor:1,mobile:true});
    await page.waitForFunction(value=>innerWidth===value,width);
    const layouts=await auditConsoleLayout(page,{baseUrl});
    for(const route of consoleRoutes){
     await page.goto(`${baseUrl}/console/#${route}`);
     await page.waitForFunction(view=>document.querySelector('#workspace').dataset.view===view&&document.querySelector('#content').getAttribute('aria-busy')==='false',route);
     await page.evaluate(()=>document.fonts.ready);
     await page.evaluate(()=>Promise.all(document.getAnimations().filter(a=>a.effect?.getComputedTiming().iterations!==Infinity).map(a=>a.finished.catch(()=>{}))));
     const measured=await page.evaluate(()=>{
      const style=e=>getComputedStyle(e),title=document.querySelector('#title');
      return {width:innerWidth,height:innerHeight,font:style(title).fontFamily,titleSize:style(title).fontSize,bodyFont:style(document.body).fontFamily,
       avatarRadius:style(document.querySelector('.avatar')).borderRadius,connectionRadius:style(document.querySelector('.dot')).borderRadius,
       marks:[...document.querySelectorAll('#content .badge')].map(e=>({text:e.textContent,mark:getComputedStyle(e,'::before').content,radius:getComputedStyle(e,'::before').borderRadius})),
       originalIcon:Boolean(document.querySelector('[data-icon=terminal] svg path')),
       brandFont:style(document.querySelector('.brand')).fontFamily,
       notice:document.querySelector('#notice').hidden?null:document.querySelector('#notice').textContent,
       failedAssets:performance.getEntriesByType('resource').filter(r=>r.responseStatus>=400).map(r=>({url:r.name,status:r.responseStatus}))};
     });
     assert.equal(measured.width,width);assert(measured.font.includes('Funnel Display'));assert.equal(measured.titleSize,'28px');assert(measured.bodyFont.includes('Inter'));
     assert.equal(measured.avatarRadius,'0px');assert.equal(measured.connectionRadius,'0px');assert(measured.originalIcon);assert(measured.brandFont.includes('Geist'));
     for(const mark of measured.marks){assert.equal(mark.radius,'0px');assert(mark.mark.includes('[')&&mark.mark.includes(']'));}
     assert.equal(measured.notice,null);assert.deepEqual(measured.failedAssets.filter(a=>/\.(?:css|js|ttf|woff2?)(?:$|\?)/.test(a.url)),[]);
     report.push({route,locale,theme,...measured,layout:layouts.find(l=>l.route==='#'+route)});
     await page.screenshot({path:`${directory}/${locale}-${theme}-${width}-${route}.png`});
    }
   }
  }
 }
 await writeFile(`${directory}/routes.json`,JSON.stringify(report,null,2));
 return {routes:consoleRoutes.length,checks:report.length};
}
