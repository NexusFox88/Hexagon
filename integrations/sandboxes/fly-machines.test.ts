import { afterEach, expect, it, vi } from 'vitest';
import { FlyMachinesConnector } from './fly-machines.js';
const id = 'hexagon-00000000-0000-4000-8000-000000000000';
afterEach(() => vi.unstubAllGlobals());
it('retains an App with no Machines for cleanup after partial creation', async () => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce(Response.json({ name: id })).mockResolvedValueOnce(Response.json([])));
  expect(await new FlyMachinesConnector({}, 'fixture').findByOperation(id.slice(8))).toMatchObject([{ id, state: 'empty' }]);
});
it('does not treat a failed Machine list as confirmed App deletion', async () => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce(Response.json({ name: id })).mockResolvedValueOnce(new Response('', { status: 404 })));
  await expect(new FlyMachinesConnector({}, 'fixture').inspect(id)).rejects.toThrow('fly_http_404');
});
it('rejects stopped compute without an implicit wake or command', async () => {
  const fetch = vi.fn().mockResolvedValueOnce(Response.json([{ id: 'abcd', state: 'stopped' }])); vi.stubGlobal('fetch', fetch);
  await expect(new FlyMachinesConnector({}, 'fixture').execute(id, 'echo unexpected')).rejects.toThrow('fly_machine_not_ready');
  expect(fetch).toHaveBeenCalledTimes(1);
});
it('uses the pinned public OCI reference without starting the image entrypoint',async()=>{
 const fetch=vi.fn().mockResolvedValueOnce(Response.json({})).mockResolvedValueOnce(Response.json({id:'machine'})).mockResolvedValueOnce(Response.json({}));vi.stubGlobal('fetch',fetch);
 await new FlyMachinesConnector({},'fixture').create({operation_id:id.slice(8),session_id:'session',timeout_seconds:60,network:{mode:'unrestricted',allowed_hosts:[]},image:{reference:'ghcr.io/example/harness@sha256:'+'a'.repeat(64),user:'root'}});
 const body=JSON.parse((fetch.mock.calls[1]![1] as RequestInit).body as string);expect(body.config.image).toContain('@sha256:');expect(body.config.init.exec).toEqual(['sleep','infinity']);expect(body.config.services).toEqual([]);
});
it('rejects private OCI before creating any resource',async()=>{
 const fetch=vi.fn();vi.stubGlobal('fetch',fetch);
 await expect(new FlyMachinesConnector({},'fixture').create({operation_id:id.slice(8),session_id:'session',timeout_seconds:60,network:{mode:'unrestricted',allowed_hosts:[]},image:{reference:'ghcr.io/example/private',user:'root',registry_credential:{username:'u',password:'p'}}})).rejects.toThrow('fly_private_image_unsupported');expect(fetch).not.toHaveBeenCalled();
});
it('bounds commands and file operations with GNU and BusyBox compatible timeout flags',async()=>{
 const calls:any[]=[];
 vi.stubGlobal('fetch',vi.fn(async(url:string,init?:RequestInit)=>{
  if(url.endsWith('/machines'))return Response.json([{id:'machine',state:'started',config:{metadata:{hexagon_operation:id.slice(8)}}}]);
  const body=JSON.parse(init!.body as string);calls.push(body.command);
  return Response.json({exit_code:0,stdout:body.command.includes('python3')?'0':'ok',stderr:''});
 }));
 const connector=new FlyMachinesConnector({},'fixture');
 await connector.execute(id,'echo ok',{timeout_seconds:10});
 await connector.read(id,'/tmp/empty');
 expect(calls[0][0]).toBe('sh');
 expect(calls.find(c=>c[0]==='bash')[2]).toMatch(/^timeout -k 5 10 bash/);
 expect(calls.find(c=>c[0]==='sh')[2]).toContain('apk add --no-cache python3');
 expect(calls.find(c=>c[0]==='timeout').slice(0,5)).toEqual(['timeout','-k','5','60','python3']);
});
it.each(['suspended','started','stopped'])('fences wake reconciliation and inspects the exact Machine: %s',async state=>{
 const fetch=vi.fn(async(url:string,init?:RequestInit)=>{
  if(url.endsWith('/machines'))return Response.json([{id:'abcd',state}]);
  if(url.endsWith('/lease')&&init?.method==='POST')return Response.json({data:{nonce:'fixture-nonce'}});
  if(url.endsWith('/abcd'))return Response.json({id:'abcd',state});
  return Response.json({});
 });vi.stubGlobal('fetch',fetch);
 const pending=new FlyMachinesConnector({},'fixture').reconcileResume(id);
 if(state==='stopped')await expect(pending).rejects.toThrow('fly_resume_state_pending');else await pending;
 const starts=fetch.mock.calls.filter(([url])=>url.endsWith('/start'));
 expect(starts).toHaveLength(state==='suspended'?1:0);
 if(starts.length)expect(starts[0]![1]?.headers).toMatchObject({'fly-machine-lease-nonce':'fixture-nonce'});
 expect(fetch.mock.calls.filter(([url,init])=>url.endsWith('/lease')&&init?.method==='DELETE')).toHaveLength(1);
 expect(fetch.mock.calls.some(([url,init])=>url.endsWith('/machines')&&init?.method==='POST')).toBe(false);
});
