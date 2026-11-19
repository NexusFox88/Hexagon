import { describe, expect, it, vi } from 'vitest';
const state = vi.hoisted(() => ({ create: vi.fn(), fromId: vi.fn(), fromName: vi.fn(), close: vi.fn(), app: vi.fn(), list: vi.fn() }));
vi.mock('modal', () => ({
  NotFoundError: class NotFoundError extends Error {},
  ModalClient: class { close=state.close; apps={fromName:state.app}; images={fromRegistry:(image:string)=>({dockerfileCommands:()=>image})}; sandboxes={create:state.create,fromId:state.fromId,fromName:state.fromName,list:state.list}; },
}));
import { ModalConnector } from './modal.js';
import { NotFoundError } from 'modal';
const credential=JSON.stringify({token_id:'fixture-id',token_secret:'fixture-secret'});
describe('Modal connector boundaries',()=>{
 it('pins operation identity, resource policy and private ingress without public ports',async()=>{
  state.app.mockResolvedValue({appId:'app'});state.create.mockResolvedValue({sandboxId:'sb'});
  const connector=new ModalConnector({app:'hexagon'},credential);
  await connector.create({operation_id:'operation',session_id:'session',timeout_seconds:300,network:{mode:'allowlist',allowed_hosts:['example.com']}});
  const options=state.create.mock.calls.at(-1)![2];
  expect(options).toMatchObject({name:'hexagon-operation',tags:{hexagon_operation:'operation',hexagon_session:'session'},timeoutMs:300000,memoryMiB:2048,outboundDomainAllowlist:['example.com']});
  expect(options.command).toEqual(['sleep','infinity']);
  expect(options.encryptedPorts).toBeUndefined();expect(options.unencryptedPorts).toBeUndefined();
 });
 it('keeps an OCI sandbox alive independently of its image entrypoint',async()=>{
  state.app.mockResolvedValue({appId:'app'});state.create.mockResolvedValue({sandboxId:'sb'});
  await new ModalConnector({},credential).create({operation_id:'oci',session_id:'s',timeout_seconds:300,network:{mode:'unrestricted',allowed_hosts:[]},image:{reference:'docker.io/library/python@sha256:'+ 'a'.repeat(64),user:'root'}});
  expect(state.create.mock.calls.at(-1)![2].command).toEqual(['sleep','infinity']);
 });
 it('keeps connect tokens in server-only headers without replacing Runtime Authorization',async()=>{
  state.fromId.mockResolvedValue({createConnectToken:async()=>({url:'https://private.modal.host/',token:'private-token'})});
  const target=await new ModalConnector({},credential).preview('sb',8765);
  expect(target).toEqual({url:'https://private.modal.host',headers:{Cookie:'_modal_connect_token=private-token'}});
  expect(target.url).not.toContain('private-token');
 });
 it('distinguishes confirmed absence from uncertain transport failures',async()=>{
  const connector=new ModalConnector({},credential);
  state.fromId.mockRejectedValue(new NotFoundError('missing'));
  expect(await connector.inspect('sb')).toBeNull();
  state.fromId.mockRejectedValue(new Error('transport failed'));
  await expect(connector.inspect('sb')).rejects.toThrow('transport failed');
  state.fromName.mockRejectedValue(new Error('transport failed'));
  await expect(connector.findByOperation('operation')).rejects.toThrow('transport failed');
 });
});
it('persists the returned checkpoint receipt before returning control to lifecycle',async()=>{
 const record=vi.fn(async()=>{});state.fromId.mockResolvedValue({snapshotFilesystem:async()=>({imageId:'image-receipt'})});
 expect(await new ModalConnector({},credential).snapshot('source',{operation_id:'operation',record})).toBe('image-receipt');
 expect(record).toHaveBeenCalledWith('image-receipt');
});
