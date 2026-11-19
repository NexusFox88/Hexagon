import {renderReuseActions} from './session-reuse.js';
import {t,formatDate} from './i18n.js';
const node=(tag,text,css)=>{const e=document.createElement(tag);if(text!==undefined)e.textContent=text;if(css)e.className=css;return e;};
/** Render only the pinned server snapshot; never substitute live connection settings. */
export function renderInitialization(root,snapshot){
 const def=snapshot.definition,section=node('section',undefined,'initialization');
 const heading=node('div',undefined,'initialization-heading');
 const copy=node('button',t('ui.init_copy'));copy.type='button';const status=node('span',undefined,'hint');status.setAttribute('role','status');
 copy.onclick=async()=>{try{await navigator.clipboard.writeText(JSON.stringify(snapshot,null,2));status.textContent=t('ui.init_copied');}catch{status.textContent=t('ui.init_copy_failed');}};heading.prepend(node('p',t('ui.init_help'),'hint'));section.append(heading);
 renderReuseActions(section,snapshot);
 const rows=(target,values)=>{const dl=node('dl',undefined,'initialization-properties');for(const [key,value]of values){dl.append(node('dt',t(key)),node('dd',value??'—'));}target.append(dl);};
 rows(section,[['ui.init_created',formatDate(snapshot.created_at)],['ui.init_source',snapshot.source.kind==='agent'?`${snapshot.source.agent_id} · ${t('ui.init_revision',{revision:snapshot.source.agent_revision})}`:t('ui.init_direct')],['ui.init_harness',`${def.harness.id} · ${def.harness.version}`]]);
 for(const [key,value] of [['ui.behavior_identity',def.identity],['ui.behavior_instructions',def.instructions],['ui.behavior_context',def.context]])if(value){const group=node('section',undefined,'initialization-group');group.append(node('h3',t(key)),node('pre',typeof value==='string'?value:JSON.stringify(value,null,2),'initialization-json'));section.append(group);}
 if(def.harness_image)rows(section,[['ui.init_image',def.harness_image.reference],['ui.init_digest',def.harness_image.digest]]);
 for(const [kind,key]of [['sandbox','ui.init_sandbox'],['model','ui.init_model'],['tool','ui.init_tools'],['http','ui.init_protected']]){
  const group=node('section',undefined,'initialization-group');group.append(node('h3',t(key)));const connections=(def.connections??[]).filter(c=>c.kind===kind);
  if(!connections.length)group.append(node('p',t('ui.init_none'),'hint'));
  for(const c of connections){const item=node('div',undefined,'initialization-connection'),bindings=Object.entries(kind==='tool'?def.tool_bindings??{}:def.protected_api_bindings??{}).filter(([,id])=>id===c.id).map(([name])=>name);
   item.append(node('strong',c.name??c.provider),node('span',`${c.name?c.provider+' · ':''}${t('ui.init_revision',{revision:c.version})}`,'secondary'));
   rows(item,[...(kind==='model'?[['ui.init_model_name',c.config.model],['ui.init_endpoint',c.config.base_url]]:[]),...(c.provider==='mcp-remote'?[['ui.init_endpoint',c.config.endpoint],['ui.init_operations',Object.values(c.config.tools??{}).map(tool=>tool.name).join(', ')]]:[]),...(kind==='tool'&&c.config.operations?[['ui.init_operations',c.config.operations.join(', ')]]:[]),['ui.init_connection_id',c.id],...(bindings.length?[['ui.init_binding',bindings.join(', ')]]:[])]);
   const config=node('details');config.append(node('summary',t('ui.init_connection_config')),node('pre',JSON.stringify(c.config,null,2),'initialization-json'));item.append(config);group.append(item);
  }section.append(group);
 }
 const runtime=node('section',undefined,'initialization-group');runtime.append(node('h3',t('ui.init_execution')));rows(runtime,[['ui.init_resources',JSON.stringify(def.resources)],['ui.init_network',JSON.stringify(def.network)],['ui.init_environment',snapshot.environment.names.length?snapshot.environment.names.join(', '):t('ui.init_none')],['ui.init_boundary',def.credential_boundary??'—']]);runtime.append(node('p',t('ui.init_redacted'),'hint'));section.append(runtime);
 const layout=node('div',undefined,'initialization-workspace');
 const toggle=node('button',t('ui.init_show_json'),'initialization-json-toggle');toggle.type='button';toggle.setAttribute('aria-expanded','false');toggle.setAttribute('aria-controls','initialization-json-sidebar');
 toggle.onclick=()=>{const open=layout.classList.toggle('show-json');toggle.setAttribute('aria-expanded',String(open));toggle.textContent=t(open?'ui.init_show_config':'ui.init_show_json');};
 const sidebar=node('aside',undefined,'initialization-json-sidebar');sidebar.id='initialization-json-sidebar';sidebar.setAttribute('aria-label',t('ui.init_json'));
 const bar=node('div',undefined,'initialization-json-toolbar');bar.append(node('h2',t('ui.init_json')),copy);
 const pre=node('pre',undefined,'initialization-source');pre.tabIndex=0;pre.setAttribute('aria-label',t('ui.init_json'));pre.append(node('code',JSON.stringify(snapshot,null,2)));
 sidebar.append(bar,status,pre);layout.append(toggle,section,sidebar);root.append(layout);
}
