import {spawn} from 'node:child_process';
import {resolve} from 'node:path';
import {SecretStore,SecretCipher} from '../credentials/secret-store.js';
import {Connections} from '../connections/connections.js';
import {Sessions} from '../execution/sessions.js';
import {HarnessRegistry} from '../execution/harness.js';
import {randomUUID} from 'node:crypto';
import {it,expect,vi} from 'vitest';
import {openDatabase} from '../storage/database.js';
import {migrate} from '../storage/migrate.js';
import {HarnessImages} from './images.js';
import {createServer} from '../../apps/control-plane/server.js';
import {tokenDigest} from '../credentials/api-auth.js';
const {Hexagon}=await import(process.env.HEXAGON_TEST_TS_MODULE??new URL('../../sdk/typescript/index.js',import.meta.url).href);
it.skipIf(!process.env.TEST_DATABASE_URL).each(['hexagon-json-v1','codex-v1','hermes-v1','openclaw-v1'] as const)('registers %s through both HTTP SDKs, enforcing immutable versions and owner administration',async protocol=>{
 const pool=openDatabase(process.env.TEST_DATABASE_URL!);await migrate(pool);const tenant=randomUUID(),owner=randomUUID(),application=randomUUID();
 const resolved={reference:'docker.io/library/python@sha256:'+'a'.repeat(64),digest:'sha256:'+'a'.repeat(64),platform:'linux/amd64' as const,user:'root',command:['python3','/app/agent.py'],labels:{}};
 const images=new HarnessImages(pool,undefined,vi.fn().mockResolvedValue(resolved));const connections=new Connections(pool,new SecretStore(pool,new SecretCipher(Buffer.alloc(32,1))),[]);const sessions=new Sessions(pool,connections,new HarnessRegistry([],undefined,images));const server=createServer(pool,{connections,sessions,harnessImages:images});
 try{
  await pool.query('INSERT INTO tenants(id,name) VALUES($1,$1)',[tenant]);
  await pool.query("INSERT INTO api_keys(digest,tenant_id,label,role) VALUES($1,$2,'owner','owner'),($3,$2,'application','application')",[tokenDigest(owner),tenant,tokenDigest(application)]);
  const address=await server.listen({port:0,host:'127.0.0.1'});const c=new Hexagon(address,owner),input={image:'python:3.12',id:'custom.http',version:'1',protocol};
  const registered=await c.registerHarness(input);expect(registered.image.reference).toBe(resolved.reference);expect(await c.registerHarness(input)).toEqual(registered);
  await expect(c.registerHarness({...input,command:['different']})).rejects.toMatchObject({status:409,code:'harness_version_conflict'});
  await expect(new Hexagon(address,application).registerHarness(input)).rejects.toMatchObject({status:403});
  const python=await new Promise<string>((resolveResult,reject)=>{const child=spawn('python3',['-c',"import json,sys\nfrom hexagon import Hexagon\nc=json.load(sys.stdin)\nh=Hexagon(c['base'],c['token']).register_harness(**c['input'])\nprint(json.dumps(h))"],{env:{...process.env,PYTHONPATH:process.env.HEXAGON_TEST_PYTHON_PATH||resolve('sdk/python')},stdio:['pipe','pipe','pipe']});let output='',error='';child.stdout.on('data',b=>output+=b);child.stderr.on('data',b=>error+=b);child.on('error',reject);child.on('close',code=>code===0?resolveResult(output):reject(new Error(error)));child.stdin.end(JSON.stringify({base:address,token:owner,input}));});expect(JSON.parse(python)).toEqual(registered);
  expect(await images.catalog('foreign')).toEqual([]);expect((await c.catalog()).harnesses.find((h:any)=>h.id===registered.id&&h.version===registered.version)).toMatchObject(registered);
 }finally{await server.close();await pool.query('DELETE FROM harness_images WHERE tenant_id=$1',[tenant]);await pool.query('DELETE FROM api_keys WHERE tenant_id=$1',[tenant]);await pool.query('DELETE FROM tenants WHERE id=$1',[tenant]);await pool.end();}
});
