import {t} from './i18n.js';
import {Marked} from './vendor/marked.js';
import {messageRenderer} from './markdown.js';
const renderMessage=messageRenderer(Marked);
export async function renderRun(id, root, {isCurrent,api,el,badge,button,refresh,apiError,UiError,token,formatBytes,openEditor,confirmAction,notice,eventLabel,history=false}) {
    const [run,approvalData,artifactData,eventData,toolData]=await Promise.all([api('GET',`/runs/${id}`),api('GET',`/runs/${id}/approvals`),api('GET',`/runs/${id}/artifacts`),api('GET',`/runs/${id}/events?after=0`),api('GET',`/runs/${id}/tool-calls`)]);
    const pinnedSession=toolData.calls.some(call=>call.operation.startsWith('mcp_'))?await api('GET',`/sessions/${run.session_id}`):null;
    const toolLabel=call=>{const definition=pinnedSession?.definition;const connection=definition?.connections?.find(c=>c.id===definition.tool_bindings?.[call.binding]);return call.binding+'.'+(connection?.config?.tools?.[call.operation]?.name??call.operation);};
    if(!isCurrent())return;
    root.replaceChildren();root.classList.add('run-transcript');
    root.dataset.live=String(['queued','provisioning','running','cancelling'].includes(run.state)&&!toolData.calls.some(c=>c.state==='unknown'));
    const input=el('section',undefined,'transcript-message message-user');const inputHead=el('div',undefined,'transcript-heading');inputHead.append(el('h2',t('ui.chat_you')));input.append(inputHead,el('p',run.input,'message-text'));root.append(input);
    const assistant=el('section',undefined,'message-assistant');const assistantHead=el('div',undefined,'transcript-heading');assistantHead.append(el('h2',t('ui.chat_agent')),badge(run.state));assistant.append(assistantHead);root.append(assistant);
    const transcriptRoot=root;root=assistant;
    if(transcriptRoot.dataset.live==='true')root.append(el('p',t('ui.walk_progress'),'hint'));
    const identifiers=el('details');identifiers.append(el('summary',t('ui.walk_identifiers')),el('code',run.id));root.append(identifiers);
    const sessionLink=el('a',t('ui.walk_resource'));sessionLink.href=`#fleet?session=${run.session_id}&run=${run.id}`;identifiers.append(sessionLink);
    if(run.execution_identity||Object.keys(run.origin??{}).length)identifiers.append(el('pre',JSON.stringify({execution_identity:run.execution_identity,origin:run.origin},null,2))); 
    for(const call of toolData.calls.filter(call=>call.state==='unknown')){
        const card=el('section',undefined,'quickstart-panel');card.append(el('h3',t('ui.pending_tool_outcome')),el('p',t('ui.tool_resolution_help'),'hint'),el('code',toolLabel(call)),el('pre',JSON.stringify(call.arguments,null,2)));
        const outcome=el('hx-select');outcome.setAttribute('aria-label',t('ui.tool_resolution_outcome'));outcome.setOptions([{value:'',label:t('ui.tool_resolution_choose')},{value:'completed',label:t('ui.completed')},{value:'failed',label:t('ui.failed')}]);
        const evidence=el('textarea');evidence.setAttribute('aria-label',t('ui.tool_resolution_evidence'));evidence.maxLength=4000;
        const result=el('textarea');result.setAttribute('aria-label',t('ui.tool_resolution_result'));result.maxLength=65536;
        const error=el('p',undefined,'inline-error');error.setAttribute('role','alert');
        const submit=button(t('ui.tool_resolution_save'),async()=>{
          if(!outcome.value||!evidence.value.trim()||!result.value.trim()){error.textContent=t('ui.tool_resolution_required');(outcome.value?evidence:outcome).focus();return;}
          if(!await confirmAction(()=>t('ui.tool_resolution_confirm')))return;
          await api('POST',`/runs/${id}/tool-calls/${call.id}/resolve`,{request_hash:call.request_hash,outcome:outcome.value,text:result.value,evidence:evidence.value});await refresh();
        });
        card.append(el('p',t('ui.tool_resolution_outcome')),outcome,el('p',t('ui.tool_resolution_evidence')),evidence,el('p',t('ui.tool_resolution_result')),result,error,submit);root.append(card);
    }
    const approvals=approvalData.approvals;
    for(const approval of approvals.filter(a=>a.state==='pending')){const card=el('section',undefined,'quickstart-panel');card.append(el('pre',JSON.stringify(approval.action,null,2)));for(const approved of [true,false])card.append(button(t(approved?'ui.execution_approve':'ui.execution_deny'),async()=>{await api('POST',`/approvals/${approval.id}/decision`,{approved});await refresh();}));root.append(card);}
    if (!['completed', 'failed', 'cancelled'].includes(run.state))
        root.append(button(t("ui.cancel_run"), async () => { await api('POST', `/runs/${id}/cancel`); notice(() => t("ui.cancellation_requested")); await refresh(); }));
    if (run.error) {
        const recovering=['execution_reconciliation_required','runtime_unreachable','credential_ingress_recovery_blocked'].includes(run.error.code)&&!['completed','failed','cancelled'].includes(run.state);
        root.append(el('p', recovering?t('ui.run_reconciling_help'):apiError(run.error.code || 'unknown').message, recovering?'hint':'inline-error'));
        const diagnostics=el('details');diagnostics.append(el('summary',t('ui.walk_identifiers')),el('pre',JSON.stringify(run.error,null,2)));root.append(diagnostics);
    }
    const events=eventData.events;
    const progress=el('details',undefined,'execution-trace');progress.open=!['completed','failed','cancelled'].includes(run.state);progress.append(el('summary',t('ui.simple_progress')));const milestones=el('div',undefined,'trace-milestones');
    for(const event of events.filter(e=>!['harness.stdout','harness.stderr'].includes(e.type)).slice(-8)){milestones.append(el('span',eventLabel(event.type),'trace-step'));}progress.append(milestones);
    for(const call of toolData.calls){const detail=el('details',undefined,'tool-call');detail.append(el('summary',`${toolLabel(call)} · ${t(call.is_error?'ui.failed':call.state==='completed'?'ui.completed':call.state==='executing'?'ui.running':call.state==='waiting_approval'?'ui.awaiting_approval':call.state==='waiting_authorization'?'ui.awaiting_authorization':call.state==='unknown'?'ui.unknown':'ui.queued')}`),el('pre',JSON.stringify(call.arguments,null,2)));progress.append(detail);}
    for(const event of events.filter(e=>e.type.startsWith('agent.activity.')).slice(-20)){const line=el('div',undefined,'trace-step');line.append(el('span',eventLabel(event.type)),el('code',event.data?.name??event.data?.kind??''));progress.append(line);}
    root.append(progress);
    if(run.output?.text){const answer=el('section',undefined,'transcript-message message-answer');const content=el('div',undefined,'message-text markdown-body');content.innerHTML=renderMessage(run.output.text);answer.append(content);root.append(answer);}
    if(!history&&['completed','failed','cancelled'].includes(run.state)){
        const session=pinnedSession??await api('GET',`/sessions/${run.session_id}`);if(!isCurrent())return;
        root.append(el('p',t(session.state==='closed'?'ui.walk_session_closed':session.state==='closing'?'ui.walk_session_closing':['paused','pausing','resuming'].includes(session.state)?'ui.session_paused_help':'ui.walk_session_open'),'hint'));
        if(['open','paused','pausing','resuming'].includes(session.state)){
            const follow=el('a',t('ui.journey_continue_session'),'button-link');follow.href=`#quickstart?session=${encodeURIComponent(run.session_id)}`;root.append(follow);
            if(['open','paused'].includes(session.state))root.append(button(t('ui.walk_close'),async()=>{if(!await confirmAction(()=>t('ui.walk_close_confirm')))return;await api('POST',`/sessions/${run.session_id}/close`);await refresh();}));
        }
    }
    const files = artifactData.artifacts, downloads = el('div', undefined, 'downloads');
    for (const file of files)
        downloads.append(button(`↓ ${file.name} · ${formatBytes(file.size)}`, async () => {
            const response = await fetch(`/v1/artifacts/${file.id}/content`, { headers: { Authorization: `Bearer ${token}` } });
            if (!response.ok)
                throw new UiError("ui.artifact_download_failed");
            const url = URL.createObjectURL(await response.blob());
            const a = el('a');
            a.href = url;
            a.download = file.name.split('/').at(-1);
            a.click();
            setTimeout(() => URL.revokeObjectURL(url), 1000);
        }));
    if(files.length)root.append(el('h2',t('ui.walk_files')),downloads);
    if (run.state === 'waiting_authorization') {
        const [{calls},session]=await Promise.all([api('GET',`/runs/${id}/tool-calls`),api('GET',`/sessions/${run.session_id}`)]);
        if(!isCurrent())return;
        for (const call of calls.filter(call => call.state === 'waiting_authorization')) {
            const binding=session.definition.tools?.find(tool=>tool.name===call.binding);
            const connectionId=session.definition.tool_bindings?.[call.binding]??binding?.connection_id;
            if(connectionId)root.append(button(t('ui.authorize_the_required_tool'),async()=>{await openEditor(await api('GET',`/connections/${connectionId}`));}));
            root.append(button(t("ui.deny_authorization_operation", { operation: toolLabel(call) }), async () => {
                if (!await confirmAction(() => t("ui.deny_only_this_tool_call_the_agent_will_receive_an")))
                    return;
                await api('POST', `/runs/${id}/tool-calls/${call.id}/deny-authorization`, { request_hash: call.request_hash });
                notice(() => t("ui.authorization_denied_the_agent_will_receive_the_denial_result"));
                await refresh();
            }));
        }
    }
    if (run.state === 'waiting_approval')
        root.append(el('p', t("ui.this_run_is_waiting_for_approval_through_the_api_or"), 'hint'));
    
    const timeline = el('div', undefined, 'events');
    for (const event of events.filter(e => e.type !== 'harness.stderr').slice(-200).reverse()) {
        const line = el('div', undefined, 'event');
        line.append(el('code', `#${event.id}`), el('strong', eventLabel(event.type)), el('div', event.type, 'secondary'));
        if (event.data.text)
            line.append(el('div', event.data.text.slice(0, 1200), 'secondary'));
        timeline.append(line);
    }
    const advanced=el('details');advanced.append(el('summary',t('ui.execution_events')),timeline);root.append(advanced);
    let cursor=events.at(-1)?.id??'0';const more=button(t('ui.execution_more_events'),async()=>{const rows=(await api('GET',`/runs/${id}/events?after=${cursor}`)).events;for(const event of rows){const line=el('div',undefined,'event');line.append(el('code',`#${event.id}`),el('strong',eventLabel(event.type)));timeline.append(line);}if(rows.length)cursor=rows.at(-1).id;else more.hidden=true;});advanced.append(more);advanced.append(identifiers);progress.append(advanced);
}
