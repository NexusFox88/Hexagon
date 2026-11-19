import {randomUUID} from 'node:crypto';
import {it,expect,vi} from 'vitest';
import {z} from 'zod';
import {openDatabase} from '../storage/database.js';
import {migrate} from '../storage/migrate.js';
import {SecretStore,SecretCipher} from '../credentials/secret-store.js';
import {Connections,type ConnectionAdapter} from '../connections/connections.js';
import {Sessions} from '../execution/sessions.js';
import {HarnessImages} from './images.js';
import {HarnessRegistry} from '../execution/harness.js';
it.skipIf(!process.env.TEST_DATABASE_URL)('rejects unsupported providers before allocation and freezes exact image identity into supported Sessions',async()=>{
 const pool=openDatabase(process.env.TEST_DATABASE_URL!),tenant=randomUUID();await migrate(pool);
 vi.stubEnv('HEXAGON_ACCESS_URL','https://fixture.example');
 try{
  await pool.query('INSERT INTO tenants(id,name) VALUES($1,$1)',[tenant]);
  const store=new SecretStore(pool,new SecretCipher(Buffer.alloc(32,3))),adapters:ConnectionAdapter[]=[{kind:'sandbox',provider:'unsupported',capabilities:[]},{kind:'sandbox',provider:'oci',capabilities:['oci_image']},{kind:'model',provider:'anthropic-compatible',capabilities:[]}].map(a=>({...a,kind:a.kind as ConnectionAdapter['kind'],config:z.object({}),validate:async()=>({operations:['fixture']})}));
  const connections=new Connections(pool,store,adapters),ids:Record<string,string>={};
  for(const a of adapters){const c=await connections.create(tenant,{kind:a.kind,provider:a.provider,name:a.provider,credential:'fixture'});await connections.validate(tenant,c.id);await connections.patch(tenant,c.id,{enabled:true});ids[a.provider]=c.id;}
  const reference={reference:'docker.io/library/python@sha256:'+'a'.repeat(64),digest:'sha256:'+'a'.repeat(64),platform:'linux/amd64' as const,user:'root',command:['python3','/app/main.py'],labels:{}};
  const images=new HarnessImages(pool,store,vi.fn().mockResolvedValue(reference)),h=await images.register(tenant,{image:'python:3.12'}),sessions=new Sessions(pool,connections,new HarnessRegistry([],undefined,images),store);
  const input={harness:{id:h.id,version:h.version},sandbox_connection_id:ids.unsupported!,model_connection_id:ids['anthropic-compatible']!};
  await expect(sessions.create(tenant,input,true)).rejects.toMatchObject({code:'sandbox_oci_image_unsupported'});
  expect((await pool.query('SELECT 1 FROM sessions WHERE tenant_id=$1',[tenant])).rowCount).toBe(0);expect((await pool.query('SELECT 1 FROM resource_operations WHERE tenant_id=$1',[tenant])).rowCount).toBe(0);
  const session=await sessions.create(tenant,{...input,sandbox_connection_id:ids.oci!});expect(session.definition.harness_image).toEqual(h.image);
 }finally{vi.unstubAllEnvs();for(const table of ['sessions','connections','harness_images','secrets','tenants'])await pool.query(`DELETE FROM ${table} WHERE ${table==='tenants'?'id':'tenant_id'}=$1`,[tenant]);await pool.end();}
});
