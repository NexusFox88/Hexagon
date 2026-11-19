import {t,formatDate} from './i18n.js';
import {localWorkspace} from './local-workspace.js';
import {confirmAction,markServerFields} from './components.js';
const node=(tag,text,css)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=text;if(css)n.className=css;return n;};
let tokenDraft={label:'',days:'30'};
export function renderTokens(root,data,api,refresh,onError){
 root.replaceChildren();const query=new URLSearchParams(location.hash.split('?')[1]??'');
 const returnTo=query.has('agent')?`#quickstart?agent=${encodeURIComponent(query.get('agent'))}`:query.has('session')?`#quickstart?session=${encodeURIComponent(query.get('session'))}`:'#quickstart';
 const back=node('a',t('ui.walk_back_call'),'button-link');back.href=returnTo;root.append(node('p',t(localWorkspace()?'ui.local_sdk_access':'ui.walk_saved_token'),'hint'),back);
 const form=node('form',undefined,'quickstart-panel');form.noValidate=true;form.append(node('p',t('ui.token_scope'),'hint'));
 const field=(id,key)=>{const l=node('label',key);l.htmlFor=id;const input=node('input');input.type='text';input.id=id;form.append(l,input);return input;};
 const label=field('token-label',t('ui.token_label')),days=field('token-days',t('ui.token_days'));days.inputMode='numeric';label.value=tokenDraft.label;days.value=tokenDraft.days;form.oninput=()=>{tokenDraft={label:label.value,days:days.value};};
 const error=node('p',undefined,'inline-error');error.setAttribute('role','alert');error.hidden=true;form.append(error);
 const create=node('button',t('ui.token_create'),'primary');create.type='submit';form.append(create);const secret=node('section',undefined,'quickstart-panel');secret.hidden=true;
 function reveal(result){secret.hidden=false;secret.replaceChildren(node('h2',t('ui.token_copy_now')),node('p',t('ui.token_once'),'hint'));const code=node('code',result.token);const copy=node('button',t('ui.copy'));copy.onclick=async()=>{try{await navigator.clipboard.writeText(result.token);copy.textContent=t('ui.snippet_copied');}catch{onError(new Error(t('ui.copy_unavailable')));}};const dismiss=node('button',t('ui.token_dismiss'));dismiss.onclick=()=>{secret.replaceChildren();secret.hidden=true;refresh();};const next=node('a',t('ui.walk_back_call'),'button-link');next.href=returnTo;next.onclick=()=>{secret.replaceChildren();secret.hidden=true;};secret.append(code,copy,dismiss,next);code.tabIndex=0;code.focus();}
 form.onsubmit=async event=>{event.preventDefault();create.disabled=true;error.hidden=true;try{const result=await api('POST','/tokens',{label:label.value,expires_in_days:Number(days.value)});reveal(result);}catch(e){error.textContent=e.message;error.hidden=false;markServerFields(form,e.fields,{label:'token-label',expires_in_days:'token-days'});}finally{create.disabled=false;}};const creation=node('details',undefined,'configuration-disclosure');creation.append(node('summary',t('ui.token_create')),form);root.append(creation,secret);
 const list=node('div',undefined,'resource-list');root.append(list);
 for(const token of data.tokens){const card=node('section',undefined,'record-row token-row');const identity=node('div',undefined,'token-identity');identity.append(node('h2',token.label),node('code',token.id));card.append(identity,node('p',t(token.role==='owner'?'ui.token_owner':'ui.token_application'),'hint'),node('p',t('ui.token_dates',{expires:token.expires_at?formatDate(token.expires_at):t('ui.none'),used:token.last_used_at?formatDate(token.last_used_at):t('ui.none')}),'hint'));
  if(token.revoked_at)card.append(node('p',t('ui.token_revoked'),'hint'));
  else if(token.role==='application'){for(const [action,key] of [['rotate','ui.token_rotate'],['revoke','ui.token_revoke']]){const b=node('button',t(key));b.onclick=async()=>{if(!await confirmAction(()=>t('ui.token_invalidation')))return;b.disabled=true;try{if(action==='rotate'){reveal(await api('POST',`/tokens/${token.id}/rotate`));card.remove();}else{await api('DELETE',`/tokens/${token.id}`);await refresh();}}catch(e){onError(e);b.disabled=false;}};card.append(b);}}
  list.append(card);
 }
}
