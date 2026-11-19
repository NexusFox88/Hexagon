import {randomUUID} from 'node:crypto';
import {expect,it,vi} from 'vitest';
import {openDatabase} from '../storage/database.js';
import {SecretStore,SecretCipher} from '../credentials/secret-store.js';
import {SandboxLifecycle} from './lifecycle.js';
import {Runs} from '../execution/runs.js';
import {ExecutionQueries} from '../execution/queries.js';
import type {SandboxConnector} from './connector.js';

it.skipIf(!process.env.TEST_DATABASE_URL)('pause is tenant-scoped, idle-only, fenced on uncertainty, resumable and independent from close',async()=>{
 const pool=openDatabase(process.env.TEST_DATABASE_URL!),tenant='pause-'+randomUUID(),id=randomUUID(),secrets=new SecretStore(pool,new SecretCipher(Buffer.alloc(32,7)));
 let state='running';const pause=vi.fn(async():Promise<void>=>{state='paused';throw new Error('lost_response');}),resume=vi.fn(async()=>{state='running';});
 const connector={resumeMode:'filesystem',pause,resume,inspect:vi.fn(async()=>({id:'box',state})),destroy:vi.fn(async()=>{state='destroyed';})} as unknown as SandboxConnector;
 const lifecycle=new SandboxLifecycle(pool,secrets,()=>connector),runs=new Runs(pool);
 try{
 await pool.query('INSERT INTO tenants(id,name) VALUES($1,$1)',[tenant]);
 const secret=await secrets.save(tenant,'connection:s','fixture');
 await pool.query("INSERT INTO connections(tenant_id,id,kind,provider,name,secret_id,status,enabled) VALUES($1,'s','sandbox','fixture','sandbox',$2,'ready',true),($1,'m','model','fixture','model',NULL,'ready',true)",[tenant,secret]);
 await pool.query("INSERT INTO sessions(tenant_id,id,sandbox_connection_id,model_connection_id,definition,sandbox) VALUES($1,$2,'s','m',$3,$4)",[tenant,id,{capabilities:['pause_resume'],connections:[{id:'s',provider:'fixture',config:{}}]},{id:'box',state:'running'}]);
 await expect(lifecycle.pause('foreign',id)).rejects.toMatchObject({code:'session_not_found'});
 const r=await runs.submit(tenant,id,'one','task');
 await expect(lifecycle.pause(tenant,id)).rejects.toMatchObject({code:'session_busy'});
 expect((await new ExecutionQueries(pool).activity(tenant,'24h')).active_sessions).toBe(1);
 await pool.query("UPDATE runs SET state='completed' WHERE tenant_id=$1",[tenant]);
 await lifecycle.pause(tenant,id);
 expect(pause).not.toHaveBeenCalled();
 const queued=await runs.submit(tenant,id,'two','task');expect(queued.state).toBe('queued');
 await lifecycle.ensureAwake(tenant,id);
 await pool.query("UPDATE runs SET state='completed' WHERE tenant_id=$1",[tenant]);
 expect((await runs.submit(tenant,id,'one','task')).id).toBe(r.id);
 expect((await new ExecutionQueries(pool).activity(tenant,'7d')).buckets).toHaveLength(7);
 await lifecycle.resume(tenant,id);
 await lifecycle.pause(tenant,id,'sandbox');expect(pause).toHaveBeenCalledTimes(1);
 expect((await pool.query('SELECT state FROM sessions WHERE tenant_id=$1',[tenant])).rows[0].state).toBe('paused');
 const runtimeSecret=await secrets.save(tenant,'runtime:'+id,'runtime-fixture');
 await pool.query("INSERT INTO session_runtimes(tenant_id,session_id,secret_id,state,native_session) VALUES($1,$2,$3,'ready','retained-conversation')",[tenant,id,runtimeSecret]);
 await lifecycle.resume(tenant,id);expect(resume).toHaveBeenCalledTimes(1);
 expect((await pool.query('SELECT state,native_session FROM session_runtimes WHERE tenant_id=$1 AND session_id=$2',[tenant,id])).rows[0]).toEqual({state:'restoring',native_session:'retained-conversation'});
 // Accepted intent but no observed effect must never replay the mutation.
 pause.mockImplementation(async()=>{throw new Error('ambiguous');});
 await expect(lifecycle.pause(tenant,id,'sandbox')).rejects.toMatchObject({code:'session_transition_pending'});
 await expect(lifecycle.pause(tenant,id,'sandbox')).rejects.toMatchObject({code:'session_transition_pending'});
 expect(pause).toHaveBeenCalledTimes(2);
 state='paused';await lifecycle.pause(tenant,id,'sandbox');expect(pause).toHaveBeenCalledTimes(2);
 // A connector-specific fenced reconciliation can recover a wake that never took effect.
 resume.mockImplementationOnce(async()=>{throw Error('lost_wake_response');});
 await expect(lifecycle.resume(tenant,id)).rejects.toMatchObject({code:'session_transition_pending'});
 const initialWakeCalls=resume.mock.calls.length;
 connector.reconcileResume=vi.fn().mockRejectedValueOnce(Error('lease_busy')).mockImplementation(async()=>{state='running';});
 await expect(lifecycle.ensureAwake(tenant,id)).rejects.toMatchObject({code:'session_transition_pending'});
 await lifecycle.ensureAwake(tenant,id);expect(state).toBe('running');expect(resume).toHaveBeenCalledTimes(initialWakeCalls);
 expect(connector.reconcileResume).toHaveBeenCalledTimes(2);
 expect((await new ExecutionQueries(pool).activity('foreign','24h')).active_sessions).toBe(0);
 // Automatic idle sleep and a durable queued request drive wake without a client resume.
 await lifecycle.resume(tenant,id);
 pause.mockImplementation(async()=>{state='paused';});
 await pool.query("UPDATE sessions SET updated_at=now()-interval '2 minutes' WHERE tenant_id=$1",[tenant]);
 await pool.query("UPDATE runs SET updated_at=now()-interval '2 minutes' WHERE tenant_id=$1",[tenant]);
 await lifecycle.pauseIdle();
 expect((await pool.query('SELECT state FROM sessions WHERE tenant_id=$1',[tenant])).rows[0].state).toBe('paused');
 const wake=await runs.submit(tenant,id,'wake','wake automatically');
 const claim=await runs.claim('auto-wake-test');expect(claim.id).toBe(wake.id);
 await lifecycle.ensureAwake(tenant,id);expect(state).toBe('running');
 await pool.query("UPDATE runs SET state='completed' WHERE tenant_id=$1",[tenant]);
 // Native automatic standby is delegated, never falsely reported as confirmed compute suspension.
 await pool.query("UPDATE sessions SET definition=jsonb_set(definition,'{capabilities}','[\"automatic_standby\",\"filesystem_resume\"]'::jsonb) WHERE tenant_id=$1 AND id=$2",[tenant,id]);
 const calls=pause.mock.calls.length;
 expect(await lifecycle.pause(tenant,id,'sandbox')).toMatchObject({state:'paused',compute_paused:false,provider_managed_standby:true});
 expect(pause).toHaveBeenCalledTimes(calls);await lifecycle.ensureAwake(tenant,id);
 // Close is independent, permanently destroys the same resource.
 connector.inspect=vi.fn(async()=>state==='destroyed'?null:{id:'box',state});
 await lifecycle.close(tenant,id);expect(connector.destroy).toHaveBeenCalledTimes(1);
 await expect(lifecycle.resume(tenant,id)).rejects.toMatchObject({code:'session_closed'});
 }finally{await pool.end();}
});
