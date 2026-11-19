import {markServerFields} from './components.js';
import {t,formatDate,formatNumber} from './i18n.js';
const el=(tag,text,css)=>{const node=document.createElement(tag);if(text!==undefined)node.textContent=text;if(css)node.className=css;return node;};
const textInput=(root,id,label,value='')=>{const l=el('label',label);l.htmlFor=id;const input=el('input');input.id=id;input.type='text';input.value=value;root.append(l,input);return input;};
const select=(root,id,label,items,value)=>{const l=el('label',label);l.htmlFor=id;const input=el('hx-select');input.id=id;input.setAttribute('aria-label',label);root.append(l,input);input.setOptions(items);input.value=value;return input;};
let networkDraft;
const operationNotes=new Map();
export function renderNetwork(root,saved,health,api,onError){
 const draft=networkDraft??saved.config;
 root.replaceChildren();const panel=el('section',undefined,'quickstart-panel');root.append(panel);
 panel.append(el('h2',t('ui.network_settings')),el('p',t('ui.network_help'),'hint'));
 const form=el('form');form.noValidate=true;panel.append(form);
 const proxy=textInput(form,'network-proxy',t('ui.outbound_proxy'),draft.outbound_proxy||'');
 const bypass=textInput(form,'network-bypass',t('ui.direct_domains'),draft.no_proxy.join(', '));
 form.append(el('p',t('ui.network_credentials_hint'),'hint'));
 const mode=select(form,'network-mode',t('ui.ingress_mode'),[{value:'cloudflare',label:t('ui.ingress_development')},{value:'external',label:t('ui.ingress_external')},{value:'disabled',label:t('ui.disabled')}],draft.ingress.mode);
 const url=textInput(form,'network-url',t('ui.ingress_url'),draft.ingress.url||'');
 const remember=()=>{networkDraft={outbound_proxy:proxy.value,no_proxy:bypass.value.split(','),ingress:{mode:mode.value,url:url.value}};};
 const paint=()=>{url.disabled=mode.value!=='external';};mode.onchange=()=>{paint();remember();};form.oninput=remember;paint();
 const error=el('p',undefined,'inline-error');error.hidden=true;error.setAttribute('role','alert');const status=el('p',saved.restart_required?t('ui.network_restart_required'):t('ui.network_saved_active'),'hint');status.setAttribute('role','status');
 const save=el('button',t('ui.save_configuration'),'primary');save.type='submit';form.append(error,status,save);
 form.onsubmit=async event=>{event.preventDefault();save.disabled=true;error.hidden=true;try{
  const config={...(proxy.value.trim()?{outbound_proxy:proxy.value.trim()}:{}),no_proxy:bypass.value.split(',').map(s=>s.trim()).filter(Boolean),ingress:{mode:mode.value,...(mode.value==='external'?{url:url.value.trim()}: {})}};
  const result=await api('PUT','/deployment',{config,expected_revision:saved.revision});saved=result;networkDraft=undefined;status.textContent=t('ui.network_restart_required');
 }catch(e){error.textContent=e.message;error.hidden=false;markServerFields(form,e.fields,{'config.outbound_proxy':'network-proxy','config.no_proxy':'network-bypass','config.ingress.url':'network-url'});}finally{save.disabled=false;}};
 panel.append(el('pre',t('ui.network_restart_command')),el('p',t('ui.network_override_help'),'hint'));
 const checks=el('section',undefined,'quickstart-panel api-reference');checks.append(el('h2',t('ui.network_checks')));
 for(const [key,route] of [['ui.network_provider_check','#sandboxes'],['ui.network_model_check','#models'],['ui.network_guest_check','#quickstart']]){const line=el('p');const link=el('a',t(key));link.href=route;line.append(link);checks.append(line);}
 checks.append(el('p',t('ui.network_loopback_check',{state:health.credential_access?.state==='reachable'?t('ui.ready'):t('ui.needs_attention')}),'hint'));
 const recovery=health.credential_access?.recovery;
 if(recovery?.state==='recovering'||recovery?.state==='checking')checks.append(el('p',t('ui.platform_recovering'),'hint'));
 if(recovery?.state==='blocked')checks.append(el('p',t('ui.platform_recovery_blocked'),'hint'));
 if(recovery?.state==='unavailable'&&recovery.retry_at)checks.append(el('p',t('ui.platform_retry_at',{time:formatDate(recovery.retry_at,true)}),'hint'));
 if(saved.ingress?.state==='unavailable'||saved.ingress?.state==='starting')checks.append(el('p',t(saved.ingress.state==='starting'?'ui.ingress_starting':'ui.ingress_unavailable'),'hint'));
 const retry=el('button',t('ui.retry_ingress'));retry.type='button';retry.disabled=saved.config.ingress.mode!=='cloudflare';retry.onclick=async()=>{retry.disabled=true;try{await api('POST','/deployment/ingress/retry');status.textContent=t('ui.ingress_starting');}catch(e){onError(e);}finally{retry.disabled=false;}};checks.append(retry);const stop=el('button',t('ui.stop_ingress'));stop.type='button';stop.disabled=saved.config.ingress.mode!=='cloudflare'||saved.ingress?.state==='disabled';stop.onclick=async()=>{stop.disabled=true;try{await api('POST','/deployment/ingress/stop');status.textContent=t('ui.ingress_stopped');}catch(e){onError(e);stop.disabled=false;}};checks.append(stop);root.append(checks);
}
export function renderOperations(root,data,api,reload,onError,offset=0){
 root.replaceChildren();root.append(el('p',t('ui.operations_help'),'hint'));
 if(!data.operations.length)root.append(el('p',t('ui.no_resource_operations')));
 const list=el('div',undefined,'resource-list');root.append(list);
 for(const op of data.operations){
  const outcome=op.kind==='image_prepare'&&op.state==='pending'?t('ui.image_building'):t(`ui.operation_outcome_${op.state}`);
  const card=el('details',undefined,'record-row operation-row');const heading=el('summary',`${op.provider} · ${t(({create:'ui.create_resource',delete:'ui.delete_resource',image_prepare:'ui.image_prepare_resource',checkpoint:'ui.checkpoint_resource',restore:'ui.restore_resource'})[op.kind]??'ui.resource_operation')} · ${outcome}`);card.open=op.state==='unknown';card.append(heading,el('p',op.id,'secondary'),el('p',t('ui.operation_state',{state:outcome,review:t(`ui.operation_review_${op.review_state}`)}),'hint'),el('p',t('ui.operation_checks',{count:formatNumber(op.attempt_count),last:op.last_checked_at?formatDate(op.last_checked_at):t('ui.none'),next:op.next_check_at?formatDate(op.next_check_at):t('ui.none')}),'hint'));
  const link=el('a',op.session_id);link.href=`#fleet?session=${encodeURIComponent(op.session_id)}`;card.append(link);
  if(op.reason)card.append(el('p',t('ui.operation_reason',{code:op.reason}),'hint'));
  if(op.provider_resource_id)card.append(el('code',op.provider_resource_id));
  if(op.failure||op.provider_operation_id||op.provider_build_id){const evidence=el('details');evidence.append(el('summary',t('ui.operation_evidence')),el('pre',JSON.stringify({provider_operation_id:op.provider_operation_id,provider_build_id:op.provider_build_id,failure:op.failure},null,2)));card.append(evidence);}
  if(op.state==='unknown'){
   const note=textInput(card,`operation-note-${op.id}`,t('ui.operation_note'),operationNotes.get(op.id)??'');note.oninput=()=>operationNotes.set(op.id,note.value);note.maxLength=2000;card.append(el('p',t('ui.operation_note_help'),'hint'));
   const actions=el('div',undefined,'actions');
   for(const [action,key] of [['reconcile','ui.operation_reconcile'],[op.review_state==='acknowledged'?'reopen':'acknowledge',op.review_state==='acknowledged'?'ui.operation_reopen':'ui.operation_acknowledge']]){
    const b=el('button',t(key));b.type='button';b.onclick=async()=>{actions.querySelectorAll('button').forEach(n=>n.disabled=true);try{await api('POST',`/resource-operations/${op.id}/review`,{action,note:note.value});operationNotes.delete(op.id);await reload();}catch(e){onError(e);actions.querySelectorAll('button').forEach(n=>n.disabled=false);}};actions.append(b);
   }card.append(actions);
  }
  const history=el('details');history.append(el('summary',t('ui.operation_history')));const entries=el('div');history.append(entries);let loaded=false;
  history.ontoggle=async()=>{if(!history.open||loaded)return;try{const detail=await api('GET',`/resource-operations/${op.id}`);entries.replaceChildren();for(const review of detail.reviews){entries.append(el('p',t('ui.operation_history_entry',{date:formatDate(review.created_at),action:t(`ui.operation_action_${review.action}`)})),el('p',review.note));}if(!detail.reviews.length)entries.append(el('p',t('ui.operation_history_empty'),'hint'));loaded=true;}catch(e){entries.textContent=e.message;}};card.append(history);list.append(card);
 }
 const pager=el('div',undefined,'actions pagination');for(const [target,key] of [[Math.max(0,offset-50),'ui.previous_page'],[data.next_offset,'ui.next_page']]){const b=el('button',t(key));b.disabled=key==='ui.previous_page'?offset===0:target===null;b.onclick=async()=>{try{renderOperations(root,await api('GET',`/resource-operations?offset=${target}&limit=50`),api,reload,onError,target);}catch(e){onError(e);}};pager.append(b);}root.append(pager);
}
