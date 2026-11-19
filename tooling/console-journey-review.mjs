// Run with ego-browser nodejs; update taskSpace ID to the current task-owned browser.
const task=await taskSpace(27),p=task.page('p1');
const fs=await import('node:fs/promises'),root='/Users/hexagon-maintainer/CodeProject/Hexagon';
await p.reload();const owner=JSON.parse(await fs.readFile(root+'/.local/control-plane/owner.json','utf8'));await p.fill('#api-token',owner.token);await p.click('#login-form button[type=submit]');await p.waitForFunction(()=>!document.querySelector('#workspace').hidden&&!document.querySelector('#content .loading-state'));
const results=[];
for(const locale of ['en','zh-CN']){
 await p.click('#locale > button');await p.keyboard.press(locale==='en'?'Home':'End');await p.keyboard.press('Enter');await p.waitForFunction(l=>document.documentElement.lang===l,locale);
 for(const width of [1440,390]){
  await p.cdp('Emulation.setDeviceMetricsOverride',{width,height:900,deviceScaleFactor:1,mobile:false});
  for(const route of ['setup','sandboxes','models','agents','quickstart','tokens','runs','sessions','pending','network','tools','http','harnesses','operations','overview','fleet','secrets']){
   if(width===390)await p.click('#navigation-toggle');
   const group=await p.evaluate(r=>{const link=document.querySelector(`[data-view="${r}"]`);const parent=link.closest('details');return parent&&!parent.open?[...document.querySelectorAll('.nav-secondary')].indexOf(parent):null;},route);
   if(group!==null)await p.click(`.nav-secondary > summary >> nth=${group}`);
   await p.click(`a[data-view="${route}"]`);
   await p.waitForFunction(r=>location.hash==='#'+r&&document.querySelector('#content')?.getAttribute('aria-busy')==='false'&&!document.querySelector('#content .loading-state')&&document.querySelector('#content')?.textContent.trim().length>0,route);
   const state=await p.evaluate(()=>({title:document.title,notice:document.querySelector('#notice').hidden?null:document.querySelector('#notice').textContent,overflow:document.documentElement.scrollWidth>innerWidth+2}));
   if(state.notice||state.overflow)throw new Error(JSON.stringify({route,locale,width,...state}));results.push({route,locale,width,...state});
   if(['setup','quickstart'].includes(route))await p.screenshot({path:root+`/testing/evidence/journey-navigation/${locale}-${width}-${route}.png`});
  }
 }
}
await p.cdp('Emulation.clearDeviceMetricsOverride');await fs.writeFile(root+'/testing/evidence/journey-navigation/browser-review.json',JSON.stringify({checked_at:new Date().toISOString(),results},null,2));console.log({pages:results.length,result:'passed'});
