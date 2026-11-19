// Run with: ego-browser nodejs < tooling/console-browser-review.mjs
// Reuses the current task's browser. Never prints owner credentials.
const task = await taskSpace(21);
const page = task.page('p1');
const fs = await import('node:fs/promises');
const root = '/Users/hexagon-maintainer/CodeProject/Hexagon';
await page.reload();
const owner = JSON.parse(await fs.readFile(root+'/.local/control-plane/owner.json','utf8'));
await page.fill('#api-token',owner.token);
await page.click('#login-form button[type=submit]');
await page.waitForFunction(()=>!document.querySelector('#workspace').hidden&&!document.querySelector('.loading-state'));
const records=[];
const directory=root+'/testing/evidence/product-completion';await fs.mkdir(directory,{recursive:true});
for(const locale of ['en','zh-CN']){
 await page.click('#locale > button');
 await page.keyboard.press(locale==='en'?'Home':'End');await page.keyboard.press('Enter');
 await page.waitForFunction(language=>document.documentElement.lang===language,locale);
 for(const width of [1440,390]){
  await page.cdp('Emulation.setDeviceMetricsOverride',{width,height:900,deviceScaleFactor:1,mobile:false});
  for(const route of ['setup','sandboxes','network','overview','sessions','runs','pending','operations','agents','harnesses','models','tools','http','quickstart','tokens']){
   await page.click(`a[data-view="${route}"]`);
   await page.waitForFunction(route=>location.hash.split('?')[0]==='#'+route&&document.querySelector(`a[data-view="${route}"]`)?.getAttribute('aria-current')==='page'&&document.querySelector('#content').getAttribute('aria-busy')==='false'&&!document.querySelector('#content .loading-state'),route);
   await page.waitForFunction(()=>document.querySelector('#content').textContent.trim().length>0);
   const state=await page.evaluate(()=>({title:document.querySelector('#title').textContent,locale:document.documentElement.lang,notice:document.querySelector('#notice').hidden?null:document.querySelector('#notice').textContent,overflow:document.documentElement.scrollWidth>innerWidth+2,content:document.querySelector('#content').textContent.slice(0,100)}));
   records.push({locale,width,route,...state});
   if(state.notice||state.overflow)throw new Error(JSON.stringify(records.at(-1)));
   if(['setup','agents','overview','quickstart'].includes(route))await page.screenshot({path:`${directory}/${locale}-${width}-${route}.png`});
  }
 }
}
await page.cdp('Emulation.clearDeviceMetricsOverride');
await fs.writeFile(directory+'/browser-review.json',JSON.stringify({checked_at:new Date().toISOString(),records},null,2));
console.log({pages:records.length,locales:['en','zh-CN'],widths:[1440,390],result:'passed'});
