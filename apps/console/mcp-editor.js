import {t} from './i18n.js';
const node=(tag,text)=>{const e=document.createElement(tag);if(text!==undefined)e.textContent=text;return e;};
export function renderMcpEditor(root,config,field,onAuthChange){
 field('mcp-endpoint',t('ui.mcp_endpoint'),config.endpoint??'','url').required=true;
 for(const [id,key,options,value]of [['mcp-transport','ui.mcp_transport',[['streamable-http','Streamable HTTP'],['sse','SSE']],config.transport??'streamable-http'],['mcp-auth','ui.app_authentication',[['bearer',t('ui.mcp_bearer')],['header',t('ui.mcp_header')],['none',t('ui.mcp_none')]],config.authentication??'bearer']]){
 const label=node('label',t(key));label.htmlFor=id;const select=node('hx-select');select.id=id;select.setAttribute('aria-label',t(key));select.setOptions(options.map(([value,label])=>({value,label})));select.value=value;root.append(label,select);if(id==='mcp-auth')select.onchange=onAuthChange;
 }
 field('mcp-header',t('ui.mcp_header_name'),config.header_name??'x-api-key');
 root.append(node('p',t('ui.mcp_discovery_help')));
 const discover=node('button',t('ui.mcp_discover'));discover.type='submit';discover.dataset.mcpDiscover='true';root.append(discover);
 const list=node('fieldset');list.id='mcp-tools';list.append(node('legend',t('ui.app_operations')));
 for(const [key,tool]of Object.entries(config.tools??{})){
  const row=node('div');row.className='mcp-tool';const label=node('label'),check=node('input');check.type='checkbox';check.checked=true;check.dataset.mcpTool=key;check.id='mcp-tool-'+key;check.mcpDefinition=tool;label.append(check,node('span',tool.name));
  const approvalLabel=node('label'),approval=node('input');approval.type='checkbox';approval.checked=tool.approval;approval.dataset.mcpApproval=key;approval.id='mcp-approval-'+key;approvalLabel.append(approval,node('span',t('ui.app_approval_required')));row.append(label,node('p',tool.description),approvalLabel);list.append(row);
 }
 root.append(list);
}
export function mcpForm(){const $=id=>document.getElementById(id);return {endpoint:$('mcp-endpoint').value,transport:$('mcp-transport').value,authentication:$('mcp-auth').value,header_name:$('mcp-header').value,tools:Object.fromEntries([...document.querySelectorAll('[data-mcp-tool]:checked')].map(e=>[e.dataset.mcpTool,{...e.mcpDefinition,approval:document.querySelector(`[data-mcp-approval="${e.dataset.mcpTool}"]`).checked}]))};}
