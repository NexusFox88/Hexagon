import { describe, expect, it } from 'vitest';
import { resolveCombination, type CombinationInput } from './compatibility.js';
const base: CombinationInput = {
  harness:{id:'test',version:'1',capabilities:['conversation','tools','initialization'],model_providers:['openai-compatible']},
  sandboxCapabilities:['files','pause_resume'],modelProvider:'openai-compatible',toolCapabilities:[['approval']],
  requiredCapabilities:[],initialization:true,network:{mode:'unrestricted',allowed_hosts:[]},credentialHost:'credentials.example.com',
};
describe('combination capability ownership',()=>{
  it('does not elevate structural compatibility to cloud verification',()=>{
    const result=resolveCombination(base);
    expect(result.compatibility.status).toBe('supported');
    expect(result.verification.status).toBe('unverified');
    expect(result.capabilities).toContain('approval');
  });
  it('cannot acquire network or tools capabilities from the wrong layer',()=>{
    const result=resolveCombination({...base,harness:{...base.harness,capabilities:['conversation','network_allowlist']},sandboxCapabilities:['tools'],requiredCapabilities:['tools','network_allowlist']});
    expect(result.capabilities).not.toContain('tools');
    expect(result.capabilities).not.toContain('network_allowlist');
    expect(result.compatibility.reasons).toContain('missing_capability');
    expect(result.compatibility.reasons).toContain('harness_tools_unsupported');
  });
  it('requires approval on every bound tool',()=>{
    expect(resolveCombination({...base,toolCapabilities:[['approval'],[]]}).capabilities).not.toContain('approval');
    expect(resolveCombination({...base,toolCapabilities:[]}).capabilities).not.toContain('approval');
  });
  it('reports protocol, image and network restrictions independently',()=>{
    const result=resolveCombination({...base,harness:{...base.harness,image:{reference:'registry/image',digest:'sha256:abc',platform:'linux/amd64',registry_secret_id:'secret'}},modelProvider:'openai-responses',network:{mode:'allowlist',allowed_hosts:[]}});
    expect(result.compatibility.reasons).toEqual(['incompatible_model','sandbox_oci_image_unsupported','sandbox_private_image_unsupported','network_policy_unsupported','credential_proxy_not_allowed_by_network_policy']);
  });
});
