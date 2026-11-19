import {expect,it} from 'vitest';
// @ts-expect-error Browser routing helper is also usable without a DOM.
import {pageParent} from '../apps/console/navigation.js';
it('preserves the source view of reused sessions and saved Agents',()=>{
 expect(pageParent('quickstart',new URLSearchParams('from_session=s&draft=d'))).toEqual(['#sessions?id=s&view=initialization','ui.back_session']);
 expect(pageParent('quickstart',new URLSearchParams('agent=a'))).toEqual(['#agents?id=a','ui.back_agents']);
 expect(pageParent('agents',new URLSearchParams('id=a'))).toEqual(['#agents','ui.back_agents']);
 expect(pageParent('agents',new URLSearchParams('new=1'))).toEqual(['#agents','ui.back_agents']);
});
it('provides stable parents for deep links without relying on browser history',()=>{
 for(const [view,query,href] of [['sessions','id=s','#sessions'],['tools','id=t','#tools'],['fleet','session=s','#fleet'],['runs','id=r','#runs'],['network','','#settings'],['tokens','session=s','#quickstart?session=s']])expect(pageParent(view,new URLSearchParams(query))[0]).toBe(href);
 for(const view of ['sessions','tools','sandboxes','models','harnesses','quickstart'])expect(pageParent(view,new URLSearchParams())).toBeNull();
});
