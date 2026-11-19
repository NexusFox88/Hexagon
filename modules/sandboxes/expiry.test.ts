import { randomUUID } from 'node:crypto';
import { describe, expect, it, vi } from 'vitest';
import { openDatabase } from '../storage/database.js';
import { SecretCipher, SecretStore } from '../credentials/secret-store.js';
import { Runs } from '../execution/runs.js';
import { SandboxLifecycle } from './lifecycle.js';
import type { SandboxConnector } from './connector.js';

describe.skipIf(!process.env.TEST_DATABASE_URL)('Persistent sandbox expiry', () => {
  it('retains deadlines after lost create responses, fences workers, and reconciles deletion after restart', async () => {
    const pool=openDatabase(process.env.TEST_DATABASE_URL!),tenant=`expiry-${randomUUID()}`,session=randomUUID();
    const secrets=new SecretStore(pool,new SecretCipher(Buffer.alloc(32,8)));
    let present=true;
    const connector={
      expiry:'control_plane',
      create:vi.fn().mockRejectedValue(new Error('create_response_lost')),
      findByOperation:vi.fn().mockResolvedValue([{id:'owned-persistent',state:'running'}]),
      inspect:vi.fn(async()=>present?{id:'owned-persistent',state:'running'}:null),
      destroy:vi.fn().mockRejectedValueOnce(new Error('delete_unavailable')).mockImplementation(async()=>{present=false;}),
    } as unknown as SandboxConnector;
    const lifecycle=new SandboxLifecycle(pool,secrets,()=>connector),runs=new Runs(pool);
    try{
      await pool.query('INSERT INTO tenants(id,name) VALUES($1,$1)',[tenant]);
      const secret=await secrets.save(tenant,'connection:sandbox','fixture');
      await pool.query("INSERT INTO connections(tenant_id,id,kind,provider,name,secret_id,status,enabled) VALUES($1,'sandbox','sandbox','fixture','fixture',$2,'ready',true),($1,'model','model','fixture','fixture',NULL,'ready',true)",[tenant,secret]);
      await pool.query("INSERT INTO agents(tenant_id,id,name,definition) VALUES($1,'agent','fixture','{}')",[tenant]);
      await pool.query("INSERT INTO sessions(tenant_id,id,agent_id,sandbox_connection_id,model_connection_id,definition) VALUES($1,$2,'agent','sandbox','model',$3)",[tenant,session,{resources:{timeout_seconds:600},network:{mode:'unrestricted',allowed_hosts:[]},connections:[{id:'sandbox',provider:'fixture',config:{}}]}]);
      await expect(lifecycle.provision(tenant,session)).rejects.toMatchObject({code:'sandbox_creation_unconfirmed'});
      let operation=(await pool.query("SELECT * FROM resource_operations WHERE tenant_id=$1 AND kind='create'",[tenant])).rows[0];
      expect(operation.detail).toMatchObject({expiry:'control_plane',reason:'creation_unconfirmed'});
      expect(Date.parse(operation.detail.expires_at)).toBeGreaterThan(Date.now());
      await lifecycle.reapExpired();expect(connector.findByOperation).not.toHaveBeenCalled();
      await pool.query("INSERT INTO runs(tenant_id,id,session_id,idempotency_key,request_hash,input,state,output) VALUES($1,'completed',$2,'previous','fixture','fixture','completed',$3)",[tenant,session,{text:'retained result'}]);
      const run=await runs.submit(tenant,session,'active','fixture');
      const lease=await runs.claim('original-worker',60);
      expect(lease.id).toBe(run.id);
      await runs.advance(lease,'provisioning');await runs.advance(lease,'running');
      await pool.query("INSERT INTO approvals(tenant_id,id,run_id,action) VALUES($1,'approval',$2,'{}')",[tenant,run.id]);
      await pool.query("UPDATE resource_operations SET next_check_at=now(),detail=detail || jsonb_build_object('expires_at',(now()-interval '1 second')::text) WHERE tenant_id=$1 AND kind='create'",[tenant]);
      await expect(runs.submit(tenant,session,'after-expiry','new work')).rejects.toMatchObject({code:'sandbox_expired'});
      expect((await runs.submit(tenant,session,'active','fixture')).id).toBe(run.id);
      await lifecycle.reapExpired();
      expect((await runs.get(tenant,run.id)).state).toBe('cancelling');
      await expect(runs.heartbeat(lease)).rejects.toMatchObject({code:'lease_lost'});
      expect(await runs.claim('new-worker')).toBeNull();
      expect((await pool.query('SELECT state FROM sessions WHERE tenant_id=$1',[tenant])).rows[0].state).toBe('closing');
      expect((await pool.query('SELECT state FROM approvals WHERE tenant_id=$1',[tenant])).rows[0].state).toBe('expired');
      operation=(await pool.query("SELECT * FROM resource_operations WHERE tenant_id=$1 AND kind='create'",[tenant])).rows[0];
      expect(operation.detail).toMatchObject({expiry:'control_plane',reconciled_ids:['owned-persistent']});
      expect((await pool.query("SELECT state FROM resource_operations WHERE tenant_id=$1 AND kind='delete'",[tenant])).rows[0].state).toBe('unknown');
      await pool.query("UPDATE resource_operations SET next_check_at=now() WHERE tenant_id=$1",[tenant]);
      await new SandboxLifecycle(pool,secrets,()=>connector).reapExpired();
      expect((await runs.get(tenant,run.id)).state).toBe('cancelled');
      expect((await runs.get(tenant,'completed')).output).toEqual({text:'retained result'});
      expect((await pool.query('SELECT state FROM sessions WHERE tenant_id=$1',[tenant])).rows[0].state).toBe('closed');
      expect(connector.create).toHaveBeenCalledTimes(1);expect(connector.findByOperation).toHaveBeenCalledTimes(1);
      expect(connector.destroy).toHaveBeenCalledTimes(2);
      await lifecycle.reapExpired();expect(connector.destroy).toHaveBeenCalledTimes(2);
      const events=await runs.events(tenant,run.id);
      expect(events.filter(e=>e.type==='run.cancelling')).toHaveLength(1);
      expect(events.filter(e=>e.type==='run.cancelled')).toHaveLength(1);
    }finally{
      for(const table of ['events','approvals','runs','resource_operations','sessions','agents','connections','secrets','tenants'])await pool.query(`DELETE FROM ${table} WHERE ${table==='tenants'?'id':'tenant_id'}=$1`,[tenant]);
      await pool.end();
    }
  });
});
