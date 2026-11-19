import {t} from './i18n.js';
import {renderRestPreview} from './rest-preview.js';
const node=(tag,css)=>{const n=document.createElement(tag);if(css)n.className=css;return n;};
let selected='sdk';
/** SDK and HTTP are sibling representations of the same request, sharing the form. */
export function playgroundOutput(output,getInput){
 const sdk=node('section','playground-output-panel'),rest=node('section','playground-output-panel');
 sdk.append(...output.childNodes);output.replaceChildren();
 const tabs=node('div','playground-output-tabs');tabs.setAttribute('role','tablist');tabs.setAttribute('aria-label',t('ui.playground_representation'));
 const id='playground-output-'+crypto.randomUUID();
 for(const [value,panel,key] of [['sdk',sdk,'ui.playground_sdk'],['api',rest,'ui.playground_api']]){
  const tab=node('button');tab.type='button';tab.textContent=t(key);tab.id=id+'-'+value+'-tab';tab.dataset.value=value;
  tab.setAttribute('role','tab');tab.setAttribute('aria-controls',id+'-'+value);panel.id=id+'-'+value;panel.setAttribute('role','tabpanel');panel.setAttribute('aria-labelledby',tab.id);panel.tabIndex=0;
  tab.onclick=()=>{selected=value;paint();};tabs.append(tab);
 }
 function paint(){for(const tab of tabs.children){const active=tab.dataset.value===selected;tab.setAttribute('aria-selected',String(active));tab.tabIndex=active?0:-1;}sdk.hidden=selected!=='sdk';rest.hidden=selected!=='api';}
 tabs.onkeydown=event=>{if(!['ArrowLeft','ArrowRight','Home','End'].includes(event.key))return;event.preventDefault();const index=event.key==='Home'?0:event.key==='End'?1:selected==='sdk'?1:0;tabs.children[index].click();tabs.children[index].focus();};
 output.classList.add('playground-output');output.append(tabs,sdk,rest);paint();return renderRestPreview(rest,getInput);
}
