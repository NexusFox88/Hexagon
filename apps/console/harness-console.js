import {t} from './i18n.js';
import {openModal,closeModal} from './components.js';
const node=(tag,text,css)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=text;if(css)n.className=css;return n;};
const copy=(n,key)=>{n.dataset.i18n=key;n.textContent=t(key);return n;};
const scenarioLabels={'native-continuation':'ui.harness_test_native-continuation','remote-tool':'ui.harness_test_remote-tool','environment':'ui.harness_test_environment','artifacts':'ui.harness_test_artifacts','cleanup':'ui.harness_test_cleanup','single-turn':'ui.harness_test_single-turn'};
let context,tab='registered';
function button(key,action,css){const b=copy(node('button',undefined,css),key);b.type='button';b.onclick=action;return b;}
function modal(title){
 document.getElementById('harness-modal')?.remove();
 const layer=node('div',undefined,'modal-layer');layer.id='harness-modal';layer.hidden=true;layer.setAttribute('role','dialog');layer.setAttribute('aria-modal','true');layer.setAttribute('aria-labelledby','harness-modal-title');
 const panel=node('div',undefined,'modal-panel'),head=node('div',undefined,'dialog-heading'),heading=copy(node('h2'),title);heading.id='harness-modal-title';head.append(heading,button('ui.close',()=>closeModal(layer.id),'ghost'));
 const body=node('div',undefined,'dialog-body'),footer=node('div',undefined,'dialog-footer');panel.append(head,body,footer);layer.append(panel);document.body.append(layer);return {layer,body,footer};
}
function field(body,key,id,value='',tag='input'){const label=copy(node('label'),key),input=node(tag);label.htmlFor=id;input.id=id;input.value=value;body.append(label,input);return input;}
function code(body,value){const pre=node('pre',undefined,'harness-code');pre.tabIndex=0;pre.setAttribute('role','region');pre.setAttribute('aria-label',t('ui.oci_details'));pre.append(node('code',value));body.append(pre);return pre;}
export async function openHarnessEditor(template={}){
 const {api,refresh,onError}=context,{layer,body,footer}=modal('ui.oci_register');
 body.append(copy(node('p',undefined,'hint'),'ui.oci_register_help'));
 const form=node('form');form.id='harness-image-form';form.noValidate=true;body.append(form);
 const error=node('p',undefined,'inline-error');error.hidden=true;error.tabIndex=-1;error.setAttribute('role','alert');form.append(error);
 const image=field(form,'ui.oci_image','harness-image',template.image??'');image.placeholder='ghcr.io/organization/agent:1.0';image.spellcheck=false;
 const name=field(form,'ui.name','harness-name',template.name??''),version=field(form,'ui.oci_version','harness-version',template.version??'');
 const advanced=node('details');advanced.append(copy(node('summary'),'ui.oci_advanced'));form.append(advanced);
 const protocol=field(advanced,'ui.oci_protocol','harness-protocol',template.protocol??'hexagon-json-v1','hx-select');protocol.setOptions(context.catalog.harness_protocols.map(p=>({value:p.id,label:p.id})));protocol.value=template.protocol??'hexagon-json-v1';
 const command=field(advanced,'ui.oci_command','harness-command',template.command?JSON.stringify(template.command):'','textarea');command.rows=2;command.placeholder='["python3", "/app/agent.py"]';command.spellcheck=false;
 const secret=field(advanced,'ui.oci_registry_secret','harness-registry-secret','','hx-select');secret.setOptions([{value:'',label:t('ui.oci_public')}]);
 advanced.append(copy(node('p',undefined,'hint'),'ui.oci_registry_help'));
 const toolsLabel=copy(node('label',undefined,'checkbox-label'),'ui.oci_tools'),tools=node('input');tools.type='checkbox';tools.checked=(template.capabilities??[]).includes('tools');toolsLabel.prepend(tools);advanced.append(toolsLabel);
 footer.append(button('ui.cancel',()=>closeModal(layer.id)));
 const save=button('ui.oci_register',()=>form.requestSubmit(),'primary');footer.append(save);
 form.onsubmit=async event=>{event.preventDefault();error.hidden=true;save.disabled=true;try{
  if(!image.value.trim())throw new Error(t('ui.oci_image_required'));
  let parsed;if(command.value.trim()){try{parsed=JSON.parse(command.value);}catch{throw new Error(t('ui.oci_command_invalid'));}if(!Array.isArray(parsed)||!parsed.length||parsed.some(v=>typeof v!=='string'))throw new Error(t('ui.oci_command_invalid'));}
  const registered=await api('POST','/harnesses',{image:image.value.trim(),...(name.value.trim()?{name:name.value.trim()}:{}),...(version.value.trim()?{version:version.value.trim()}:{}),protocol:protocol.value,capabilities:tools.checked?['conversation','tools']:['conversation'],...(parsed?{command:parsed}:{}),...(secret.value?{registry_secret_id:secret.value}:{})});
  closeModal(layer.id);await refresh();location.hash=`quickstart?harness=${encodeURIComponent(registered.id+'@'+registered.version)}`;
 }catch(e){error.textContent=e.message;error.hidden=false;error.focus();error.scrollIntoView({block:'nearest'});}finally{save.disabled=false;}};
 openModal(layer.id);
 try{const data=await api('GET','/secrets');secret.setOptions([{value:'',label:t('ui.oci_public')},...(data.secrets??[]).filter(s=>s.enabled).map(s=>({value:s.id,label:s.name}))]);}catch(e){onError(e);}
}
function detail(h,isTemplate=false){
 const {layer,body,footer}=modal('ui.oci_details');body.append(node('h3',h.name??h.id));
 const pairs=[['ui.oci_identifier',h.id],['ui.oci_version',h.version],['ui.oci_protocol',h.protocol??'—'],['ui.oci_image',h.image?.reference??'—']];
 for(const [key,value]of pairs){body.append(copy(node('label'),key));code(body,value);}
 body.append(copy(node('label'),'ui.harness_model_protocols'),node('p',(h.model_providers??[]).join(' · ')),copy(node('label'),'ui.harness_verification'),node('p',t(h.verification?.length?'ui.harness_verified':'ui.harness_unverified'),'hint'));
 for(const v of h.verification??[]){
  body.append(node('p',`${v.sandbox_provider} · ${v.model_provider} · ${v.model} · ${v.clients.join(' / ')}`,'hint'));
  body.append(node('p',v.scenarios.map(s=>scenarioLabels[s]?t(scenarioLabels[s]):s).join(' · '),'hint'));
 }
 if(h.image){
  body.append(copy(node('label'),'ui.oci_sdk'));
  const input={image:h.image.reference,id:isTemplate?`custom.${h.id}`:h.id,name:h.name,version:h.version,protocol:h.protocol,command:h.command,capabilities:h.capabilities,...(h.image.registry_secret_id?{registry_secret_id:h.image.registry_secret_id}:{})};
  const language=field(body,'ui.sdk_language','harness-sdk-language','python','hx-select');
  language.setOptions([{value:'python',label:'Python'},{value:'typescript',label:'TypeScript'}]);language.value='python';
  const source=code(body,''),status=node('p',undefined,'hint');status.setAttribute('role','status');
  const update=()=>{source.firstChild.textContent=language.value==='python'?`from hexagon import Hexagon\n\nclient = Hexagon.local()\nharness = client.register_harness(\n${Object.entries(input).filter(([,value])=>value!==undefined).map(([key,value])=>`    ${key}=${JSON.stringify(value)},`).join("\n")}\n)`:`import { Hexagon } from "@hexagon/agent-sdk";\n\nconst client = await Hexagon.local();\nconst harness = await client.registerHarness(${JSON.stringify(input,null,2)});`;status.textContent='';};
  language.addEventListener('change',update);update();
  body.append(button('ui.copy',async()=>{try{await navigator.clipboard.writeText(source.textContent);status.textContent=t('ui.init_copied');}catch{source.focus();status.textContent=t('ui.copy_unavailable');}}),status);
 }
 footer.append(isTemplate?button('ui.oci_use',()=>{closeModal(layer.id);openHarnessEditor({...h,image:h.image.reference});},'primary'):button('ui.api_playground',()=>{closeModal(layer.id);location.hash=`quickstart?harness=${encodeURIComponent(h.id+'@'+h.version)}`},'primary'),button('ui.close',()=>closeModal(layer.id)));openModal(layer.id);
}

