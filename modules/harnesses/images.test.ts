import {SecretStore,SecretCipher} from '../credentials/secret-store.js';
import {ManagedSecrets} from '../credentials/managed-secrets.js';
import {randomUUID} from 'node:crypto';
import {it,expect,vi} from 'vitest';
import {openDatabase} from '../storage/database.js';
import {migrate} from '../storage/migrate.js';
import {HarnessImages} from './images.js';
import {HarnessPackages} from '../execution/harness-packages.js';
import {HarnessRegistry} from '../execution/harness.js';
const reference={reference:'docker.io/library/python@sha256:'+'a'.repeat(64),digest:'sha256:'+'a'.repeat(64),platform:'linux/amd64' as const,user:'root',command:['python3','/app/main.py'],labels:{}};
it.skipIf(!process.env.TEST_DATABASE_URL)('pins immutable image registrations, resolves tenant ownership and reserves versions across formats',async()=>{
 const pool=openDatabase(process.env.TEST_DATABASE_URL!),tenant='oci-'+randomUUID();await migrate(pool);
 try{
  await pool.query('INSERT INTO tenants(id,name) VALUES($1,$1)',[tenant]);const images=new HarnessImages(pool,undefined,vi.fn().mockResolvedValue(reference));
  const input={id:'custom.test',version:'1',image:'python:3.12'};const image=await images.register(tenant,input);expect(image.image.reference).toBe(reference.reference);
  expect(await images.register(tenant,input)).toEqual(image);
  await expect(images.register(tenant,{...input,command:['python3','other.py']})).rejects.toMatchObject({code:'harness_version_conflict'});
  expect(await images.catalog('another-tenant')).toEqual([]);expect(await images.resolveForTenant('another-tenant',image)).toBeUndefined();
  const registry=new HarnessRegistry([],new HarnessPackages(pool),images);expect((await registry.resolveForTenant(tenant,image)).definition.image?.reference).toBe(reference.reference);
  await expect(new HarnessPackages(pool).register(tenant,{id:'custom.test',version:'1',protocol:'hexagon-json-v1',interpreter:'python3',entrypoint:'main.py',model_providers:['anthropic-compatible'],files:[{path:'main.py',content:'print(1)'}]})).rejects.toMatchObject({code:'harness_version_conflict'});
  await expect(images.register(tenant,{...input,version:'2',registry_secret_id:randomUUID()})).rejects.toMatchObject({code:'secret_not_found'});
 }finally{await pool.query('DELETE FROM harness_images WHERE tenant_id=$1',[tenant]);await pool.query('DELETE FROM harness_packages WHERE tenant_id=$1',[tenant]);await pool.query('DELETE FROM tenants WHERE id=$1',[tenant]);await pool.end();}
});

it.skipIf(!process.env.TEST_DATABASE_URL)('keeps registry passwords out of definitions and enforces rotation, disabling and references',async()=>{
 const pool=openDatabase(process.env.TEST_DATABASE_URL!),tenant='private-oci-'+randomUUID();await migrate(pool);
 try{
  await pool.query('INSERT INTO tenants(id,name) VALUES($1,$1)',[tenant]);
  const store=new SecretStore(pool,new SecretCipher(Buffer.alloc(32,2))),managed=new ManagedSecrets(pool,store),resolve=vi.fn().mockResolvedValue(reference),images=new HarnessImages(pool,store,resolve);
  const secret=await managed.create(tenant,{name:'Registry',value:JSON.stringify({username:'fixture-user',password:'fixture-original'})});
  const image=await images.register(tenant,{image:'python:3.12',registry_secret_id:secret.id});
  expect(resolve).toHaveBeenCalledWith('python:3.12',{username:'fixture-user',password:'fixture-original'});
  expect(JSON.stringify(image)).not.toContain('fixture-original');expect((await managed.get(tenant,secret.id)).harnesses).toEqual([{id:image.id,version:image.version}]);
  await expect(managed.remove(tenant,secret.id)).rejects.toMatchObject({code:'secret_in_use'});
  await managed.patch(tenant,secret.id,{value:JSON.stringify({username:'fixture-user',password:'fixture-rotated'})});
  expect(await images.credential(tenant,secret.id)).toEqual({username:'fixture-user',password:'fixture-rotated'});
  await expect(images.credential('foreign',secret.id)).rejects.toMatchObject({code:'secret_not_found'});
  await managed.patch(tenant,secret.id,{enabled:false});await expect(images.credential(tenant,secret.id)).rejects.toMatchObject({code:'secret_disabled'});
 }finally{for(const table of ['harness_images','managed_secrets','secrets','tenants'])await pool.query(`DELETE FROM ${table} WHERE ${table==='tenants'?'id':'tenant_id'}=$1`,[tenant]);await pool.end();}
});
