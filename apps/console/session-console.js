import {renderSessionSecurity} from './session-security.js';
import {renderSessionAccessEditor} from './session-access-editor.js';
import {renderAgentBehavior} from './agent-behavior.js';
import {providerIdentity} from './provider-identity.js';
import {confirmAction} from './components.js';
import {renderReusePlayground} from './session-reuse.js';
import {renderInitialization} from './session-initialization.js';
import {playgroundAction} from './playground.js';
import {localWorkspace} from './local-workspace.js';
import {t,formatDate,formatNumber} from './i18n.js';
import {sessionCode} from './session-code.js';
const node=(tag,text,css)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=text;if(css)n.className=css;return n;};
const link=(key,href,css)=>{const a=node('a',t(key),css);a.href=href;return a;};
const ready=(connections,kind)=>connections.filter(c=>c.kind===kind&&c.enabled&&c.status==='ready');
const stateKey=state=>`ui.${({executing:'running',pending:'queued',dispatched:'running',succeeded:'completed',unknown:'unknown',open:'open',closing:'cleaning_up',closed:'closed',paused:'paused',pausing:'pausing',resuming:'resuming',queued:'queued',provisioning:'provisioning',running:'running',waiting_authorization:'awaiting_authorization',waiting_approval:'awaiting_approval',cancelling:'cancelling',cancelled:'cancelled',completed:'completed',failed:'failed'})[state]??'not_started'}`;
export function renderSessionHome(root,data,connections,api){
 root.replaceChildren();if(api)renderActivity(root,api);const available=ready(connections,'sandbox').length&&ready(connections,'model').length;
 if(!available){const setup=node('section',undefined,'quickstart-panel');setup.append(node('h2',t('ui.simple_connect_first')),node('p',t('ui.simple_connect_help'),'hint'));
 for(const [kind,route,key] of [['sandbox','sandboxes','ui.sandbox_connections'],['model','models','ui.model_endpoints']]){const a=link(key,`#${route}`,'button-link');a.append(node('span',t(ready(connections,kind).length?'ui.ready':'ui.not_configured'),'badge'));setup.append(a);}root.append(setup);}

 if(!data.sessions.length){if(available)root.append(node('section',t('ui.simple_empty'),'empty'));return;}
 const wrapper=node('div',undefined,'table-wrap dense-table session-table'),table=node('table'),head=node('thead'),heading=node('tr'),body=node('tbody');
 for(const key of ['ui.dense_task','ui.execution_status','ui.dense_sandbox','ui.dense_model','ui.walk_engine','ui.dense_tools','ui.dense_updated']){const th=node('th',t(key));th.scope='col';heading.append(th);}head.append(heading);table.append(head,body);wrapper.append(table);
 for(const session of data.sessions){const row=node('tr'),task=node('td');const a=node('a',session.latest_run?.input_preview||session.definition.name||session.id,'session-task');a.href=`#sessions?id=${session.id}`;const metadata=node('div',undefined,'session-row-meta');metadata.append(node('code',session.id),node('span',t('ui.session_lifecycle_value',{state:t(stateKey(session.state))})));task.append(a,metadata);
 const model=session.definition.connections?.find(c=>c.kind==='model'),sandbox=session.definition.connections?.find(c=>c.kind==='sandbox'),status=node('td');const runState=session.latest_run?.state;status.append(node('span',t(stateKey(runState)),`badge state-${runState??'idle'}`));const workspace=node('td');workspace.append(sandbox?.provider?providerIdentity(sandbox.provider):node('span','—'));
 const harness=node('td');harness.append(node('span',session.definition.harness.id,'cell-primary'),node('small',session.definition.harness.version,'secondary'));
 row.append(task,status,workspace,node('td',model?.config?.model??model?.provider??'—'),harness,node('td',formatNumber(Object.keys(session.definition.tool_bindings??{}).length)),node('td',formatDate(session.updated_at)));body.append(row);
 }root.append(wrapper);
 const actions=node('div',undefined,'actions pagination');for(const [offset,key] of [[Math.max(0,data.offset-25),'ui.previous_page'],[data.next_offset,'ui.next_page']]){const a=link(key,`#sessions?offset=${offset}`);if(offset===null||(key==='ui.previous_page'&&!data.offset)){a.removeAttribute('href');a.setAttribute('aria-disabled','true');}actions.append(a);}root.append(actions);
}
let draft={key:'',journal:crypto.randomUUID(),sandbox:'',model:'',harness:'',tools:[],prompt:null,language:'python'};
export async function renderSessionExample(root,connections,catalog,ingress,api){
 if(new URLSearchParams(location.hash.split('?')[1]??'').has('from_session'))return renderReusePlayground(root,connections,catalog,api);
 const query=new URLSearchParams(location.hash.split('?')[1]??'');const key=query.get('new');if(key&&draft.key!==key)draft={...draft,key,journal:crypto.randomUUID(),prompt:null};
 const selectedHarness=query.get('harness');
 if(selectedHarness&&draft.key!==`harness:${selectedHarness}`){
  const h=catalog.harnesses.find(h=>`${h.id}@${h.version}`===selectedHarness);
  if(h){draft={...draft,key:`harness:${selectedHarness}`,harness:selectedHarness,journal:crypto.randomUUID()};
   draft.model=ready(connections,'model').find(c=>h.model_providers.includes(c.provider))?.id??'';
   draft.sandbox=ready(connections,'sandbox').find(c=>!h.image||catalog.connections?.find(p=>p.kind==='sandbox'&&p.provider===c.provider)?.capabilities.includes('oci_image'))?.id??'';}
 }
 const session=query.get('session');root.replaceChildren();
 
 root.append(node('p',t('ui.simple_example_help'),'hint'));
 const layout=node('div',undefined,'quickstart-layout'),form=node('section',undefined,'quickstart-panel'),output=node('section',undefined,'quickstart-panel');layout.append(form,output);root.append(layout);
 const select=(id,key,options,value,onchange)=>{const label=node('label',t(key));label.htmlFor=id;const input=node('hx-select');input.id=id;input.setAttribute('aria-label',t(key));input.setOptions(options);input.value=value;input.onchange=onchange;form.append(label,input);return input;};
 if(session)form.append(node('h2',t('ui.journey_continue_session')),node('code',session));
 else {
  for(const [kind,key] of [['sandbox','ui.sandbox_connections'],['model','ui.model_endpoints']]){const rows=ready(connections,kind);if(!rows.some(c=>c.id===draft[kind]))draft[kind]=rows.length===1?rows[0].id:'';const input=select(`direct-${kind}`,key,[{value:'',label:t('ui.select_an_option')},...rows.map(c=>({value:c.id,label:c.name}))],draft[kind],()=>{draft[kind]=input.value;renderSessionExample(root,connections,catalog,ingress,api);});if(!rows.length)form.append(configLink(kind==='sandbox'?'#sandboxes':'#models'));}
  const model=connections.find(c=>c.id===draft.model),sandbox=connections.find(c=>c.id===draft.sandbox),provider=catalog.connections?.find(p=>p.kind==='sandbox'&&p.provider===sandbox?.provider);const engines=catalog.harnesses.filter(h=>h.capabilities.includes('conversation')&&(!model||h.model_providers.includes(model.provider))&&(!h.image||!sandbox||(provider?.capabilities.includes('oci_image')&&(!h.image.registry_secret_id||provider.capabilities.includes('private_oci_image')))));
  if(sandbox)form.append(node('p',t(provider?.capabilities.includes('pause_resume')?'ui.session_pause_help':provider?.capabilities.includes('automatic_standby')?'ui.session_provider_standby_help':'ui.session_retained_help'),'hint'));
  if(!engines.some(h=>`${h.id}@${h.version}`===draft.harness)){const h=engines.find(h=>h.id==='pi')??engines[0];draft.harness=h?`${h.id}@${h.version}`:'';}
  const engine=select('direct-harness','ui.walk_engine',engines.map(h=>({value:`${h.id}@${h.version}`,label:`${h.name??h.id} · ${h.version}${h.image?' · OCI':''}`})),draft.harness,()=>{draft.harness=engine.value;renderSessionExample(root,connections,catalog,ingress,api);});
  if(!engines.length)form.append(configLink('#harnesses'));
  draft.behavior??={};renderAgentBehavior(form,draft.behavior,()=>update());
  const tools=node('details');tools.append(node('summary',t('ui.qs_tools')));const enabled=ready(connections,'tool');draft.tools=draft.tools.filter(id=>enabled.some(c=>c.id===id));
  if(!enabled.length)tools.append(node('p',t('ui.simple_tools_optional'),'hint'),configLink('#tools'));
  for(const c of enabled){const label=node('label',undefined,'direct-tool'),input=node('input');input.type='checkbox';input.checked=draft.tools.includes(c.id);input.onchange=()=>{draft.tools=input.checked?[...draft.tools,c.id]:draft.tools.filter(id=>id!==c.id);update();};label.append(input,node('span',c.name));tools.append(label);}form.append(tools);
 }
 const accessInput=session?()=>({}):renderSessionAccessEditor(form,draft,connections,()=>update());
 const label=node('label',t('ui.qs_prompt'));label.htmlFor='direct-prompt';const prompt=node('textarea');prompt.id='direct-prompt';prompt.value=draft.prompt??t('ui.qs_default_prompt');prompt.oninput=()=>{draft.prompt=prompt.value;update();};form.append(label,prompt);
 const header=node('div',undefined,'code-heading');header.append(node('h2',t('ui.run_example')));const languages=node('div',undefined,'language-tabs');languages.id='direct-language';languages.setAttribute('role','tablist');languages.setAttribute('aria-label',t('ui.sdk_language'));
 for(const [value,label] of [['python','Python'],['typescript','TypeScript']]){const tab=node('button',label);tab.type='button';tab.setAttribute('role','tab');tab.dataset.language=value;tab.onclick=()=>{draft.language=value;paintLanguage();update();};languages.append(tab);}
 function paintLanguage(){for(const tab of languages.children){const active=tab.dataset.language===draft.language;tab.setAttribute('aria-selected',String(active));tab.tabIndex=active?0:-1;}}
 languages.onkeydown=event=>{if(['ArrowLeft','ArrowRight','Home','End'].includes(event.key)){event.preventDefault();const target=event.key==='Home'?0:event.key==='End'?1:draft.language==='python'?1:0;languages.children[target].click();languages.children[target].focus();}};paintLanguage();header.append(languages);output.append(header,node('p',t('ui.run_location'),'hint'));
 if(localWorkspace())output.append(node('p',t('ui.local_sdk_short'),'hint'));else output.append(link('ui.journey_token',session?`#tokens?session=${session}`:'#tokens'),node('p',t('ui.walk_saved_token'),'hint'));
 const commands=node('pre');commands.id='direct-command';output.append(commands);
 const download=node('button',t('ui.qs_download'),'primary');const copy=node('button',t('ui.qs_copy'));const actions=node('div',undefined,'actions pagination');actions.append(download,copy);output.append(actions);
 const status=node('p',undefined,'hint');status.setAttribute('role','status');output.append(status);
 const disclosure=node('details');disclosure.append(node('summary',t('ui.qs_source')));const code=node('pre');code.id='direct-code';disclosure.append(node('p',t('ui.simple_env_help'),'hint'),code);output.append(disclosure);
 const later=node('details');later.append(node('summary',t('ui.walk_later_commands')),node('p',t('ui.walk_later_help'),'hint'));const next=node('pre');later.append(next);output.append(later);
 copy.onclick=async()=>{try{await navigator.clipboard.writeText(code.textContent);status.textContent=t('ui.snippet_copied');}catch{status.textContent=t('ui.copy_unavailable');}};
 download.onclick=()=>{const url=URL.createObjectURL(new Blob([code.textContent],{type:'text/plain;charset=utf-8'}));const a=node('a');a.href=url;a.download=draft.language==='python'?'hexagon-session.py':'hexagon-session.mts';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);};
 function update(){let access,accessValid=true;try{access=accessInput();}catch{accessValid=false;access={env:{},connections:{}};}const harness=catalog.harnesses.find(h=>`${h.id}@${h.version}`===draft.harness);const valid=accessValid&&prompt.value.trim()&&(session||(draft.sandbox&&draft.model&&harness&&(!draft.tools.length||harness.capabilities.includes('tools'))));download.disabled=copy.disabled=!valid;status.textContent=t(valid?'ui.simple_generated':'ui.qs_incomplete');
 const definition={...draft.behavior,harness:harness?{id:harness.id,version:harness.version}:undefined,sandbox_connection_id:draft.sandbox,model_connection_id:draft.model,tools:Object.fromEntries(draft.tools.map((id,i)=>[`tool_${i+1}`,id])),...access};
 code.textContent=valid?sessionCode({language:draft.language,base:location.origin,agentId:'',bindings:{},sessionId:session||undefined,sessionDefinition:definition,localDirectory:localWorkspace(),prompt:prompt.value}):'';
 const executable=draft.language==='python'?'.venv/bin/python hexagon-session.py':'npx tsx hexagon-session.mts';const install=draft.language==='python'?'python3 -m venv .venv\n.venv/bin/python -m pip install ./sdk/python':'npm --prefix sdk/typescript run build\nnpm install ./sdk/typescript';
 commands.textContent=install+(localWorkspace()?'':"\nexport HEXAGON_API_TOKEN='YOUR_APPLICATION_TOKEN'")+`\nexport HEXAGON_JOURNAL='hexagon-${session??draft.journal}.json'\n${executable}${session?' --new-turn':''}`;next.textContent=`${executable} --resume --stream\n${executable} --new-turn\n${executable} --close`;
 }
 const run=playgroundAction(form,{api,getInput:()=>({sessionId:session||undefined,definition:{...draft.behavior,harness:catalog.harnesses.find(h=>`${h.id}@${h.version}`===draft.harness),sandbox_connection_id:draft.sandbox,model_connection_id:draft.model,tools:Object.fromEntries(draft.tools.map((id,i)=>[`tool_${i+1}`,id])),...accessInput()},input:prompt.value}),isValid:()=>!download.disabled});
 update();
}

