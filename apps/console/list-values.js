import {t} from './i18n.js';
import {openModal,closeModal} from './components.js';

const element=(tag,css)=>{const node=document.createElement(tag);node.className=css;return node;};
const label=(node,key)=>{node.dataset.i18n=key;node.textContent=t(key);return node;};
function showValue(value,copyFailed=false){
 document.getElementById('list-value-dialog')?.remove();
 const layer=element('div','modal-layer');layer.id='list-value-dialog';layer.hidden=true;
 layer.setAttribute('role','dialog');layer.setAttribute('aria-modal','true');layer.setAttribute('aria-labelledby','list-value-title');
 const panel=element('div','modal-panel'),head=element('div','dialog-heading'),title=label(element('h2',''),'ui.list_full_value');title.id='list-value-title';head.append(title);
 const body=element('div','dialog-body'),text=element('textarea','list-full-value');text.value=value;text.readOnly=true;text.dataset.i18nAriaLabel='ui.list_full_value';text.setAttribute('aria-label',t('ui.list_full_value'));body.append(text);
 const status=element('p','hint');status.setAttribute('role','status');body.append(status);if(copyFailed)label(status,'ui.list_copy_failed');
 const footer=element('div','dialog-footer'),close=label(element('button',''),'ui.close'),copy=label(element('button','primary'),'ui.list_copy');
 close.type=copy.type='button';close.onclick=()=>closeModal(layer.id);copy.onclick=async()=>{try{await navigator.clipboard.writeText(value);label(status,'ui.init_copied');}catch{label(status,'ui.list_copy_failed');text.focus();text.select();}};
 footer.append(close,copy);panel.append(head,body,footer);layer.append(panel);document.body.append(layer);openModal(layer.id);if(copyFailed)requestAnimationFrame(()=>{text.focus();text.select();});
}
/** Decorate only data labels, preserving existing links/buttons and their listeners. */
export function installListValues(root){
 function apply(){
  for(const cell of root.querySelectorAll('.table-wrap td')){
   if(cell.children.length===0&&cell.textContent.trim().length>24){const text=element('span','');text.textContent=cell.textContent;cell.replaceChildren(text);}
  }
  const selector='.table-wrap td :is(strong,code,small,.name-button,.secondary,.session-task,.cell-primary),.table-wrap td span:not([data-i18n]),.record-row h2,.record-row code,.execution-identity > a,.agent-row code';
  for(const text of root.querySelectorAll(selector)){
   if(text.closest('.list-value,.badge,.row-actions,.provider-identity')||text.children.length||text.textContent.length<=24)continue;
   const value=text.textContent,wrap=element('div','list-value');text.before(wrap);wrap.append(text);text.classList.add('list-value-text');
   text.title=value;
   if(!text.matches('a,button')){
    text.tabIndex=0;text.setAttribute('role','button');
    text.onclick=()=>showValue(value);
    text.onkeydown=event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();showValue(value);}};
   }
   const copy=element('button','list-value-copy');copy.type='button';
   const paintIcon=done=>{
    const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');svg.setAttribute('viewBox','0 0 16 16');svg.setAttribute('width','16');svg.setAttribute('height','16');svg.setAttribute('fill','none');svg.setAttribute('stroke','currentColor');svg.setAttribute('stroke-width','1.3');svg.setAttribute('aria-hidden','true');
    const path=document.createElementNS(svg.namespaceURI,'path');path.setAttribute('d',done?'M3 8l3 3 7-7':'M5.5 5.5h8v8h-8zM10.5 3V2.5h-8v8H3');svg.append(path);copy.replaceChildren(svg);
   };
   paintIcon(false);copy.dataset.i18nAriaLabel='ui.list_copy';copy.setAttribute('aria-label',t('ui.list_copy'));
   let reset;
   copy.onclick=async()=>{try{await navigator.clipboard.writeText(value);paintIcon(true);copy.dataset.i18nAriaLabel='ui.init_copied';copy.setAttribute('aria-label',t('ui.init_copied'));clearTimeout(reset);reset=setTimeout(()=>{paintIcon(false);copy.dataset.i18nAriaLabel='ui.list_copy';copy.setAttribute('aria-label',t('ui.list_copy'));},1600);}catch{showValue(value,true);}};
   wrap.append(copy);
  }
 }
 const observer=new MutationObserver(apply);observer.observe(root,{childList:true,subtree:true});apply();
}
