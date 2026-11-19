import {it,expect,vi} from 'vitest';
import {ResourceFaults} from '../tooling/resource-faults.js';
import type {SandboxConnector,SandboxRequest} from '../modules/sandboxes/connector.js';
it('isolates injected uncertainty to one operation across independent SDK Sessions',async()=>{
 const resources=new Map<string,any>();
 const connector={create:vi.fn(async(r:SandboxRequest)=>{const v={id:r.operation_id,state:'running'};resources.set(v.id,v);return v;}),findByOperation:vi.fn(async(id:string)=>resources.has(id)?[resources.get(id)]:[]),destroy:vi.fn(async(id:string)=>{resources.delete(id);}),inspect:vi.fn(async(id:string)=>resources.get(id)??null),execute:vi.fn(),read:vi.fn(),write:vi.fn(),preview:vi.fn()} as SandboxConnector;
 const faults=new ResourceFaults(),wrapped=faults.wrap(connector,async()=>{});
 const request=(id:string):SandboxRequest=>({operation_id:id,session_id:id,timeout_seconds:60,network:{mode:'unrestricted',allowed_hosts:[]}});
 await expect(wrapped.create(request('target'))).rejects.toThrow('injected_create_response_lost');
 expect(await wrapped.findByOperation('target')).toHaveLength(1);
 expect(await wrapped.create(request('python'))).toMatchObject({id:'python'});
 await wrapped.destroy('python');expect(await connector.inspect('python')).toBeNull();
 await expect(wrapped.destroy('target')).rejects.toThrow('injected_delete_transport_failure');expect(await connector.inspect('target')).not.toBeNull();
 await expect(wrapped.destroy('target')).rejects.toThrow('injected_delete_response_lost');expect(await connector.inspect('target')).toBeNull();
 expect(faults.evidence).toEqual({creates:1,delete_attempts:2,actual_deletes:1,created_resource:'target',reconciliations:1});
});
