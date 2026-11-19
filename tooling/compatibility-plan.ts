/** Declared compatibility is a test plan, never evidence of execution. */
export interface CompatibilityCatalog {
 connections: Array<{kind:string;provider:string;capabilities:string[]}>;
 harnesses: Array<{id:string;version:string;distribution?:string;protocol:string;model_providers:string[]}>;
 harness_templates: Array<{id:string;version:string;distribution:string;protocol:string;model_providers:string[];capabilities:string[]}>;
}
export function compatibilityPlan(catalog:CompatibilityCatalog){
 const providers=catalog.connections.filter(c=>c.kind==='sandbox'&&c.provider!=='daytona');
 const harnesses=[...catalog.harnesses.filter(h=>['opencode','pi'].includes(h.id)).map(h=>({...h,key:`builtin:${h.id}`,distribution:'builtin',capabilities:['conversation','tools']})),...catalog.harness_templates.map(h=>({...h,key:`oci:${h.id}`}))];
 return providers.flatMap(provider=>harnesses.flatMap(harness=>['anthropic-compatible','openai-compatible','openai-responses'].map(protocol=>({
  sandbox:provider.provider,harness:harness.key,version:harness.version,protocol,clients:['python','typescript'],
  status:!harness.model_providers.includes(protocol)?'unsupported_model_protocol':harness.distribution==='recipe'?'unverified_build_required':harness.distribution==='registry'&&!provider.capabilities.includes('oci_image')?'unsupported_oci_provider':'unverified',
  scenarios:harness.capabilities.includes('tools')?['conversation','continuation','upload','env','remote_tool','artifacts','event_replay','cleanup']:['conversation','continuation','cleanup'],
 }))));
}
