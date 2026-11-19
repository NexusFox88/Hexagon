import assert from 'node:assert/strict';
import * as fs from 'node:fs/promises';
export async function auditConsoleMenus(page,root){
const report=[];
async function capture(name){await page.evaluate(()=>document.fonts.ready);const d=await page.evaluate(()=>{const visible=e=>e.getClientRects().length&&!e.closest('[hidden]');return [...document.querySelectorAll('.modal-layer .modal-panel,.select-options,.menu-panel')].filter(visible).map(e=>{const r=e.getBoundingClientRect();return {cls:e.className,x:r.x,y:r.y,right:r.right,bottom:r.bottom,w:innerWidth,h:innerHeight}})});for(const r of d)assert(r.x>=0&&r.y>=0&&r.right<=r.w+1&&r.bottom<=r.h+1,JSON.stringify({name,r}));report.push({name,bounds:d});await page.screenshot({path:root+'/'+name+'.png'});}
for(const locale of ['en','zh-CN'])for(const width of [1440,390]){
await page.cdp('Emulation.setDeviceMetricsOverride',{width,height:640,deviceScaleFactor:1,mobile:true});await page.evaluate(async l=>{(await import('/console/i18n.js')).setLocale(l);window.hexagonTheme.set('dark')},locale);const prefix='final-'+locale+'-'+width;
for(const route of ['sessions','sandboxes','models','harnesses','tools','quickstart','settings','tokens','overview','runs','pending','http','secrets','agents','network','operations','fleet']){
await page.goto('http://127.0.0.1:8787/console/#'+route);await page.waitForFunction(()=>document.querySelector('#content').getAttribute('aria-busy')==='false');await capture(prefix+'-'+route);
const selects=await page.evaluate(()=>[...document.querySelectorAll('#workspace hx-select')].filter(e=>e.getClientRects().length&&!e.closest('[hidden]')).map((e,i)=>{e.dataset.auditSelect=String(i);return String(i)}));for(const id of selects){await page.press('[data-audit-select="'+id+'"] .select-trigger','ArrowDown');await capture(prefix+'-'+route+'-select-'+id);await page.keyboard.press('Escape');}
const menu=await page.evaluate(()=>!!document.querySelector('tbody button[aria-haspopup=menu]'));if(menu){await page.press('tbody button[aria-haspopup=menu] >> nth=0','Enter');await capture(prefix+'-'+route+'-menu');await page.keyboard.press('Escape');}
}
await page.goto('http://127.0.0.1:8787/console/#harnesses');await page.waitForSelector('.harness-table');await page.press('.harness-table tbody tr:first-child td:last-child button','Enter');await capture(prefix+'-harness-detail');await page.keyboard.press('Escape');await page.press('.harness-tabs button:nth-child(2)','Enter');await page.waitForSelector('.harness-template');await capture(prefix+'-harness-templates');await page.press('.harness-template:first-child .row-actions button:last-child','Enter');await capture(prefix+'-harness-recipe');await page.keyboard.press('Escape');await page.press('.harness-tabs button:first-child','Enter');
await page.goto('http://127.0.0.1:8787/console/#secrets');await page.waitForSelector('tbody button[aria-haspopup=menu]');await page.press('tbody button[aria-haspopup=menu] >> nth=0','Enter');await page.press('[role=menu]:not([hidden]) .danger','Enter');await page.waitForSelector('#confirmation:not([hidden])');await capture(prefix+'-confirmation');await page.press('#confirm-cancel','Enter');
await fs.writeFile(root+'/extra-results.json',JSON.stringify(report,null,2));
}
return report;
}
