import {randomBytes,randomUUID} from 'node:crypto';
import {expect,it,vi} from 'vitest';
import {openDatabase} from '../storage/database.js';
import {SecretStore,SecretCipher} from '../credentials/secret-store.js';
import {Connections} from './connections.js';
const fixture=vi.hoisted(()=>({discover:vi.fn()}));
vi.mock('../../integrations/mcp/remote.js',async original=>({...await original<any>(),discoverMcp:fixture.discover}));
it.skipIf(!process.env.TEST_DATABASE_URL)('owns discovery, pins reviewed tools and rejects a stale discovery response',async()=>{
 const pool=openDatabase(process.env.TEST_DATABASE_URL!),tenant=randomUUID();const connections=new Connections(pool,new SecretStore(pool,new SecretCipher(randomBytes(32))),[]);
 const tools={mcp_0123456789abcdef01234567:{name:'read',description:'Read fixture',input_schema:{type:'object'},approval:true}};
 try{
  await pool.query('INSERT INTO tenants(id,name) VALUES($1,$1)',[tenant]);
  const row=await connections.create(tenant,{kind:'tool',provider:'mcp-remote',name:'MCP fixture',config:{endpoint:'https://fixture.test/mcp',authentication:'none'}});
  fixture.discover.mockResolvedValue(tools);
  await expect(connections.discoverMcp('foreign',row.id)).rejects.toMatchObject({code:'connection_not_found'});expect(fixture.discover).not.toHaveBeenCalled();
  const found=await connections.discoverMcp(tenant,row.id);expect(found.config.tools).toEqual(tools);expect(found.enabled).toBe(false);expect(found.status).toBe('draft');
  await expect(connections.patch(tenant,row.id,{enabled:true})).rejects.toMatchObject({code:'validation_required'});
  let release!:(value:unknown)=>void,started!:()=>void;const ready=new Promise<void>(r=>started=r);
  fixture.discover.mockImplementationOnce(()=>{started();return new Promise(r=>release=r);});const pending=connections.discoverMcp(tenant,row.id);await ready;
  await connections.patch(tenant,row.id,{name:'Changed while discovering'});release(tools);
  await expect(pending).rejects.toMatchObject({code:'connection_changed_during_validation'});
  expect((await connections.get(tenant,row.id)).name).toBe('Changed while discovering');
 }finally{for(const table of ['connections','secrets','tenants'])await pool.query(`DELETE FROM ${table} WHERE ${table==='tenants'?'id':'tenant_id'}=$1`,[tenant]);await pool.end();}
});
