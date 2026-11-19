import {expect,it,vi} from 'vitest';
const calls=vi.hoisted(()=>({create:vi.fn()}));
vi.mock('e2b',()=>({Sandbox:{create:calls.create},CommandExitError:class extends Error{},NotFoundError:class extends Error{}}));
import {E2BConnector} from './e2b.js';
it('persists an accepted sandbox ID even if the following info lookup fails',async()=>{
 const order:string[]=[];calls.create.mockResolvedValue({sandboxId:'accepted',getInfo:async()=>{order.push('lookup');throw Error('lookup_timeout');}});
 const record=vi.fn(async()=>{order.push('record');});
 await expect(new E2BConnector({},'fixture').create({operation_id:'op',session_id:'session',timeout_seconds:300,network:{mode:'unrestricted',allowed_hosts:[]},record})).rejects.toThrow('lookup_timeout');
 expect(record).toHaveBeenCalledWith('accepted','op');expect(order).toEqual(['record','lookup']);
});
