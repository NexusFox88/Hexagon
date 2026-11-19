import {t} from './i18n.js';
/** Shared optional behavior fields for direct Sessions and saved Agents. */
export function renderAgentBehavior(root,definition,onchange=()=>{},disabled=false){
 const group=document.createElement('details');
 group.open=Boolean(definition.identity||definition.instructions||definition.context);
 const summary=document.createElement('summary');summary.textContent=t('ui.behavior_title');group.append(summary);
 const help=document.createElement('p');help.className='hint';help.textContent=t('ui.behavior_help');group.append(help);
 for(const [key,value,save,max] of [
  ['ui.behavior_identity',definition.identity?.name??'',value=>{if(value)definition.identity={...definition.identity,name:value};else delete definition.identity;},200],
  ['ui.behavior_instructions',definition.instructions??'',value=>{if(value)definition.instructions=value;else delete definition.instructions;},32768],
  ['ui.behavior_context',definition.context?.text??'',value=>{if(value)definition.context={...definition.context,text:value};else if(definition.context?.documents?.length||definition.context?.files?.length)delete definition.context.text;else delete definition.context;},32768],
 ]){
  const label=document.createElement('label');label.textContent=t(key);
  const input=document.createElement(key==='ui.behavior_identity'?'input':'textarea');input.value=value;input.maxLength=max;input.disabled=disabled;input.setAttribute('aria-label',t(key));if(input.tagName==='TEXTAREA')input.rows=3;
  input.oninput=()=>{save(input.value);onchange();};label.append(input);group.append(label);
 }
 root.append(group);
}
