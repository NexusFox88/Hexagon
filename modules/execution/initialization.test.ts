import {it,expect} from 'vitest';
import {compileInitialization,initializationInput,behaviorInput} from './initialization.js';
import {agentInput,sessionInput} from './sessions.js';
import {piAdapter} from '../../integrations/harnesses/pi.js';
import {openCodeAdapter} from '../../integrations/harnesses/opencode.js';
import {randomUUID} from 'node:crypto';
const behavior={identity:{name:'Case assistant',role:'Research'},instructions:'Cite evidence',context:{text:'Customer background',documents:[{name:'brief',text:'quoted reference'}]}};
it('separates instructions from background and never treats display names as identity',()=>{
 expect(compileInitialization({})).toBeUndefined();const init=compileInitialization(behavior)!;
 expect(init.system).toContain('Case assistant');expect(init.system).not.toContain('Customer background');expect(init.context).toContain('quoted reference');
 expect(initializationInput('question',undefined,init)).toContain('Customer background');expect(initializationInput('followup','native',init)).toBe('followup');
 expect(compileInitialization(behavior)?.digest).toBe(init.digest);expect(compileInitialization({...behavior,instructions:'Changed'})?.digest).not.toBe(init.digest);
});
it('rejects fake principals, unsupported context shapes and oversized inputs',()=>{
 for(const value of [{identity:{name:'x',tenant_id:'other'}},{context:{text:'x',credentials:'key'}},{instructions:'x'.repeat(32769)},{instructions:'a\0b'}])expect(behaviorInput.safeParse(value).success).toBe(false);
});
it('rejects saved Agent behavior overrides and revisions without an Agent',()=>{
 const base={sandbox_connection_id:randomUUID(),model_connection_id:randomUUID()};
 expect(sessionInput.safeParse({...base,harness:{id:'pi',version:'1'},...behavior}).success).toBe(true);
 for(const extra of [{identity:behavior.identity},{instructions:''},{context:{text:'x'}}])expect(sessionInput.safeParse({...base,agent_id:randomUUID(),...extra}).success).toBe(false);
 expect(sessionInput.safeParse({...base,harness:{id:'pi',version:'1'},agent_revision:2}).success).toBe(false);
 expect(agentInput.parse({name:'Display',harness:{id:'pi',version:'1'},...behavior}).identity?.name).toBe('Case assistant');
});
it.each([piAdapter,openCodeAdapter])('$definition.id preserves native instructions each turn without replaying background',adapter=>{
 const init=compileInitialization(behavior)!;const model={base_url:'https://example.test',model:'model',credential:'delegated'};
 const first=adapter.invocation('run','Task',model,undefined,undefined,init),second=adapter.invocation('run2','Continue',model,'native',undefined,init);
 for(const request of [first,second])expect(JSON.stringify(request)).toContain('Cite evidence');
 expect(JSON.stringify(first)).toContain('Customer background');expect(JSON.stringify(second)).not.toContain('Customer background');
});