export function renderSettings(root){root.replaceChildren();for(const [route,key] of [['tokens','ui.tokens'],['network','ui.network_settings'],['secrets','ui.secrets'],['http','ui.protected_apis'],['agents','ui.agents'],['operations','ui.resource_operations']])root.append(link(key,`#${route}`,'settings-link'));}
export async function renderSessionDetail(target,id,{api,showRun,isCurrent}){
 // Assemble all turns off-screen so polling never blanks an existing conversation.
 const root=node('div');
 const commit=()=>{if(!isCurrent())return;target.classList.add('session-detail');target.replaceChildren(...root.childNodes);target.dataset.live=root.dataset.live??'false';};
 const [session,data]=await Promise.all([api('GET',`/sessions/${id}`),api('GET',`/sessions/${id}/runs`)]);if(!isCurrent())return;
 root.replaceChildren();root.classList.add('session-detail');document.getElementById('title').textContent=session.definition.name==='Session'&&!session.agent_id?id.slice(0,8):session.definition.name||id.slice(0,8);
 const initialization=new URLSearchParams(location.hash.split('?')[1]??'').get('view')==='initialization';
 const tabs=node('nav',undefined,'session-view-tabs');tabs.setAttribute('aria-label',t('ui.init_navigation'));
 for(const [key,suffix,active]of [['ui.init_conversation','',!initialization],['ui.init_title','&view=initialization',initialization]]){const tab=link(key,`#sessions?id=${id}${suffix}`);if(active)tab.setAttribute('aria-current','page');tabs.append(tab);}const context=node('span',`${session.definition.harness.id} · ${session.definition.harness.version}`,'session-context');tabs.append(context,link('ui.simple_diagnostics',`#fleet?session=${id}`,'session-diagnostics'));root.append(tabs);
 renderLifecycle(root,session,api);
 if(initialization){const snapshot=await api('GET',`/sessions/${id}/initialization`);if(!isCurrent())return;renderInitialization(root,snapshot);await renderSessionSecurity(root.querySelector('.initialization'),id,api);if(!isCurrent())return;commit();return;}
 if(!data.runs.length){root.append(node('p',t('ui.simple_no_turn'),'hint'),link('ui.simple_api',`#quickstart?session=${id}`,'button-link'));commit();return;}
 const chosen=new URLSearchParams(location.hash.split('?')[1]??'').get('run');
 const conversation=node('div',undefined,'conversation');root.append(conversation);
 const runs=[...data.runs].reverse();let live=false;
 for(const [i,run] of runs.entries()){
  if(!isCurrent())return;
  const turn=node('article',undefined,'conversation-turn');turn.id=`turn-${run.id}`;turn.setAttribute('aria-label',t('ui.simple_turn',{number:formatNumber(i+1)}));
  if(runs.length>1)turn.append(node('div',t('ui.simple_turn',{number:formatNumber(i+1)}),'turn-divider'));
  const result=node('div',undefined,'run-transcript');turn.append(result);conversation.append(turn);
  await showRun(run.id,result,{history:i<runs.length-1});live ||= result.dataset.live==='true';
 }
 if(isCurrent()){root.dataset.live=String(live);commit();if(chosen)document.getElementById(`turn-${chosen}`)?.scrollIntoView({block:'nearest'});}
}

