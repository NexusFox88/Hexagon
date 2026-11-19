import {t,formatDate} from './i18n.js';
const node=(tag,text,css)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=text;if(css)n.className=css;return n;};
export async function renderToolUsage(root,id,api){
 const hash=location.hash,query=new URLSearchParams(hash.split('?')[1]??''),section=query.get('section')??'sessions',offset=query.get('offset')??'0';
 const [connection,data]=await Promise.all([api('GET',`/connections/${id}`),api('GET',`/connections/${id}/usage?section=${encodeURIComponent(section)}&offset=${encodeURIComponent(offset)}`)]);if(location.hash!==hash)return;
 root.replaceChildren();const heading=node('div',undefined,'usage-heading');document.getElementById('title').textContent=connection.name;heading.append(node('p',t('ui.tool_usage_help'),'hint'));root.append(heading);
 const tabs=node('nav',undefined,'session-view-tabs');tabs.setAttribute('aria-label',t('ui.tool_usage'));for(const key of ['sessions','agents','calls']){const a=node('a',t(`ui.tool_usage_${key}`));a.href=`#tools?id=${id}&section=${key}`;if(key===section)a.setAttribute('aria-current','page');tabs.append(a);}root.append(tabs);
 const wrap=node('div',undefined,'table-wrap usage-table'),table=node('table'),head=node('thead'),tr=node('tr'),body=node('tbody');
 const columns=section==='calls'?['ui.tool_usage_operation','ui.sessions','ui.agents','ui.dense_status','ui.tool_usage_time']:section==='agents'?['ui.agents','ui.dense_status']:['ui.sessions','ui.agents','ui.dense_status','ui.tool_usage_time'];for(const key of columns){const th=node('th',t(key));th.scope='col';tr.append(th);}head.append(tr);table.append(head,body);wrap.append(table);root.append(wrap);
 const link=(label,href)=>{const a=node('a',label);a.href=href;return a;};
 for(const item of data.items){const row=node('tr'),values=[];if(section==='calls'){values.push(link(`${item.binding} · ${item.operation_name||item.operation}`,`#sessions?id=${item.session_id}&run=${item.run_id}`),link(item.session_name||item.session_id.slice(0,8),`#sessions?id=${item.session_id}`));}else values.push(link(item.name||item.id.slice(0,8),`#${section}?id=${item.id}`));
 if(section!=='agents')values.push(item.agent_id?link(item.agent_name||item.agent_id.slice(0,8),`#agents?id=${item.agent_id}`):node('span',t('ui.tool_usage_direct'),'secondary'));
 const state=section==='agents'?(item.archived_at?'archived':'active'):item.is_error?'failed':item.state;
 values.push(node('span',t(`ui.usage_state_${state}`),'usage-state'));if(section!=='agents')values.push(node('span',formatDate(item.created_at),'secondary'));
 for(const value of values){const td=node('td');td.append(value);row.append(td);}body.append(row);}
 if(!data.items.length){const row=node('tr'),td=node('td',t('ui.tool_usage_empty'),'hint');td.colSpan=columns.length;row.append(td);body.append(row);}
 const pagination=node('div',undefined,'actions pagination');for(const [next,key] of [[Number(offset)?Math.max(0,Number(offset)-25):null,'ui.previous_page'],[data.next_offset,'ui.next_page']]){const a=node('a',t(key));if(next!==null)a.href=`#tools?id=${id}&section=${section}&offset=${next}`;else a.setAttribute('aria-disabled','true');pagination.append(a);}root.append(pagination);
}