function recipe(template){const {layer,body,footer}=modal('ui.oci_recipe');body.append(node('h3',template.name),copy(node('p',undefined,'hint'),'ui.oci_recipe_help'));code(body,template.recipe);code(body,`node --import tsx tooling/build-harness-images.ts ${template.id}`);footer.append(button('ui.close',()=>closeModal(layer.id)));openModal(layer.id);}
export function renderHarnesses(root,catalog,api,refresh,onError){
 context={root,catalog,api,refresh,onError};root.replaceChildren();
 const tabs=node('div',undefined,'harness-tabs');for(const [id,key]of [['registered','ui.oci_registered'],['templates','ui.oci_templates']]){const b=button(key,()=>{tab=id;renderHarnesses(root,catalog,api,refresh,onError);});b.setAttribute('aria-pressed',String(tab===id));tabs.append(b);}root.append(tabs);
 if(tab==='templates'){const grid=node('div',undefined,'harness-templates');root.append(grid);for(const h of catalog.harness_templates??[]){const card=node('article',undefined,'harness-template'),title=node('h2',h.name),icon=node('img');icon.className='harness-icon';icon.alt='';icon.width=32;icon.height=32;icon.src='/console/brands/'+({codex:'openai',hermes:'hermes',openclaw:'openclaw',deepseek:'deepseek',opencode:'opencode',pi:'pi',aider:'terminal','claude-code':'claude','custom-python':'python'}[h.id]??'terminal')+(h.id==='hermes'?'.png':'.svg');card.append(icon,title,node('code',h.version),node('p',(h.model_providers??[]).map(p=>({'anthropic-compatible':'Anthropic','openai-compatible':'Chat Completions','openai-responses':'Responses'}[p]??p)).join(' · '),'hint'),copy(node('p',undefined,'hint'),h.image?'ui.oci_published':'ui.oci_build_required'));if(!h.verification?.length)card.append(node('p',t('ui.harness_unverified'),'hint'));if(h.publisher==='community')card.append(copy(node('p',undefined,'hint'),'ui.harness_community'));const actions=node('div',undefined,'row-actions');if(h.image)actions.append(button('ui.oci_use',()=>openHarnessEditor(h),'primary'));if(h.verification?.length)actions.append(button('ui.harness_verify_short',()=>detail({...h,image:{reference:h.image}},true)));actions.append(button('ui.harness_recipe_short',()=>recipe(h)));card.append(actions);grid.append(card);}return;}
 const wrap=node('div',undefined,'table-wrap harness-table'),table=node('table'),head=node('thead'),row=node('tr'),body=node('tbody');for(const key of ['ui.name','ui.oci_image','ui.oci_protocol','ui.oci_source','ui.actions'])row.append(copy(node('th'),key));head.append(row);table.append(head,body);wrap.append(table);root.append(wrap);
 for(const h of catalog.harnesses??[]){const row=node('tr'),name=node('td'),image=node('td'),protocol=node('td'),source=node('td'),action=node('td');name.append(node('strong',h.name??h.id),node('small',h.version));const reference=h.image?.reference;image.append(node('span',reference?reference:'—'),node('small',reference?`sha256:${h.image.digest.replace(/^sha256:/,'')}`:h.id));protocol.append(node('code',h.protocol??(h.id==='opencode'?'opencode-v1':h.id==='pi'?'pi-v1':'hexagon-json-v1')));source.append(copy(node('span'),reference?'ui.oci_source_image':h.id.startsWith('custom.')?'ui.oci_source_package':'ui.oci_source_builtin'),copy(node('small'),h.verification?.length?'ui.table_evidence_available':'ui.table_no_evidence'));action.append(button('ui.oci_details',()=>detail(h),'ghost'));row.append(name,image,protocol,source,action);body.append(row);}
 if(!body.children.length){const row=node('tr'),cell=copy(node('td'),'ui.oci_empty');cell.colSpan=5;row.append(cell);body.append(row);}
 root.append(copy(node('p',undefined,'harness-footnote'),'ui.oci_compatibility'));
}
