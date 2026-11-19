import { afterEach, expect, it, vi } from 'vitest';
import { createHash } from 'node:crypto';
import { InstaboxConnector } from './instabox.js';
import { validateInstaboxCertificate } from './instabox-transport.js';
const id=`m_${'a'.repeat(26)}`, op=`op_${'b'.repeat(26)}`;
const json=(data:unknown,status=200)=>new Response(JSON.stringify(data),{status});
const request={operation_id:'test-operation',session_id:'session',timeout_seconds:600,network:{mode:'unrestricted' as const,allowed_hosts:[]}};
const machine={id,state:'running',spec:{memMiB:8192}};
afterEach(()=>vi.unstubAllGlobals());
it('creates with explicit credential non-delivery, control-plane expiry and stable idempotency',async()=>{
 const fetch=vi.fn().mockResolvedValueOnce(json({id:op,machineId:id,type:'create',state:'succeeded'})).mockResolvedValueOnce(json(machine));vi.stubGlobal('fetch',fetch);
 expect(await new InstaboxConnector({},'account-secret').create(request)).toEqual({id,state:'running',memory_mb:8192});
 const init=fetch.mock.calls[0]![1];expect(init.headers['Idempotency-Key']).toBe(request.operation_id);
 expect(JSON.parse(init.body)).toMatchObject({vault:false,secrets:[],envSecrets:[],deleteAfterSeconds:0,metadata:{hexagon_operation:request.operation_id}});
 expect(init.body).not.toContain('account-secret');
});
it('rejects unsupported policies and invalid IDs before any request',async()=>{
 const fetch=vi.fn();vi.stubGlobal('fetch',fetch);const box=new InstaboxConnector({},'key');
 await expect(box.create({...request,network:{mode:'allowlist',allowed_hosts:['example.com']}})).rejects.toThrow('network_allowlist_unsupported');
 await expect(box.create({...request,timeout_seconds:1})).rejects.toThrow('invalid_sandbox_timeout');
 await expect(box.inspect('../other')).rejects.toThrow('invalid_id');expect(fetch).not.toHaveBeenCalled();
});
it('reconciles all pages and requires both owned name and operation label',async()=>{
 const fetch=vi.fn().mockResolvedValueOnce(json({machines:[{...machine,name:'foreign',metadata:{hexagon_operation:'test'}}],nextCursor:'next'})).mockResolvedValueOnce(json({machines:[{...machine,name:'hexagon-test',metadata:{hexagon_operation:'test'}}],nextCursor:null}));vi.stubGlobal('fetch',fetch);
 expect(await new InstaboxConnector({},'key').findByOperation('test')).toHaveLength(1);expect(fetch.mock.calls[1]![0]).toContain('cursor=next');
});
it('fails closed on looping pagination and auth errors rather than treating them as absence',async()=>{
 vi.stubGlobal('fetch',vi.fn().mockImplementation(async()=>json({machines:[],nextCursor:'same'})));await expect(new InstaboxConnector({},'key').findByOperation('test')).rejects.toThrow('invalid_pagination');
 vi.stubGlobal('fetch',vi.fn().mockResolvedValue(json({},403)));await expect(new InstaboxConnector({},'key').inspect(id)).rejects.toThrow('http_403');
});
it('persists asynchronous deletion before polling and resumes the same handle',async()=>{
 const sequence:string[]=[];const fetch=vi.fn().mockImplementation(async(url:string,init:RequestInit)=>{
  if(init.method==='DELETE'){expect((init.headers as Record<string,string>)['X-Confirm-Delete']).toBe(id);sequence.push('delete');return json({id:op,machineId:id,type:'delete',state:'running'});}
  if(url.includes('/operations/')){sequence.push('poll');return json({id:op,machineId:id,type:'delete',state:'succeeded'});}return json({},404);
 });vi.stubGlobal('fetch',fetch);const box=new InstaboxConnector({},'key');await box.reconcileDeletion(id,{record:async value=>{expect(value).toBe(op);sequence.push('persist');}});expect(sequence).toEqual(['delete','persist','poll']);
 sequence.length=0;await box.reconcileDeletion(id,{provider_operation_id:op,record:async()=>{throw Error('unexpected');}});expect(sequence).toEqual(['poll']);
});
it('never accepts an operation for another resource or a failed operation',async()=>{
 vi.stubGlobal('fetch',vi.fn().mockResolvedValue(json({id:op,machineId:`m_${'c'.repeat(26)}`,type:'delete',state:'succeeded'})));
 await expect(new InstaboxConnector({},'key').reconcileDeletion(id,{provider_operation_id:op,record:async()=>{}})).rejects.toThrow('target_mismatch');
 vi.stubGlobal('fetch',vi.fn().mockResolvedValue(json({id:op,machineId:id,type:'create',state:'failed'})));await expect(new InstaboxConnector({},'key').create(request)).rejects.toThrow('operation_failed');
});
it('does not retry uncertain command execution and preserves observed nonzero exits',async()=>{
 const fetch=vi.fn().mockRejectedValue(new Error('connection lost'));vi.stubGlobal('fetch',fetch);await expect(new InstaboxConnector({},'key').execute(id,'side-effect')).rejects.toThrow('connection lost');expect(fetch).toHaveBeenCalledTimes(1);
 fetch.mockResolvedValue(json({stdout:'',stderr:'bad',exitCode:7}));expect((await new InstaboxConnector({},'key').execute(id,'exit 7')).exit_code).toBe(7);
 fetch.mockResolvedValue(json({stdout:'partial',stderr:'',exitCode:0,truncated:true}));await expect(new InstaboxConnector({},'key').execute(id,'cat file')).rejects.toThrow('output_incomplete');
 fetch.mockResolvedValue(json({error:{message:'private provider detail'},status:503}));await expect(new InstaboxConnector({},'key').execute(id,'run')).rejects.toThrow('transport_failed');
});
it('checks uploaded bytes by size and digest and rejects oversized downloads',async()=>{
 const data=Buffer.from([0,255,1]);const fetch=vi.fn().mockResolvedValue(json({size:data.length,sha256:createHash('sha256').update(data).digest('hex')}));vi.stubGlobal('fetch',fetch);
 await new InstaboxConnector({},'key').write(id,'/tmp/file',data);expect(fetch.mock.calls[0]![1].body).toEqual(data);
 fetch.mockResolvedValue(json({size:data.length,sha256:'wrong'}));await expect(new InstaboxConnector({},'key').write(id,'/tmp/file',data)).rejects.toThrow('write_incomplete');
 fetch.mockResolvedValue(new Response('',{headers:{'Content-Length':String(65*1024*1024)}}));await expect(new InstaboxConnector({},'key').read(id,'/tmp/file')).rejects.toThrow('size_unsupported');
});
it('requires a matching machine, approved SSH endpoint and HTTPS-issued host CA',()=>{
 const certificate={machineId:id,transport:'ssh',username:id,host:'ssh.instabox.sh',port:2222,expiresAt:new Date(Date.now()+120000).toISOString(),certificate:'ssh-ed25519-cert-v01@openssh.com YWJj',hostTrust:{type:'ca',publicKey:'ssh-ed25519 YWJj',principals:['ssh.instabox.sh']}};
 expect(validateInstaboxCertificate(certificate,id)).toBe(certificate);
 for(const change of [{host:'attacker.invalid'},{username:'root'},{hostTrust:{...certificate.hostTrust,principals:[]}},{expiresAt:'2000-01-01'},{certificate:'invalid\ncommand'}])expect(()=>validateInstaboxCertificate({...certificate,...change},id)).toThrow('invalid_ssh_certificate');
});
it('only treats a synchronous structured create quota refusal as definitive',async()=>{
 const box=new InstaboxConnector({},'key');
 vi.stubGlobal('fetch',vi.fn().mockResolvedValue(json({error:{code:'quota_exceeded'}},429)));
 await expect(box.create(request)).rejects.toMatchObject({code:'sandbox_quota_exceeded'});
 for(const body of [{}, {error:{code:'rate_limited'}}, {error:{code:'quota_exceeded',operationId:op}}]){
  vi.stubGlobal('fetch',vi.fn().mockResolvedValue(json(body,429)));
  await expect(box.create(request)).rejects.toThrow('instabox_http_429');
 }
 vi.stubGlobal('fetch',vi.fn().mockResolvedValueOnce(json({id:op,machineId:id,type:'create',state:'running'})).mockResolvedValueOnce(json({error:{code:'quota_exceeded'}},429)));
 await expect(box.create(request)).rejects.toThrow('instabox_http_429');
});
it('records accepted create handles before a polling response can be lost',async()=>{
 const recorded:string[]=[];vi.stubGlobal('fetch',vi.fn().mockResolvedValueOnce(json({id:op,machineId:id,type:'create',state:'running'})).mockImplementationOnce(async()=>{expect(recorded).toEqual([id,op]);throw new TypeError('network failure');}));
 await expect(new InstaboxConnector({},'secret').create({...request,record:async(resource,operation)=>{recorded.push(resource,operation);}})).rejects.toThrow('network failure');expect(recorded).toEqual([id,op]);
});
