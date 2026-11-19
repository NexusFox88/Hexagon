import {renderAgentBehavior} from './agent-behavior.js';
import {t,formatDate,formatNumber} from './i18n.js';
import {confirmAction,markServerFields} from './components.js';
const node=(tag,text,css)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=text;if(css)n.className=css;return n;};
let draft=null;
const defaults=()=>({name:'',harness:{id:'',version:''},tools:[],resources:{timeout_seconds:600},network:{mode:'unrestricted',allowed_hosts:[]},bindings:{sandbox_connection_id:'',model_connection_id:'',tools:{},connections:{}}});
export function seedAgentConnection(connection){
 draft={definition:defaults()};const bindings=draft.definition.bindings;
 if(connection.kind==='sandbox'||connection.kind==='model')bindings[`${connection.kind}_connection_id`]=connection.id;
 else if(connection.kind==='tool'){bindings.tools.tool_1=connection.id;draft.definition.tools=[{name:'tool_1',required_at_start:true}];}
 else bindings.connections.api_1=connection.id;
}
export function renderAgents(root,agents,connections,catalog,api,refresh,onError){
 const route=location.hash,params=new URLSearchParams(route.split('?')[1]??''),linked=params.get('id');
 if(!linked&&!params.has('new'))draft=null;
 if(params.has('new')&&(!draft||draft.id))draft={definition:defaults()};
 root.replaceChildren();const layout=node('div',undefined,'agent-layout');root.append(layout);const list=node('section',undefined,'quickstart-panel');layout.append(list);
 const create=node('button',t('ui.agent_create'),'primary');create.onclick=()=>{draft={definition:defaults()};location.hash='agents?new=1';};list.append(create);
 if(!agents.length)list.append(node('p',t('ui.agent_empty'),'hint'));
 const records=node('div',undefined,'agent-records');list.append(records);
 for(const agent of agents){
  const card=node('article',undefined,'agent-row');card.append(node('h2',agent.name),node('code',agent.id),node('p',t('ui.agent_revision_label',{revision:formatNumber(agent.revision),state:t(agent.archived_at?'ui.agent_archived_label':'ui.agent_active_label')}),'hint'));
  const buttons=node('div',undefined,'actions');
  for(const [key,action] of [['ui.agent_edit',async()=>{location.hash=`agents?id=${encodeURIComponent(agent.id)}`;}],['ui.agent_copy',async()=>{const copy=await api('POST',`/agents/${agent.id}/copy`,{name:t('ui.agent_copy_name',{name:agent.name})});draft={id:copy.id,revision:copy.revision,definition:copy.definition};location.hash=`agents?id=${encodeURIComponent(copy.id)}`;}],['ui.agent_archive',async()=>{if(await confirmAction(()=>t('ui.agent_archive_help'))){await api('POST',`/agents/${agent.id}/archive`);if(draft?.id===agent.id)draft=null;await refresh();}}]]){
   const b=node('button',t(key));b.disabled=key==='ui.agent_archive'&&!!agent.archived_at;b.onclick=async()=>{b.disabled=true;try{await action();}catch(e){onError(e);}finally{b.disabled=key==='ui.agent_archive'&&!!agent.archived_at;}};buttons.append(b);
  }
  const use=node('a',t('ui.agent_use'));use.href=`#quickstart?agent=${encodeURIComponent(agent.id)}`;if(!agent.archived_at)buttons.append(use);card.append(buttons);records.append(card);
 }
 list.hidden=!!linked||params.has('new');
 if(linked&&draft?.id!==linked){draft=null;api('GET',`/agents/${linked}`).then(current=>{if(location.hash!==route||!root.isConnected)return;draft={id:current.id,revision:current.revision,definition:structuredClone(current.definition),archived:!!current.archived_at,revisions:current.revisions};draw();}).catch(onError);}
 const editor=node('section',undefined,'quickstart-panel');layout.append(editor);
 function draw(){
  editor.replaceChildren();editor.hidden=!draft;layout.classList.toggle('has-editor',!!draft);if(!draft)return;
  const definition=draft.definition;definition.bindings??=defaults().bindings;const bindings=definition.bindings;
  if(!draft.id)for(const kind of ['sandbox','model']){const choices=connections.filter(c=>c.kind===kind&&c.enabled&&c.status==='ready');if(!bindings[`${kind}_connection_id`]&&choices.length===1)bindings[`${kind}_connection_id`]=choices[0].id;}
  const missing=['sandbox','model'].filter(kind=>!connections.some(c=>c.kind===kind&&c.enabled&&c.status==='ready'));
  if(missing.length){editor.append(node('p',t('ui.walk_agent_missing'),'hint'));for(const kind of missing){const a=node('a',t(kind==='sandbox'?'ui.walk_add_sandbox':'ui.walk_add_model'),'button-link');a.href=kind==='sandbox'?'#sandboxes':'#models';editor.append(a);}}

  document.getElementById('title').textContent=draft.id?definition.name||t('ui.agent_edit'):t('ui.agent_create');
  editor.append(node('p',t('ui.agent_pin_help'),'hint'));
  const form=node('form');form.noValidate=true;editor.append(form);
  const field=(id,label,value,tag='input')=>{const l=node('label',label);l.htmlFor=id;const input=node(tag);input.id=id;if(tag==='input')input.type='text';input.value=value;input.disabled=!!draft.archived;form.append(l,input);return input;};
  renderAgentBehavior(form,definition,()=>{},!!draft.archived);
  const name=field('agent-name',t('ui.agent_name'),definition.name);name.oninput=()=>definition.name=name.value;
  function select(id,label,options,value,change){const l=node('label',label);l.htmlFor=id;const input=node('hx-select');input.id=id;input.setAttribute('aria-label',label);input.setOptions([{value:'',label:t('ui.qs_select')},...options]);input.value=value;if(draft.archived)input.setAttribute('disabled','');input.onchange=()=>change(input.value);form.append(l,input);return input;}
  form.append(node('p',t('ui.walk_engine_help'),'hint'));
  const model=connections.find(c=>c.id===bindings.model_connection_id);
  if(!draft.id&&!definition.harness.id){const recommended=catalog.harnesses.find(h=>h.id==='pi'&&model&&h.model_providers.includes(model.provider));if(recommended)definition.harness={id:recommended.id,version:recommended.version};}
  if(!draft.id&&definition.harness.id==='pi')form.append(node('p',t('ui.walk_engine_default'),'hint'));
  select('agent-harness',t('ui.walk_engine'),catalog.harnesses.filter(h=>!model||h.model_providers.includes(model.provider)).map(h=>({value:`${h.id}@${h.version}`,label:`${h.id} · ${h.version}`})),`${definition.harness.id}@${definition.harness.version}`,value=>{const h=catalog.harnesses.find(h=>`${h.id}@${h.version}`===value);definition.harness=h?{id:h.id,version:h.version}:{id:'',version:''};});
  for(const [kind,key] of [['sandbox','ui.sandbox_connections'],['model','ui.model_endpoints']])select(`agent-${kind}`,t(key),connections.filter(c=>c.kind===kind).map(c=>({value:c.id,label:`${c.name} · ${c.provider} · ${t(c.enabled&&c.status==='ready'?'ui.ready':'ui.needs_attention')}`})),bindings[`${kind}_connection_id`],value=>{bindings[`${kind}_connection_id`]=value;if(kind==='model'){const model=connections.find(c=>c.id===value);const current=catalog.harnesses.find(h=>h.id===definition.harness.id&&h.version===definition.harness.version);if(current&&!current.model_providers.includes(model?.provider))definition.harness={id:'',version:''};draw();}});
  const timeout=field('agent-timeout',t('ui.agent_timeout'),String(definition.resources?.timeout_seconds??600));timeout.inputMode='numeric';timeout.oninput=()=>definition.resources={timeout_seconds:Number(timeout.value)};
  const optional=node('details');optional.append(node('summary',t('ui.walk_optional')));form.append(optional);
  for(const [kind,bindingKey,title] of [['tool','tools','ui.qs_tools'],['http','connections','ui.qs_http']]){
   const group=node('fieldset',undefined,'quickstart-bindings');group.append(node('legend',t(title)));bindings[bindingKey]??={};
   connections.filter(c=>c.kind===kind).forEach(c=>{const label=node('label'),input=node('input');input.type='checkbox';input.disabled=!!draft.archived;input.checked=Object.values(bindings[bindingKey]).includes(c.id);label.append(input,node('span',c.name));group.append(label);input.onchange=()=>{
    const existing=Object.keys(bindings[bindingKey]).find(key=>bindings[bindingKey][key]===c.id);
    if(input.checked){let n=1;while(bindings[bindingKey][`${kind}_${n}`])n++;const key=`${kind}_${n}`;bindings[bindingKey][key]=c.id;if(kind==='tool')definition.tools.push({name:key,required_at_start:true});}
    else if(existing){delete bindings[bindingKey][existing];if(kind==='tool')definition.tools=definition.tools.filter(item=>item.name!==existing);}
   };});optional.append(group);
  }
  const dependency=node('p',t('ui.agent_dependencies',{count:formatNumber([bindings.sandbox_connection_id,bindings.model_connection_id,...Object.values(bindings.tools),...Object.values(bindings.connections)].filter(Boolean).length)}),'hint');form.append(dependency);
  const advanced=node('details');advanced.append(node('summary',t('ui.agent_advanced')));const advancedLabel=node('label',t('ui.agent_definition_json'));advancedLabel.htmlFor='agent-definition';const body=node('textarea');body.id='agent-definition';body.spellcheck=false;body.value=draft.advancedText??JSON.stringify(definition,null,2);body.disabled=!!draft.archived;body.oninput=()=>draft.advancedText=body.value;advanced.ontoggle=()=>{if(advanced.open&&draft.advancedText===undefined)body.value=JSON.stringify(definition,null,2);};
  const apply=node('button',t('ui.agent_apply_json'));apply.type='button';apply.disabled=!!draft.archived;apply.onclick=()=>{try{const parsed=JSON.parse(body.value);if(!parsed||typeof parsed.name!=='string'||!parsed.harness||!Array.isArray(parsed.tools))throw new Error();draft.definition=parsed;draft.advancedText=undefined;draw();}catch{onError(new Error(t('ui.harness_invalid_json')));}};advanced.append(advancedLabel,body,node('p',t('ui.agent_json_help'),'hint'),apply);form.append(advanced);
  const status=node('p',undefined,'hint');status.setAttribute('role','status');const error=node('p',undefined,'inline-error');error.setAttribute('role','alert');error.hidden=!draft.error;if(draft.error)error.textContent=draft.error.message;
  const actions=node('div',undefined,'actions');const preflight=node('button',t('ui.agent_preflight'));preflight.type='button';preflight.disabled=!!draft.archived;
  const save=node('button',t(draft.id?'ui.save_configuration':'ui.journey_create_call'),'primary');save.type='submit';save.disabled=!!draft.archived||missing.length>0;
  const run=async(work)=>{error.hidden=true;preflight.disabled=save.disabled=true;try{await work();}catch(e){draft.error=e;markServerFields(form,e.fields,{name:'agent-name','harness.id':'agent-harness','harness.version':'agent-harness','bindings.sandbox_connection_id':'agent-sandbox','bindings.model_connection_id':'agent-model','resources.timeout_seconds':'agent-timeout'});error.textContent=e.message;error.hidden=false;}finally{preflight.disabled=save.disabled=!!draft?.archived||missing.length>0;}};
  preflight.onclick=()=>run(async()=>{await api('POST','/agents/preflight',{definition,bindings});status.textContent=t('ui.agent_preflight_passed');});
  form.onsubmit=event=>{event.preventDefault();run(async()=>{const creating=!draft.id;await api('POST','/agents/preflight',{definition,bindings});const result=await api(draft.id?'PUT':'POST',draft.id?`/agents/${draft.id}`:'/agents',draft.id?{definition,expected_revision:draft.revision}:definition);draft={id:result.id,revision:result.revision,definition:result.definition};if(creating){location.hash=`quickstart?agent=${encodeURIComponent(result.id)}`;}else await refresh();});};
  actions.append(preflight,save);form.append(error,status,actions);
  for(const revision of draft.revisions??[])editor.append(node('p',t('ui.agent_history',{revision:formatNumber(revision.revision),name:revision.name,date:formatDate(revision.created_at)}),'hint'));
 }
 draw();
}
export {renderHarnesses} from './harness-console.js';
