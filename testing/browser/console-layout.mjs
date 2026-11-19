import assert from 'node:assert/strict';
export const consoleRoutes=['sessions','sandboxes','models','harnesses','tools','quickstart','settings','tokens','overview','runs','pending','http','secrets','agents','network','operations','fleet'];
/** Managed ego-browser Page. Reviews real rendered routes; does not mutate account data. */
export async function auditConsoleLayout(page,{routes=consoleRoutes,baseUrl="http://127.0.0.1:8787"}={}){
 const results=[];
 for(const route of routes){
  await page.goto(baseUrl+'/console/#'+route);
  await page.waitForFunction(()=>document.querySelector('#content').getAttribute('aria-busy')==='false');
  const row=await page.evaluate(()=>{
   const content=document.querySelector('#content'),heading=document.querySelector('#workspace>.heading');
   return {route:location.hash,title:document.querySelector('#title').textContent,viewport:{width:innerWidth,height:innerHeight},document:{width:document.documentElement.scrollWidth,height:document.documentElement.scrollHeight},headingBottom:heading.getBoundingClientRect().bottom,contentTop:content.getBoundingClientRect().top,contentBottom:content.getBoundingClientRect().bottom};
  });
  assert(row.title.trim(),`${route}: missing title`);
  assert(row.document.width<=row.viewport.width+1,`${route}: document horizontal overflow`);
  assert(row.document.height<=row.viewport.height+1,`${route}: document scrolling instead of content`);
  assert(row.contentTop>=row.headingBottom-1,`${route}: heading overlaps content`);
  assert(row.contentBottom<=row.viewport.height+1,`${route}: content exceeds viewport`);
  results.push(row);
 }
 return results;
}
