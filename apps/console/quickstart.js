import {localWorkspace} from './local-workspace.js';
import {httpCode} from './http-code.js';
import {sessionCode} from './session-code.js';
import { t } from './i18n.js';
import { quickstartCode } from './quickstart-code.js';
const draft = { mode:'reuse',agent:'',session:'', language: 'python', sandbox: '', model: '', harness: '', tools: [], http: [], prompt: null };
const node = (tag, text, className) => { const n = document.createElement(tag); if (text !== undefined) n.textContent = text; if (className) n.className = className; return n; };
export function seedQuickstart(connection) {
    if (connection.kind === 'sandbox' || connection.kind === 'model') draft[connection.kind] = connection.id;
    else draft[connection.kind === 'tool' ? 'tools' : 'http'] = [connection.id];
}
export function seedSession(id){draft.session=id;draft.mode='continue';}
export function seedSavedAgent(id){draft.agent=id;draft.mode='reuse';}
export function renderQuickstart(root, connections, catalog, ingress, agents=[]) {
    root.replaceChildren();
    root.append(node('p',t('ui.journey_call_warning'),'hint'));
    if(draft.mode==='reuse'&&!agents.some(a=>!a.archived_at)){const empty=node('section',undefined,'journey-hero');empty.append(node('h2',t('ui.journey_agent')),node('p',t('ui.journey_no_agent')));const create=node('a',t('ui.journey_agent'),'button-link primary');create.href='#agents';empty.append(create);root.append(empty);return;}
    const modes=node('section',undefined,'quickstart-panel');const modeLabel=node('label',t('ui.qs_mode'));modeLabel.htmlFor='qs-mode';const mode=node('hx-select');mode.id='qs-mode';mode.setAttribute('aria-label',t('ui.qs_mode'));mode.setOptions(['reuse','continue','first'].map(value=>({value,label:t(value==='first'?'ui.journey_optional_trial':`ui.qs_mode_${value}`)})));mode.value=draft.mode;mode.onchange=()=>{draft.mode=mode.value;if(draft.mode==='first'&&draft.language==='http')draft.language='python';renderQuickstart(root,connections,catalog,ingress,agents);};modes.append(modeLabel,mode);root.append(modes);
    if(draft.mode!=='first'){if(ingress!=='reachable'){const warning=node('p',t('ui.qs_ingress'),'hint');const network=node('a',t('ui.network_settings'));network.href='#network';root.append(warning,network);}renderPersistent(root,agents);return;}

    const layout = node('div', undefined, 'quickstart-layout'), config = node('section', undefined, 'quickstart-panel'), output = node('section', undefined, 'quickstart-panel');
    layout.append(config, output); root.append(layout);
    config.append(node('h2', t('ui.qs_choose')), node('p', t('ui.qs_choose_help'), 'hint'));
    const ready = kind => connections.filter(c => c.kind === kind && c.enabled && c.status === 'ready');
    const selectors = {};
    function select(key, title, items, optional = false) {
        const id = `qs-${key}`, label = node('label', title); label.htmlFor = id;
        const control = node('hx-select'); control.id = id; control.setAttribute('aria-label', title);
        config.append(label, control);
        control.setOptions([{ value: '', label: t(optional ? 'ui.qs_none' : 'ui.qs_select') }, ...items]);
        control.value = draft[key];
        selectors[key] = control;
        return control;
    }
    for (const [kind, key] of [['sandbox', 'ui.sandbox_connections'], ['model', 'ui.model_endpoints']]) {
        const candidates = ready(kind);
        if (draft[kind] && !candidates.some(c => c.id === draft[kind])) draft[kind] = '';
        const control = select(kind, t(key), candidates.map(c => ({ value: c.id, label: `${c.name} · ${c.provider}` })));
        control.onchange = () => { draft[kind] = control.value; updateHarnesses(); update(); };
        if (!candidates.length) { const link = node('a', t('ui.qs_configure_missing')); link.href = kind === 'sandbox' ? '#sandboxes' : '#models'; config.append(link); }
    }
    const harness = select('harness', 'Harness', []);
    function updateHarnesses() {
        const model = connections.find(c => c.id === draft.model);
        const items = (catalog.harnesses || []).filter(h => h.capabilities.includes('conversation') && (!model || h.model_providers.includes(model.provider)) && (!draft.tools.length || h.capabilities.includes('tools')));
        if (!items.some(h => `${h.id}@${h.version}` === draft.harness)) draft.harness = '';
        harness.setOptions([{ value: '', label: t('ui.qs_select') }, ...items.map(h => ({ value: `${h.id}@${h.version}`, label: `${h.id} · ${h.version}` }))]);
        harness.value = draft.harness;
    }
    harness.onchange = () => { draft.harness = harness.value; update(); };
    for (const [kind, key, title] of [['tool', 'tools', 'ui.qs_tools'], ['http', 'http', 'ui.qs_http']]) {
        const options = ready(kind);
        draft[key] = draft[key].filter(id => options.some(c => c.id === id));
        const fieldset = node('fieldset', undefined, 'quickstart-bindings'); fieldset.append(node('legend', t(title)));
        if (!options.length) fieldset.append(node('p', t('ui.qs_no_optional'), 'hint'));
        options.forEach(c => {
            const label = node('label'), input = node('input'); input.type = 'checkbox'; input.checked = draft[key].includes(c.id);
            label.append(input, node('span', `${c.name} · ${c.provider}`)); fieldset.append(label);
            input.onchange = () => { draft[key] = input.checked ? [...draft[key], c.id] : draft[key].filter(id => id !== c.id); updateHarnesses(); update(); };
        });
        config.append(fieldset);
    }
    const promptLabel = node('label', t('ui.qs_prompt')); promptLabel.htmlFor = 'qs-prompt';
    const prompt = node('textarea'); prompt.id = 'qs-prompt'; prompt.value = draft.prompt ?? t('ui.qs_default_prompt');
    config.append(promptLabel, prompt, node('p', t('ui.qs_bindings_help'), 'hint'));
    const bindingList = node('div', undefined, 'hint'); config.append(bindingList);
    prompt.oninput = () => { draft.prompt = prompt.value; update(); };
    output.append(node('h2', t('ui.qs_run')), node('p', t('ui.qs_auth'), 'hint'), node('code', location.origin), node('p', t('ui.qs_install'), 'hint'));
    const languageLabel = node('label', t('ui.sdk_language')); languageLabel.htmlFor = 'qs-language';
    const language = node('hx-select'); language.id = 'qs-language'; language.setAttribute('aria-label', t('ui.sdk_language')); output.append(languageLabel, language);
    language.setOptions([{ value: 'python', label: 'Python' }, { value: 'typescript', label: 'TypeScript' }]); language.value = draft.language;
    const install = node('pre'); install.id = 'qs-install'; output.append(install);
    const status = node('p', undefined, 'hint'); status.id = 'qs-status'; status.setAttribute('role', 'status');
    const code = node('pre'); code.id = 'qs-code'; code.tabIndex = 0;
    const actions = node('div', undefined, 'actions'), copy = node('button', t('ui.qs_copy')), download = node('button', t('ui.qs_download'));
    copy.type = download.type = 'button'; actions.append(copy, download); output.append(status, actions, code);
    const copied = node('p', undefined, 'hint'); copied.setAttribute('role', 'status'); output.append(copied, node('p', t('ui.qs_lifecycle'), 'hint'));
    copy.onclick = async () => { try { await navigator.clipboard.writeText(code.textContent); copied.textContent = t('ui.snippet_copied'); } catch { copied.textContent = t('ui.copy_unavailable'); code.focus(); } };
    download.onclick = () => { const url = URL.createObjectURL(new Blob([code.textContent], { type: 'text/plain;charset=utf-8' })); const a = node('a'); a.href = url; a.download = draft.language === 'python' ? 'hexagon-example.py' : 'hexagon-example.mts'; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000); };
    language.onchange = () => { draft.language = language.value; update(); };
    function update() {
        const selected = (catalog.harnesses || []).find(h => `${h.id}@${h.version}` === draft.harness);
        const valid = draft.sandbox && draft.model && selected && prompt.value.trim();
        status.textContent = !valid ? t('ui.qs_incomplete') : ingress !== 'reachable' ? t('ui.qs_ingress') : t('ui.qs_ready');
        copy.disabled = download.disabled = !valid;
        install.textContent = draft.language === 'python' ? 'python3 -m venv .venv\n.venv/bin/python -m pip install ./sdk/python\n.venv/bin/python hexagon-example.py' : 'npm --prefix sdk/typescript run build\nnpm install ./sdk/typescript\nnpx tsx hexagon-example.mts';
        bindingList.replaceChildren();
        for (const [key, prefix] of [['tools', 'tool'], ['http', 'api']]) draft[key].forEach((id, i) => bindingList.append(node('p', `${prefix}_${i + 1} → ${connections.find(c => c.id === id)?.name}`)));
        code.hidden = !valid; copied.textContent = '';
        code.textContent = valid ? quickstartCode({ ...draft, base: location.origin, harness: selected, prompt: prompt.value, messages: { agentName: t('ui.qs_agent_name'), waiting: t('ui.qs_waiting'), timeout: t('ui.qs_timeout'), cleanup: t('ui.qs_cleanup') } }) : '';
    }
    updateHarnesses(); update();
    const reference = node('section', undefined, 'quickstart-panel api-reference'); reference.append(node('h2', t('ui.qs_http_title')), node('p', t('ui.qs_http_auth'), 'hint'));
    const table = node('table'), body = node('tbody'); table.append(body);
    for (const [endpoint, key] of [['POST /v1/agents', 'ui.qs_agent'], ['POST /v1/sessions/preflight', 'ui.qs_preflight'], ['POST /v1/sessions', 'ui.qs_session'], ['POST /v1/sessions/{id}/runs', 'ui.qs_submit'], ['GET /v1/runs/{id}', 'ui.qs_result'], ['GET /v1/runs/{id}/stream', 'ui.qs_stream'], ['POST /v1/sessions/{id}/close', 'ui.qs_close']]) { const row = node('tr'); row.append(node('td', endpoint), node('td', t(key))); body.append(row); }
    const wrap = node('div', undefined, 'table-wrap'); wrap.append(table); reference.append(wrap);
    const fleet = node('a', t('ui.setup_fleet')); fleet.href = '#fleet'; reference.append(fleet); root.append(reference);
}

