import {UiError} from './i18n.js';
/** Never enable a failed validation; retain the saved identity before any remote check. */
export async function verifySandboxConnection(api,saved,onSaved,failureKey='ui.sandbox_verify_failed'){
 onSaved(saved);
 const checked=await api('POST',`/connections/${saved.id}/validate`);onSaved(checked);
 if(checked.status!=='ready')throw new UiError(checked.validation?.code==='sandbox_openssh_unavailable'?'ui.sandbox_openssh_unavailable':failureKey);
 return api('PATCH',`/connections/${saved.id}`,{enabled:true});
}
