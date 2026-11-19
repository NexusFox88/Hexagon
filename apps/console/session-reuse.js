import {t} from './i18n.js';
import {localWorkspace} from './local-workspace.js';
import {playgroundAction} from './playground.js';
const el=(tag,text,css)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=text;if(css)n.className=css;return n;};
/** Project only accepted creation fields. Never reuse source Session/Agent IDs or resolved runtime metadata. */
export function creationFromInitialization(snapshot){
 const d=snapshot.definition;
 return JSON.parse(JSON.stringify({name:d.name,harness:d.harness,identity:d.identity,instructions:d.instructions,context:d.context,
  sandbox_connection_id:d.connections.find(c=>c.kind==='sandbox')?.id,
  model_connection_id:d.connections.find(c=>c.kind==='model')?.id,
  tools:d.tool_bindings??{},connections:d.protected_api_bindings??{},
  optional_tools:(d.tools??[]).filter(tool=>!tool.required_at_start).map(tool=>tool.name),
  resources:d.resources,network:d.network,required_capabilities:d.required_capabilities??[],env:Object.fromEntries(snapshot.environment.names.map(name=>[name,'']))}));
}
export function creationCode(language,definition,environmentNames=[],localDirectory){
 const literal=JSON.stringify,clean={...definition,env:{}};
 const names=[...new Set([...environmentNames,...Object.keys(definition.env??{})])];
 if(language==='python')return `import json, os\nfrom hexagon import Hexagon\n\napi = ${localDirectory?`Hexagon.local(data_directory=${literal(localDirectory)})`:'Hexagon(os.environ["HEXAGON_API_URL"], os.environ["HEXAGON_API_TOKEN"])'}\ndefinition = json.loads(\n${JSON.stringify(clean,null,2).split("\n").map(line=>"    "+literal(line+"\n")).join("\n")}\n)\ndefinition["env"] = {name: os.environ[name] for name in ${literal(names)}}\napi.preflight_session(**definition)\nsession = api.create_session(**definition)\nprint(session["id"])\n`;
 return `import { Hexagon, type SessionInput } from "@hexagon/agent-sdk";\n\nconst api = ${localDirectory?`await Hexagon.local({dataDirectory:${literal(localDirectory)}})`:'new Hexagon(process.env.HEXAGON_API_URL!, process.env.HEXAGON_API_TOKEN!)'};\nconst definition = ${JSON.stringify(clean,null,2)} satisfies SessionInput;\nconst names = ${literal(names)};\nconst env = Object.fromEntries(names.map(name => {\n  const value = process.env[name];\n  if (value === undefined) throw new Error("Missing environment variable: " + name);\n  return [name, value];\n}));\nconst input = {...definition, env};\nawait api.preflightSession(input);\nconst session = await api.createSession(input);\nconsole.log(session.id);\n`;
}
function codePanel(root,getDefinition,getNames){
 const section=el('details',undefined,'reuse-code');section.append(el('summary',t('ui.reuse_code')));
 const label=el('label',t('ui.sdk_language'));label.htmlFor='reuse-language';const language=el('hx-select');language.id='reuse-language';language.setAttribute('aria-label',t('ui.sdk_language'));language.setOptions([{value:'python',label:'Python'},{value:'typescript',label:'TypeScript'}]);language.value='python';
 const copy=el('button',t('ui.reuse_copy')),code=el('pre',undefined,'initialization-json'),status=el('p',undefined,'hint');copy.type='button';status.setAttribute('role','status');
 const update=()=>{const definition=getDefinition();code.textContent=definition?creationCode(language.value,definition,getNames(),localWorkspace()):'';copy.disabled=!definition;};language.onchange=update;
 copy.onclick=async()=>{try{await navigator.clipboard.writeText(code.textContent);status.textContent=t('ui.snippet_copied');}catch{status.textContent=t('ui.copy_unavailable');}};
 section.append(el('p',t('ui.reuse_code_help'),'hint'),label,language,copy,status,code);root.append(section);update();return {update,section};
}
export function renderReuseActions(root,snapshot){
 const link=el('a',t('ui.reuse_playground'),'button-link');link.href=`#quickstart?from_session=${encodeURIComponent(snapshot.session_id)}&draft=${crypto.randomUUID()}`;
 root.append(link);codePanel(root,()=>creationFromInitialization(snapshot),()=>snapshot.environment.names);
}
let draft;
export async function renderReusePlayground(root,connections,catalog,api){
 const hash=location.hash,query=new URLSearchParams(hash.split('?')[1]??''),source=query.get('from_session'),key=source+':'+(query.get('draft')??'');
 if(!draft||draft.key!==key){const snapshot=await api('GET',`/sessions/${encodeURIComponent(source)}/initialization`);if(location.hash!==hash)return;draft={key,snapshot,definition:creationFromInitialization(snapshot),text:null,prompt:'',values:{}};}
 const current=draft;root.replaceChildren();document.getElementById('title').textContent=t('ui.reuse_title');root.append(el('p',t('ui.reuse_warning'),'hint'));
 const layout=el('div',undefined,'quickstart-layout'),form=el('section',undefined,'quickstart-panel'),output=el('section',undefined,'quickstart-panel');layout.append(form,output);root.append(layout);
 const selectors=[];
 const selector=(id,key,options,value,change)=>{const label=el('label',t(key));label.htmlFor=id;const input=el('hx-select');input.id=id;input.setAttribute('aria-label',t(key));input.setOptions(options);input.value=value;input.onchange=()=>{change(input.value);current.text=JSON.stringify(current.definition,null,2);json.value=current.text;refresh();};form.append(label,input);selectors.push(input);return input;};
 const choices=(kind,selected)=>{const rows=connections.filter(c=>c.kind===kind);return [...rows.map(c=>({value:c.id,label:c.name+(!c.enabled||c.status!=='ready'?` · ${t('ui.reuse_unavailable')}`:'')})),...(!rows.some(c=>c.id===selected)?[{value:selected,label:`${selected} · ${t('ui.reuse_unavailable')}`}]:[])];};
 selector('reuse-sandbox','ui.init_sandbox',choices('sandbox',current.definition.sandbox_connection_id),current.definition.sandbox_connection_id,v=>current.definition.sandbox_connection_id=v);
 selector('reuse-model','ui.init_model',choices('model',current.definition.model_connection_id),current.definition.model_connection_id,v=>current.definition.model_connection_id=v);
 const harnesses=catalog.harnesses.map(h=>({value:h.id+'@'+h.version,label:(h.name??h.id)+' · '+h.version})),selected=current.definition.harness.id+'@'+current.definition.harness.version;
 if(!harnesses.some(h=>h.value===selected))harnesses.push({value:selected,label:selected+' · '+t('ui.reuse_unavailable')});
 selector('reuse-harness','ui.init_harness',harnesses,selected,v=>{const split=v.lastIndexOf('@');current.definition.harness={id:v.slice(0,split),version:v.slice(split+1)};});
 const label=el('label',t('ui.reuse_parameters'));label.htmlFor='reuse-parameters';const json=el('textarea');json.id='reuse-parameters';json.rows=16;json.spellcheck=false;json.value=current.text??JSON.stringify(current.definition,null,2);form.append(label,el('p',t('ui.reuse_parameters_help'),'hint'),json);
 const loadEnv=el('button',t('ui.env_load_source'));loadEnv.type='button';loadEnv.onclick=async()=>{try{const data=await api('GET',`/sessions/${encodeURIComponent(source)}/environment`);current.values={...data.env};renderEnv();refresh();}catch{loadEnv.textContent=t('ui.access_failed');}};form.append(loadEnv);
 const env=el('div');form.append(env);const envInputs=new Map();
 function renderEnv(){const names=new Set(Object.keys(current.definition?.env??{}));env.replaceChildren();envInputs.clear();if(names.size)env.append(el('p',t('ui.reuse_env'),'hint'));for(const name of names){const label=el('label',name),input=el('input');input.type='text';input.autocomplete='off';input.id='reuse-env-'+name;label.htmlFor=input.id;input.value=current.values[name]??current.definition.env?.[name]??'';input.oninput=()=>{current.values[name]=input.value;refresh();};env.append(label,input);envInputs.set(name,input);}}
 const promptLabel=el('label',t('ui.qs_prompt')),prompt=el('textarea');prompt.id='reuse-prompt';promptLabel.htmlFor=prompt.id;prompt.value=current.prompt;prompt.oninput=()=>{current.prompt=prompt.value;refresh();};form.append(promptLabel,prompt);
 const error=el('p',undefined,'inline-error');error.setAttribute('role','status');form.append(error);
 let valid=false;const panel=codePanel(output,()=>{try{return parse();}catch{return null;}},()=>[...envInputs.keys()]);panel.section.open=true;
 function parse(){const value=JSON.parse(json.value);if(!value||Array.isArray(value)||!value.harness||!value.sandbox_connection_id||!value.model_connection_id||value.agent_id||value.session_id)throw Error('invalid');return value;}
 function refresh(){try{const value=parse();const ready=(id,kind)=>connections.some(c=>c.id===id&&c.kind===kind&&c.enabled&&c.status==='ready');valid=ready(value.sandbox_connection_id,'sandbox')&&ready(value.model_connection_id,'model')&&catalog.harnesses.some(h=>h.id===value.harness.id&&h.version===value.harness.version);error.textContent=valid?'':t('ui.reuse_dependency');}catch{valid=false;error.textContent=t('ui.reuse_invalid');}error.hidden=!error.textContent;panel.update();}
 json.oninput=()=>{current.text=json.value;try{current.definition=parse();selectors[0].value=current.definition.sandbox_connection_id;selectors[1].value=current.definition.model_connection_id;selectors[2].value=current.definition.harness.id+'@'+current.definition.harness.version;renderEnv();}catch{}refresh();};
 renderEnv();playgroundAction(form,{api,isValid:()=>valid&&Boolean(prompt.value.trim())&&[...envInputs.values()].every(i=>i.value!==''),getInput:()=>({definition:{...parse(),env:Object.fromEntries([...envInputs].map(([name,input])=>[name,input.value]))},input:prompt.value})});refresh();
}
