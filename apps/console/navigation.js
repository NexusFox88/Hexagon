/** Explicit parents work identically after direct entry, refresh and in-app navigation. */
export function pageParent(view, params) {
 const id=key=>encodeURIComponent(params.get(key));
 if(view==='sessions'&&params.has('id'))return ['#sessions','ui.back_sessions'];
 if(view==='secrets'&&params.has('id'))return ['#secrets','ui.credentials_secrets'];
 if(view==='tools'&&params.has('id'))return ['#tools','ui.tool_usage_back'];
 if(view==='fleet'&&params.has('session'))return ['#fleet','ui.back_fleet'];
 if(view==='runs'&&params.has('id'))return ['#runs','ui.back_runs'];
 if(view==='agents'&&(params.has('id')||params.has('new')))return ['#agents','ui.back_agents'];
 if(view==='quickstart'){
  if(params.has('from_session'))return [`#sessions?id=${id('from_session')}&view=initialization`,'ui.back_session'];
  if(params.has('session'))return [`#sessions?id=${id('session')}`,'ui.back_session'];
  if(params.has('agent'))return [`#agents?id=${id('agent')}`,'ui.back_agents'];
 }
 if(view==='tokens'){
  if(params.has('session'))return [`#quickstart?session=${id('session')}`,'ui.api_playground'];
  if(params.has('agent'))return [`#quickstart?agent=${id('agent')}`,'ui.api_playground'];
 }
 if(['tokens','network','agents','operations'].includes(view))return ['#settings','ui.back_settings'];
 return null;
}
