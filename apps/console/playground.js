import {playgroundOutput} from './playground-output.js';
import {t} from './i18n.js';
const node=(tag,text,css)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=text;if(css)n.className=css;return n;};
/** Use the public API, preserving a submission key if its response is lost. */
export async function submitPlayground(api,request,state){
 if(!state.sessionId){
  if(state.creationPending)throw new Error('session_creation_unconfirmed');
  await api('POST','/sessions/preflight',request.definition);
  state.creationPending=true;
  const session=await api('POST','/sessions',request.definition);
  state.sessionId=session.id;state.creationPending=false;
 }
 state.runKey??=crypto.randomUUID();
 return api('POST',`/sessions/${encodeURIComponent(state.sessionId)}/runs`,{input:request.input},{'Idempotency-Key':state.runKey});
}
export function playgroundAction(form,{api,getInput,isValid}){
 const fields=node('div',undefined,'playground-fields');fields.append(...form.childNodes);form.append(fields);
 const section=node('div',undefined,'playground-submit'),button=node('button',t('ui.playground_send'),'primary'),status=node('p',t('ui.playground_help'),'hint');button.type='button';status.setAttribute('role','status');section.append(button,status);form.append(section);
 const updateRest=playgroundOutput(form.closest('.quickstart-layout')?.querySelector('.quickstart-panel:last-child')??form,getInput);
 form.addEventListener('input',updateRest);form.addEventListener('change',updateRest);queueMicrotask(updateRest);
 let state={},request;
 button.onclick=async()=>{
  if(!request&&!isValid()){status.textContent=t('ui.qs_incomplete');return;}
  if(!request){request=getInput();const h=request.definition.harness;request.definition.harness=h?{id:h.id,version:h.version}:undefined;state.sessionId=request.sessionId;}
  const controls=[...form.querySelectorAll('input,textarea,button,hx-select')];
  controls.forEach(c=>c.disabled=true);button.setAttribute('aria-busy','true');status.textContent=t('ui.playground_sending');
  try{
   await submitPlayground(api,request,state);
   location.hash=`sessions?id=${state.sessionId}`;
  }catch(error){
   button.removeAttribute('aria-busy');
   status.textContent=state.creationPending?t('ui.playground_unknown'):error.message;
   if(state.sessionId){const a=node('a',t('ui.sessions'));a.href=`#sessions?id=${state.sessionId}`;status.append(' ',a);button.textContent=t('ui.playground_retry');button.disabled=false;}
   else if(!state.creationPending){request=undefined;controls.forEach(c=>c.disabled=false);}
   // A lost Session creation response is not retried: reconcile in Sessions.
   else{const a=node('a',t('ui.sessions'));a.href='#sessions';status.append(' ',a);}
  }
 };
 return button;
}
