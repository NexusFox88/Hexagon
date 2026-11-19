import {t} from './i18n.js';
import {localWorkspace} from './local-workspace.js';
const node=(tag,text,css)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=text;if(css)n.className=css;return n;};
export function restRequests(request,includeEnvironmentValues=false){
 const definition={...request.definition};if(definition.harness)definition.harness={id:definition.harness.id,version:definition.harness.version};
 if(definition.env&&!includeEnvironmentValues)definition.env=Object.fromEntries(Object.keys(definition.env).map(key=>[key,`<${key}>`]));
 const session=request.sessionId??'{session_id}';
 return [...(request.sessionId?[]:[{method:'POST',path:'/v1/sessions/preflight',body:definition},{method:'POST',path:'/v1/sessions',body:definition}]),{method:'POST',path:`/v1/sessions/${session}/runs`,headers:{'Idempotency-Key':'<unique-key-per-turn>'},body:{input:request.input}},{method:'GET',path:'/v1/runs/{run_id}'},{method:'GET',path:'/v1/runs/{run_id}/stream'}];
}
const quote=value=>"'"+value.replaceAll("'","'\\''")+"'";
export function restCurl(requests,origin,local){
 const auth=local?`HEXAGON_API_TOKEN=$(curl --fail --silent -X POST ${quote(origin+'/local/connect')} -H 'X-Hexagon-Local: 1' -H ${quote('Origin: '+origin)} -H 'Sec-Fetch-Site: same-origin' | jq -r '.token')`:'export HEXAGON_API_TOKEN="<application-token>"';
 return auth+'\n\n'+requests.map(r=>`curl --fail-with-body${r.path.endsWith('/stream')?' -N':''} -X ${r.method} ${quote(origin+r.path)} \\\n  -H "Authorization: Bearer $HEXAGON_API_TOKEN"`+Object.entries(r.headers??{}).map(([k,v])=>` \\\n  -H ${quote(k+': '+v)}`).join('')+(r.body?` \\\n  -H 'Content-Type: application/json' \\\n  --data-raw ${quote(JSON.stringify(r.body,null,2))}`:'')).join('\n\n');
}
export function renderRestPreview(parent,getInput){
 const section=node('section',undefined,'rest-preview');section.append(node('p',t('ui.rest_help'),'hint'));
 const requests=node('div',undefined,'rest-requests'),code=node('pre'),copy=node('button',t('ui.rest_copy')),status=node('p',undefined,'hint');status.setAttribute('role','status');copy.type='button';const curl=node('details');curl.append(node('summary','cURL'),code,copy,status);section.append(requests,curl);parent.prepend(section);
 let current='',signature='';function update(){try{const value=restRequests(getInput(),true);const next=JSON.stringify(value);if(next===signature)return;signature=next;const open=new Set([...requests.children].filter(n=>n.open).map(n=>n.dataset.path));requests.replaceChildren();for(const r of value){const item=node('details',undefined,'rest-request');item.dataset.path=r.path;item.open=open.has(r.path);const heading=node('summary');heading.append(node('span',r.method,'http-method'),node('code',r.path));item.append(heading);if(r.body||r.headers)item.append(node('pre',JSON.stringify({...(r.headers?{headers:r.headers}:{}),...(r.body?{body:r.body}:{})},null,2)));requests.append(item);}current=restCurl(value,location.origin,!!localWorkspace());code.textContent=current;copy.disabled=false;}catch{signature='';current='';code.textContent='';requests.replaceChildren(node('p',t('ui.qs_incomplete'),'hint'));copy.disabled=true;}}
 copy.onclick=async()=>{try{await navigator.clipboard.writeText(current);status.textContent=t('ui.snippet_copied');}catch{status.textContent=t('ui.copy_unavailable');}};return update;
}
