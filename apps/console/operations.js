import {t,formatNumber,formatDate} from './i18n.js';
const node=(tag,text,css)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=text;if(css)n.className=css;return n;};
const stateKey=state=>`ui.${({open:'open',closed:'closed',closing:'cleaning_up',queued:'queued',provisioning:'provisioning',running:'running',waiting_authorization:'awaiting_authorization',waiting_approval:'awaiting_approval',cancelling:'cancelling',cancelled:'cancelled',completed:'completed',failed:'failed',runtime_ready:'ready',stopped:'stopped',destroyed:'destroyed',starting:'starting',ready:'ready',unreachable:'unreachable_process_state_unknown',interrupted:'interrupted_environment_recovery_required'})[state]??'unknown'}`;
export function renderOverview(root,data,health){
 root.replaceChildren();const grid=node('div',undefined,'states');
 for(const [key,route] of [['ready_connections','sandboxes'],['open_sessions','sessions'],['active_runs','runs'],['pending_approvals','pending'],['pending_authorizations','pending'],['unknown_operations','operations'],['active_agents','agents']]){const card=node('a',undefined,'quickstart-panel');card.href=`#${route}`;card.append(node('p',t(`ui.overview_${key}`)),node('h2',formatNumber(data[key])));grid.append(card);}root.append(grid,node('p',t('ui.overview_checked',{date:formatDate(data.checked_at)}),'hint'));
 const service=node('section',undefined,'quickstart-panel');service.append(node('h2',t('ui.overview_health')));
 for(const [key,value] of [['api',health.api],['database',health.database],['credentials',health.credentials?.state],['execution',health.execution?.state],['ingress',health.credential_access?.state]])service.append(node('p',t(`ui.overview_health_${key}`,{state:t(value==='ready'||value==='running'||value==='reachable'?'ui.ready':'ui.needs_attention')})));
 const setup=node('a',t('ui.setup_title'));setup.href='#setup';service.append(setup);root.append(service);
}
export function renderExecutionList(root,kind,data,api,onError){
 root.replaceChildren();const params=new URLSearchParams(location.hash.split('?')[1]??'');
 const form=node('form',undefined,'actions');form.noValidate=true;
 const search=node('input');search.type='text';search.value=params.get('search')??'';search.setAttribute('aria-label',t(kind==='runs'?'ui.walk_task_search':'ui.execution_search'));search.placeholder=t(kind==='runs'?'ui.walk_task_search':'ui.execution_search');const status=node('hx-select');status.setAttribute('aria-label',t('ui.filter_status'));const options=kind==='sessions'?['open','closing','closed']:['queued','provisioning','running','waiting_authorization','waiting_approval','cancelling','completed','failed','cancelled'];status.setOptions([{value:'',label:t('ui.all_statuses')},...options.map(value=>({value,label:t(stateKey(value))}))]);status.value=params.get('state')??'';
 const apply=node('button',t('ui.execution_filter'));apply.type='submit';form.append(search,status,apply);form.onsubmit=e=>{e.preventDefault();location.hash=`${kind}?search=${encodeURIComponent(search.value)}&state=${status.value}`;};if(kind!=='pending')root.append(form);
 const rows=data[kind]??data.items;
 if(!rows.length)root.append(node('p',t('ui.execution_empty'),'hint'));
 const list=node('div',undefined,'resource-list');root.append(list);
 for(const row of rows){const card=node('section',undefined,'record-row execution-row');const identity=node('div',undefined,'execution-identity');card.append(identity);const link=node('a',kind==='runs'?(row.input_preview||row.id):row.id);if(row.agent_name)identity.append(node('h2',row.agent_name));link.href=row.kind==='resource'?'#operations':kind==='sessions'?`#fleet?session=${row.id}`:`#runs?id=${row.run_id??row.id}`;identity.append(link);card.append(node('p',row.kind?t(`ui.pending_${row.kind}`):t(stateKey(row.state)),'hint'),node('p',formatDate(row.created_at),'hint'));
  if(row.session_id){const session=node('a',t('ui.walk_resource'));session.href=`#fleet?session=${row.session_id}`;card.append(session);}
  if(kind==='sessions'&&row.state==='open'){const next=node('a',t('ui.journey_continue_session'));next.href=`#quickstart?session=${encodeURIComponent(row.id)}`;card.append(next);}
  if(kind==='sessions'){card.append(node('p',t('ui.execution_resource_states',{session:t(stateKey(row.state)),sandbox:row.sandbox?.state?t(stateKey(row.sandbox.state)):t('ui.not_allocated'),runtime:row.runtime_state?t(stateKey(row.runtime_state)):t('ui.not_started')}),'hint'));}
  if(row.kind==='approval'){const review=node('a',t('ui.execution_review_action'));review.href=`#runs?id=${row.run_id}`;card.append(review);}
  list.append(card);
 }
 const pages=node('div',undefined,'actions pagination');for(const [offset,key] of [[Math.max(0,data.offset-25),'ui.previous_page'],[data.next_offset,'ui.next_page']]){const a=node('a',t(key));const q=new URLSearchParams(params);q.set('offset',String(offset));a.href=`#${kind}?${q}`;if(offset===null||(key==='ui.previous_page'&&!data.offset)){a.removeAttribute('href');a.setAttribute('aria-disabled','true');}pages.append(a);}root.append(pages);
}
export function journeyState(health,connections,agents,completedRuns=[]){
 const ready=kind=>connections.some(c=>c.kind===kind&&c.enabled&&c.status==='ready');
 const agent=agents.find(a=>!a.archived_at);
 const healthy=health.api==='ready'&&health.database==='ready';
 return {healthy,sandbox:ready('sandbox'),model:ready('model'),agent,completed:completedRuns.length>0,
  next:!healthy?'network':!ready('sandbox')?'sandboxes':!ready('model')?'models':!agent?'agents':completedRuns.length?'runs':'quickstart'};
}
export function renderSetup(root,health,connections,agents,completedRuns=[]){
 root.replaceChildren();const state=journeyState(health,connections,agents,completedRuns);
 const call=agents.filter(a=>!a.archived_at).length===1?`#quickstart?agent=${encodeURIComponent(state.agent.id)}`:'#quickstart';
 const steps=[
  {key:'prepare',route:!state.healthy?'network':!state.sandbox?'sandboxes':'models',done:state.healthy&&state.sandbox&&state.model},
  {key:'agent',route:'agents',done:!!state.agent},
  {key:'call',route:'quickstart',done:state.completed},
  {key:'results',route:'runs',done:state.completed}
 ];
 const current=steps.find(s=>s.route===state.next)??steps[0];
 const hero=node('section',undefined,'journey-hero');hero.append(node('p',t('ui.journey_next'),'eyebrow'),node('h2',t(!state.healthy?'ui.journey_health':`ui.journey_${current.key}`)),node('p',t(!state.healthy?'ui.journey_health_help':`ui.journey_${current.key}_help`)));
 const action=node('a',t('ui.journey_open'),'button-link primary');action.href=state.next==='quickstart'?call:`#${state.next}`;hero.append(action);root.append(hero);
 const list=node('ol',undefined,'journey-checklist');
 steps.forEach((step,i)=>{const card=node('li');const title=node('a',t(`ui.journey_${step.key}`));title.href=step.route==='quickstart'?call:`#${step.route}`;card.append(node('span',formatNumber(i+1),'journey-number'),title,node('p',t(`ui.journey_${step.key}_help`),'hint'));
  if(step.key==='prepare'){const links=node('div',undefined,'actions');for(const [route,key,done] of [['sandboxes','ui.setup_sandbox',state.sandbox],['models','ui.setup_model',state.model]]){const a=node('a',t(key));a.href=`#${route}`;a.append(node('span',t(done?'ui.journey_configured':'ui.setup_action_needed'),'badge'));links.append(a);}card.append(links);}
  else card.append(node('span',t(step.done?(step.key==='results'?'ui.journey_done':'ui.journey_configured'):step.key==='call'&&state.agent?'ui.journey_ready_call':step.key==='results'?'ui.journey_waiting_call':'ui.setup_action_needed'),'secondary'));
  list.append(card);
 });root.append(list,node('p',t('ui.journey_readiness'),'hint'));
 const optional=node('details',undefined,'journey-optional');optional.append(node('summary',t('ui.journey_optional')),node('p',t('ui.journey_optional_help'),'hint'));
 for(const [route,key] of [['tools','ui.tools'],['http','ui.protected_apis'],['harnesses','ui.harnesses']]){const a=node('a',t(key));a.href=`#${route}`;optional.append(a);}root.append(optional);
}
