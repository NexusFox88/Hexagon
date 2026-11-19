import assert from 'node:assert/strict';
/** Run with a managed ego-browser Page against a populated local Console; no data mutation. */
export async function verifyConsoleScroll(page){
 await page.goto('http://127.0.0.1:8787/console/#sessions');
 await page.waitForSelector('.table-wrap');
 await page.waitForFunction(()=>document.querySelector('#content').getAttribute('aria-busy')==='false');
 const measure=()=>page.evaluate(()=>{
  const list=document.querySelector('.table-wrap'),title=document.querySelector('#title'),pagination=document.querySelector('#content>.actions');
  return {window:scrollY,document:document.documentElement.scrollHeight,viewport:innerHeight,top:list.scrollTop,total:list.scrollHeight,height:list.clientHeight,title:title.getBoundingClientRect().top,header:list.querySelector('th').getBoundingClientRect().top,listTop:list.getBoundingClientRect().top,pagination:pagination.getBoundingClientRect().bottom};
 });
 const initial=await measure();assert(initial.total>initial.height,'requires enough existing Sessions to scroll');
 // Real wheel input, not setting scrollTop to simulate a successful interaction.
 const target=await page.evaluate(()=>{const r=document.querySelector('.table-wrap').getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2};});
 await page.mouse.move(target.x,target.y);await page.mouse.wheel(0,500);
 await page.waitForFunction(()=>document.querySelector('.table-wrap').scrollTop>100);
 await page.evaluate(()=>new Promise(resolve=>{let last=-1,stable=0;function check(){const top=document.querySelector('.table-wrap').scrollTop;stable=top===last?stable+1:0;last=top;if(stable>8)resolve();else requestAnimationFrame(check);}check();}));
 const scrolled=await measure();assert.equal(scrolled.window,0);assert(scrolled.document<=scrolled.viewport+1);assert(Math.abs(scrolled.title-initial.title)<1);assert(Math.abs(scrolled.header-scrolled.listTop)<2);assert(scrolled.pagination<=scrolled.viewport);
 await page.click('#refresh');await page.waitForFunction(()=>document.querySelector('#content').getAttribute('aria-busy')==='false');
 const refreshed=await measure();assert(Math.abs(refreshed.top-scrolled.top)<2,'refresh must retain list position');
 await page.focus('.table-wrap');await page.keyboard.press('Home');
 await page.waitForFunction(()=>document.querySelector('.table-wrap').scrollTop<2);
 await page.keyboard.press('PageDown');await page.waitForFunction(()=>document.querySelector('.table-wrap').scrollTop>50);
 const keyboard=await measure();assert.equal(keyboard.window,0);assert(Math.abs(keyboard.title-initial.title)<1);
 return {initial,scrolled,refreshed,keyboard};
}
