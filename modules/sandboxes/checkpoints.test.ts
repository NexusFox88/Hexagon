import {randomUUID} from 'node:crypto';
import {expect,it,vi} from 'vitest';
import {openDatabase} from '../storage/database.js';
import {checkpointTransition} from './checkpoints.js';
import type {SandboxConnector} from './connector.js';
it.skipIf(!process.env.TEST_DATABASE_URL)('persists checkpoint before deleting compute and reconciles a lost restore response without another create',async()=>{
 const pool=openDatabase(process.env.TEST_DATABASE_URL!),db=await pool.connect(),tenant='snapshot-'+randomUUID(),id=randomUUID();
 let live=true,restored=false;const snapshot=vi.fn(async()=> 'image-1'),restore=vi.fn(async()=>{restored=true;throw Error('lost_response');});
 const connector={snapshot,restore,inspect:async()=>live?{id:'old',state:'running'}:null,destroy:async()=>{const stored=(await db.query("SELECT provider_resource_id FROM resource_operations WHERE tenant_id=$1 AND kind='checkpoint'",[tenant])).rows[0];expect(stored.provider_resource_id).toBe('image-1');live=false;},findByOperation:async()=>restored?[{id:'new',state:'running'}]:[]} as unknown as SandboxConnector;
 try{
 await db.query('INSERT INTO tenants(id,name) VALUES($1,$1)',[tenant]);
 await db.query("INSERT INTO connections(tenant_id,id,kind,provider,name) VALUES($1,'s','sandbox','fixture','s'),($1,'m','model','fixture','m')",[tenant]);
 const row={tenant_id:tenant,id,sandbox:{id:'old',state:'running'},definition:{resources:{timeout_seconds:600},network:{mode:'unrestricted',allowed_hosts:[]}}};
 await db.query("INSERT INTO sessions(tenant_id,id,sandbox_connection_id,model_connection_id,definition) VALUES($1,$2,'s','m',$3)",[tenant,id,row.definition]);
 const paused=await checkpointTransition(db,row,connector,false);expect(paused).toMatchObject({state:'paused',checkpoint:'image-1'});
 expect(await checkpointTransition(db,row,connector,false)).toEqual(paused);expect(snapshot).toHaveBeenCalledTimes(1);
 const resumed=await checkpointTransition(db,{...row,sandbox:paused},connector,true);expect(resumed.id).toBe('new');
 await checkpointTransition(db,{...row,sandbox:paused},connector,true);expect(restore).toHaveBeenCalledTimes(1);
 const foreign={...row,id:randomUUID(),sandbox:{id:'another',state:'running'}};
 await db.query("INSERT INTO sessions(tenant_id,id,sandbox_connection_id,model_connection_id,definition) VALUES($1,$2,'s','m',$3)",[tenant,foreign.id,row.definition]);
 snapshot.mockImplementation(async()=>{throw Error('unknown');});
 await expect(checkpointTransition(db,foreign,connector,false)).rejects.toMatchObject({code:'sandbox_checkpoint_unconfirmed'});
 await expect(checkpointTransition(db,foreign,connector,false)).rejects.toMatchObject({code:'sandbox_checkpoint_unconfirmed'});expect(snapshot).toHaveBeenCalledTimes(2);
 }finally{db.release();await pool.end();}
});
