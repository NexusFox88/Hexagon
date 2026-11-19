/** One viewport shell; named content regions preserve their position across data refreshes. */
const positions=new Map();
const known=new WeakMap();
const regionSelector='.table-wrap,.resource-list,.conversation,.initialization,.harness-templates,.agent-records,.quickstart-layout>.quickstart-panel,.agent-layout>.quickstart-panel';
export function installScrollLayout(root){
 const keyFor=node=>node===root?'content':node.dataset.scrollRegion;
 root.addEventListener('keydown',event=>{
  const region=event.target;
  if(!(region instanceof HTMLElement)||!region.dataset.scrollRegion||!['Home','End','PageUp','PageDown','ArrowLeft','ArrowRight'].includes(event.key)||event.altKey||event.metaKey||event.ctrlKey)return;
  if(event.key==='ArrowLeft'||event.key==='ArrowRight'){
   if(region.scrollWidth<=region.clientWidth)return;
   event.preventDefault();region.scrollLeft+=(event.key==='ArrowRight'?1:-1)*64;return;
  }
  if(region.scrollHeight<=region.clientHeight)return;
  event.preventDefault();
  region.scrollTop=event.key==='Home'?0:event.key==='End'?region.scrollHeight:region.scrollTop+(event.key==='PageDown'?1:-1)*region.clientHeight*.9;
 });
 root.addEventListener('scroll',event=>{
  const key=keyFor(event.target);if(!key||known.get(event.target)!==location.hash)return;
  positions.set(location.hash+'|'+key,{top:event.target.scrollTop,left:event.target.scrollLeft});
 },true);
 function apply(){
  const nodes=[root,...root.querySelectorAll(regionSelector)];
  nodes.forEach((node,index)=>{
   const key=index===0?'content':`${node.classList[0]}:${index}`;
   node.dataset.scrollRegion=key;
   node.tabIndex=0;node.setAttribute('role','region');node.setAttribute('aria-labelledby','title');
   if(known.get(node)===location.hash)return;
   known.set(node,location.hash);
   const saved=positions.get(location.hash+'|'+key);
   node.scrollTop=saved?.top??(index?node.scrollTop:0);node.scrollLeft=saved?.left??(index?node.scrollLeft:0);
  });
 }
 const observer=new MutationObserver(apply);observer.observe(root,{childList:true,subtree:true});
 window.addEventListener('hashchange',apply);apply();
 return apply;
}