function configLink(href){const a=link('ui.configure_new_tab',href,'configure-link');a.target='_blank';a.rel='noopener';return a;}
let activityPeriod='24h';
function renderActivity(root,api){
 const panel=node('section',undefined,'session-dashboard');panel.setAttribute('aria-label',t('ui.session_activity'));root.append(panel);
 const load=async()=>{panel.setAttribute('aria-busy','true');try{
 const data=await api('GET','/sessions/activity?period='+activityPeriod);if(!panel.isConnected)return;panel.replaceChildren();
 const metric=node('div');metric.append(node('h2',t('ui.active_sessions')),node('strong',formatNumber(data.active_sessions),'metric'),node('p',t('ui.session_idle_counts',{idle:formatNumber(data.idle_sessions),paused:formatNumber(data.paused_sessions)})));
 const trend=node('div'),heading=node('div',undefined,'trend-heading');heading.append(node('h2',t('ui.session_activity')));
 const switches=node('div');for(const period of ['24h','7d']){const b=node('button',t(period==='24h'?'ui.period_24h':'ui.period_7d'));b.setAttribute('aria-pressed',String(period===activityPeriod));b.onclick=()=>{activityPeriod=period;load();};switches.append(b);}heading.append(switches);
 const bars=node('div',undefined,'session-trend');bars.setAttribute('role','img');bars.setAttribute('aria-label',t('ui.session_activity')+': '+data.buckets.map(b=>formatDate(b.start)+' — '+formatNumber(b.active_sessions)).join('; '));const max=Math.max(1,...data.buckets.map(b=>b.active_sessions));
 for(const b of data.buckets){const bar=node('span');bar.style.height=(b.active_sessions/max*100)+'%';bar.title=formatDate(b.start)+': '+formatNumber(b.active_sessions);bars.append(bar);}
 const scale=node('div',undefined,'trend-scale');scale.append(node('span',formatDate(data.buckets[0]?.start)),node('span',t('ui.activity_peak',{count:formatNumber(max===1&&data.buckets.every(b=>!b.active_sessions)?0:max)})),node('span',formatDate(data.checked_at)));trend.append(heading,bars,scale,node('p',t('ui.session_activity_definition')));panel.append(metric,trend);
 }catch{panel.textContent=t('ui.activity_unavailable');}finally{panel.removeAttribute('aria-busy');}};
 load();
}
function renderLifecycle(root,session,api){
 if(['closed','closing'].includes(session.state))return;
 const controls=node('div',undefined,'session-lifecycle-actions');root.append(controls);
 const paused=session.state!=='open';controls.append(node('p',t(paused?'ui.session_paused_help':session.definition.capabilities?.includes('pause_resume')?'ui.session_pause_help':session.definition.capabilities?.includes('automatic_standby')?'ui.session_provider_standby_help':'ui.session_retained_help')));
 const actions=session.state==='pausing'?[['pause','ui.reconcile_pause',{scope:session.pause_scope}]]:paused?[['resume','ui.resume_session',{}]]:session.definition.capabilities?.includes('pause_resume')?[['pause','ui.pause_compute',{scope:'sandbox'}]]:[['pause','ui.pause_session',{scope:'session'}]];
 for(const [action,key,body]of actions){const b=node('button',t(key));b.onclick=async()=>{if(!await confirmAction(t(action==='resume'?'ui.resume_confirm':body.scope==='sandbox'?'ui.pause_compute_confirm':'ui.pause_confirm')))return;b.disabled=true;try{await api('POST','/sessions/'+session.id+'/'+action,body);location.reload();}catch(e){controls.querySelector('p').textContent=e.message;b.disabled=false;}};controls.append(b);}
}
