import {expect,it} from 'vitest';
// @ts-expect-error Browser state policy can also run without a DOM.
import {journeyState} from '../apps/console/operations.js';
it('guides by live readiness rather than a stale saved wizard step',()=>{
 const health={api:'ready',database:'ready'};
 const sandbox={kind:'sandbox',enabled:true,status:'ready'},model={kind:'model',enabled:true,status:'ready'};
 expect(journeyState(health,[],[]).next).toBe('sandboxes');
 expect(journeyState(health,[sandbox],[]).next).toBe('models');
 expect(journeyState(health,[sandbox,model],[]).next).toBe('agents');
 expect(journeyState(health,[sandbox,model],[{id:'agent'}]).next).toBe('quickstart');
 expect(journeyState(health,[sandbox,model],[{id:'agent'}],[{state:'completed'}]).next).toBe('runs');
 expect(journeyState(health,[sandbox,{...model,enabled:false}],[{id:'agent'}],[{}]).next).toBe('models');
 expect(journeyState(health,[sandbox,model],[{id:'archived',archived_at:'today'}]).next).toBe('agents');
 expect(journeyState({api:'ready',database:'unavailable'},[sandbox,model],[{id:'agent'}]).next).toBe('network');
});
