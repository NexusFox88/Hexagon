import {expect,it,vi} from 'vitest';
const api=vi.hoisted(()=>({fromImage:vi.fn(),build:vi.fn(),status:vi.fn(),remove:vi.fn(),list:vi.fn(),create:vi.fn()}));
vi.mock('e2b',()=>({Template:Object.assign(()=>({fromImage:api.fromImage}),{buildInBackground:api.build,getBuildStatus:api.status,delete:api.remove,list:api.list}),Sandbox:{create:api.create},CommandExitError:class extends Error{},NotFoundError:class extends Error{}}));
import {E2BConnector} from './e2b.js';
it('uses digest image and scoped build credentials, records receipt before status polling',async()=>{
 const connector=new E2BConnector({},'provider-secret'),image={reference:'registry/image@sha256:'+'a'.repeat(64),registry_credential:{username:'user',password:'registry-secret'}};
 api.fromImage.mockReturnValue('builder');api.build.mockResolvedValue({templateId:'template',buildId:'build'});api.status.mockResolvedValue({status:'ready'});
 const record=vi.fn();const handle=await connector.prepareImage({operation_id:'unique',image,record});
 expect(api.fromImage).toHaveBeenCalledWith(image.reference,image.registry_credential);expect(record).toHaveBeenCalledWith({id:'template',build_id:'build'});
 expect(api.status).not.toHaveBeenCalled();expect(await connector.inspectImage(handle)).toBe('ready');
 expect(api.build.mock.calls[0]![1]).toBe('hexagon-unique');
 await expect(connector.create({operation_id:'o',session_id:'s',image,timeout_seconds:60,network:{mode:'unrestricted',allowed_hosts:[]}})).rejects.toThrow('sandbox_image_not_prepared');
 expect(api.create).not.toHaveBeenCalled();
});
it('does not reconcile failed or building templates with last-successful build IDs',async()=>{
 const connector=new E2BConnector({},'secret');
 for(const buildStatus of ['building','error','ready']){
  let used=false;api.list.mockImplementation(()=>({get hasNext(){return !used;},nextItems:async()=>{used=true;return [{names:['org/hexagon-op'],templateId:'t',buildId:'b',buildStatus}];}}));
  expect(await connector.findImageByOperation('op')).toEqual(buildStatus==='ready'?{id:'t',build_id:'b'}:undefined);
 }
});