function renderPersistent(root,agents){
 const panel=node('section',undefined,'quickstart-panel');root.append(panel);panel.append(node('p',t('ui.qs_persistent_help'),'hint'));
 const field=(id,label,value,tag='input')=>{const l=node('label',label);l.htmlFor=id;const input=node(tag);input.id=id;if(tag==='input')input.type='text';input.value=value;panel.append(l,input);return input;};
 if(draft.mode==='reuse'){
  const available=agents.filter(a=>!a.archived_at);if(!available.some(a=>a.id===draft.agent)&&available.length===1)draft.agent=available[0].id;
  const label=node('label',t('ui.agents'));label.htmlFor='qs-agent';const select=node('hx-select');select.id='qs-agent';select.setAttribute('aria-label',t('ui.agents'));select.setOptions([{value:'',label:t('ui.journey_choose_agent')},...agents.filter(a=>!a.archived_at).map(a=>({value:a.id,label:`${a.name} · ${a.revision}`}))]);select.value=draft.agent;select.onchange=()=>{draft.agent=select.value;history.replaceState(null,'',`#quickstart?agent=${encodeURIComponent(draft.agent)}`);update();};panel.append(label,select);
 }else{const session=field('qs-session',t('ui.qs_existing_session'),draft.session);session.oninput=()=>{draft.session=session.value.trim();update();};}
 const prompt=field('qs-prompt',t('ui.qs_prompt'),draft.prompt??t('ui.qs_default_prompt'),'textarea');prompt.oninput=()=>{draft.prompt=prompt.value;update();};
 const label=node('label',t('ui.sdk_language'));label.htmlFor='qs-language';const language=node('hx-select');language.id='qs-language';language.setAttribute('aria-label',t('ui.sdk_language'));language.setOptions([{value:'python',label:'Python'},{value:'typescript',label:'TypeScript'},{value:'http',label:'HTTP · curl'}]);language.value=draft.language;language.onchange=()=>{draft.language=language.value;update();};panel.append(label,language);
 const tokenLink=node('a',t('ui.journey_token'));tokenLink.href=draft.mode==='continue'?`#tokens?session=${encodeURIComponent(draft.session)}`:`#tokens?agent=${encodeURIComponent(draft.agent)}`;if(!localWorkspace())panel.append(tokenLink);panel.append(node('h2',t('ui.journey_code')));
 panel.append(node('p',t(localWorkspace()?'ui.local_sdk_access':'ui.walk_saved_token'),'hint'),node('p',t('ui.walk_workdir'),'hint'),node('h3',t('ui.walk_first_command')));
 const commands=node('pre');commands.id='qs-install';panel.append(commands);
 const later=node('details');later.append(node('summary',t('ui.walk_later_commands')),node('p',t('ui.walk_later_help'),'hint'));const followup=node('pre');followup.id='qs-followup';later.append(followup,node('p',t('ui.qs_journal_help'),'hint'));panel.append(later);
 const status=node('p',undefined,'hint');status.id='qs-status';status.setAttribute('role','status');panel.append(status);
 const details=node('details');details.append(node('summary',t('ui.qs_source')));const code=node('pre');code.id='qs-code';code.tabIndex=0;details.append(code);
 const actions=node('div',undefined,'actions');const copy=node('button',t('ui.qs_copy')),download=node('button',t('ui.qs_download'));actions.append(copy,download);panel.append(actions,details);const resultLink=node('a',t('ui.journey_follow'),'button-link');resultLink.href='#runs';panel.append(resultLink);
 copy.onclick=async()=>{try{await navigator.clipboard.writeText(code.textContent);status.textContent=t('ui.snippet_copied');}catch{status.textContent=t('ui.copy_unavailable');details.open=true;code.focus();}};
 download.onclick=()=>{const url=URL.createObjectURL(new Blob([code.textContent],{type:'text/plain;charset=utf-8'}));const a=node('a');a.href=url;a.download=draft.language==='python'?'hexagon-example.py':draft.language==='http'?'hexagon-example.sh':'hexagon-example.mts';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);};
 function update(){
  const agent=agents.find(a=>a.id===draft.agent&&!a.archived_at);const valid=!!prompt.value.trim()&&(draft.mode==='continue'?/^[a-f0-9-]{36}$/i.test(draft.session):!!agent?.definition.bindings);
  copy.disabled=download.disabled=!valid;status.textContent=t(valid?'ui.qs_persistent_ready':'ui.qs_persistent_incomplete');
  const run=draft.language==='python'?'.venv/bin/python hexagon-example.py':'npx tsx hexagon-example.mts';
  commands.textContent=(draft.language==='python'?'python3 -m venv .venv\n.venv/bin/python -m pip install ./sdk/python':'npm --prefix sdk/typescript run build\nnpm install ./sdk/typescript')+(localWorkspace()?'':"\nexport HEXAGON_API_TOKEN='YOUR_APPLICATION_TOKEN'")+`\n${run}${draft.mode==='continue'?' --new-turn':''}`;
  followup.textContent=`${run} --resume --stream\n${run} --new-turn\n${run} --close`;
  if(draft.language==='http'){commands.textContent="export HEXAGON_API_TOKEN='YOUR_APPLICATION_TOKEN'\nsh hexagon-example.sh"+(draft.mode==='continue'?' --new-turn':'');followup.textContent=t('ui.qs_http_commands');}
  code.textContent=valid?(draft.language==='http'?httpCode:sessionCode)({language:draft.language,base:location.origin,agentId:agent?.id??'',bindings:agent?.definition.bindings??{},sessionId:draft.mode==='continue'?draft.session:undefined,prompt:prompt.value,localDirectory:localWorkspace()}):'';
 }
 update();
}
