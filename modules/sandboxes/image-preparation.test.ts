import {randomUUID} from 'node:crypto';
import {expect,it,vi} from 'vitest';
import {openDatabase} from '../storage/database.js';
import {prepareSandboxImage,cleanupSandboxImages} from './image-preparation.js';
import type {SandboxConnector,SandboxImagePreparation} from './connector.js';

it.skipIf(!process.env.TEST_DATABASE_URL)('persists build receipts, resumes polling, scopes sessions and retains uncertain cleanup',async()=>{
 const pool=openDatabase(process.env.TEST_DATABASE_URL!),db=await pool.connect(),tenant=randomUUID(),session=randomUUID();
 let state:'building'|'ready'|'failed'='building';
 const prepareImage=vi.fn(async(request:SandboxImagePreparation)=>{await request.record({id:'template',build_id:'build'});throw Object.assign(Error('never-store'),{status:502,code:'secret-custom-code'});});
 const inspectImage=vi.fn(async()=>state),deleteImage=vi.fn(async()=>{}),findImageByOperation=vi.fn(async()=>undefined);
 const connector={prepareImage,inspectImage,deleteImage,findImageByOperation} as unknown as SandboxConnector;
 const image={reference:'registry/image@sha256:'+'a'.repeat(64),registry_credential:{username:'private',password:'never-store'}};
 try{
  await db.query('INSERT INTO tenants(id,name) VALUES($1,$1)',[tenant]);
  await db.query("INSERT INTO connections(tenant_id,id,kind,provider,name) VALUES($1,'s','sandbox','fixture','s'),($1,'m','model','fixture','m')",[tenant]);
  await db.query("INSERT INTO sessions(tenant_id,id,sandbox_connection_id,model_connection_id,definition) VALUES($1,$2,'s','m','{}')",[tenant,session]);
  await expect(prepareSandboxImage(db,tenant,session,connector,image)).rejects.toMatchObject({code:'sandbox_image_preparation_unconfirmed'});
  const stored=(await db.query('SELECT * FROM resource_operations WHERE tenant_id=$1',[tenant])).rows[0];
  expect(stored.detail.failure).toEqual({category:'Error',status:502});expect(JSON.stringify(stored)).not.toContain('secret-custom-code');
  expect(stored.provider_resource_id).toBe('template');expect(stored.detail.build_id).toBe('build');expect(JSON.stringify(stored)).not.toContain('never-store');
  await expect(prepareSandboxImage(db,tenant,session,connector,image)).rejects.toMatchObject({code:'sandbox_image_build_pending'});
  state='ready';expect(await prepareSandboxImage(db,tenant,session,connector,image)).toBe('template');
  const checked=(await db.query('SELECT detail,attempt_count FROM resource_operations WHERE tenant_id=$1',[tenant])).rows[0];expect(checked.detail.reason).toBeUndefined();expect(checked.attempt_count).toBe(2);
  expect(prepareImage).toHaveBeenCalledTimes(1);expect(findImageByOperation).not.toHaveBeenCalled();
  await cleanupSandboxImages(db,'foreign',session,connector);expect(deleteImage).not.toHaveBeenCalled();
  deleteImage.mockRejectedValueOnce(Error('lost_delete_receipt'));
  await expect(cleanupSandboxImages(db,tenant,session,connector)).rejects.toThrow('lost_delete_receipt');
  expect((await db.query('SELECT state FROM resource_operations WHERE tenant_id=$1',[tenant])).rows[0].state).toBe('completed');
  await cleanupSandboxImages(db,tenant,session,connector);
  expect((await db.query('SELECT state FROM resource_operations WHERE tenant_id=$1',[tenant])).rows[0].state).toBe('deleted');
  await cleanupSandboxImages(db,tenant,session,connector);expect(deleteImage).toHaveBeenCalledTimes(2);
 }finally{db.release();await pool.end();}
});

it.skipIf(!process.env.TEST_DATABASE_URL)('does not resubmit unknown builds or interpret no matches as successful cleanup',async()=>{
 const pool=openDatabase(process.env.TEST_DATABASE_URL!),db=await pool.connect(),tenant=randomUUID(),session=randomUUID();
 const prepareImage=vi.fn(async()=>{throw Error('timeout');}),findImageByOperation=vi.fn(async()=>undefined),deleteImage=vi.fn();
 const connector={prepareImage,findImageByOperation,deleteImage,inspectImage:vi.fn()} as unknown as SandboxConnector;
 try{
  await db.query('INSERT INTO tenants(id,name) VALUES($1,$1)',[tenant]);
  await db.query("INSERT INTO connections(tenant_id,id,kind,provider,name) VALUES($1,'s','sandbox','fixture','s'),($1,'m','model','fixture','m')",[tenant]);
  await db.query("INSERT INTO sessions(tenant_id,id,sandbox_connection_id,model_connection_id,definition) VALUES($1,$2,'s','m','{}')",[tenant,session]);
  for(let i=0;i<2;i++)await expect(prepareSandboxImage(db,tenant,session,connector,{reference:'image'})).rejects.toMatchObject({code:'sandbox_image_preparation_unconfirmed'});
  await expect(cleanupSandboxImages(db,tenant,session,connector)).rejects.toMatchObject({code:'sandbox_image_preparation_unconfirmed'});
  expect(prepareImage).toHaveBeenCalledTimes(1);expect(deleteImage).not.toHaveBeenCalled();
 }finally{db.release();await pool.end();}
});
