import {randomBytes,randomUUID} from 'node:crypto';
import {afterAll,beforeAll,describe,expect,it} from 'vitest';
import {openDatabase} from '../storage/database.js';
import {Connections} from './connections.js';
import {SecretCipher,SecretStore} from '../credentials/secret-store.js';
const url=process.env.TEST_DATABASE_URL;
describe.skipIf(!url)('Tool reverse usage',()=>{
 const pool=openDatabase(url??''),tenant=randomUUID(),foreign=randomUUID(),tool=randomUUID(),otherTool=randomUUID(),agent=randomUUID(),session=randomUUID(),run=randomUUID();
 const service=new Connections(pool,new SecretStore(pool,new SecretCipher(randomBytes(32))),[]);
 beforeAll(async()=>{
  for(const id of [tenant,foreign])await pool.query('INSERT INTO tenants(id,name) VALUES($1,$1)',[id]);
  for(const id of [tool,otherTool])await pool.query("INSERT INTO connections(tenant_id,id,kind,provider,name) VALUES($1,$2,'tool','fixture','Tool')",[tenant,id]);
  await pool.query("INSERT INTO agents(tenant_id,id,name,definition) VALUES($1,$2,'Bound agent',$3)",[tenant,agent,{bindings:{tools:{search:tool}}}]);
  await pool.query("INSERT INTO sessions(tenant_id,id,agent_id,sandbox_connection_id,model_connection_id,definition,state) VALUES($1,$2,$3,$4,$4,'{}','closed')",[tenant,session,agent,tool]);
  await pool.query("UPDATE sessions SET definition=$3 WHERE tenant_id=$1 AND id=$2",[tenant,session,{name:'Wiki session',connections:[{id:tool,config:{tools:{search:{name:'read_wiki_structure'}}}}]}]);
  await pool.query("INSERT INTO session_tools(tenant_id,session_id,name,connection_id) VALUES($1,$2,'search',$3)",[tenant,session,tool]);
  await pool.query("INSERT INTO runs(tenant_id,id,session_id,idempotency_key,request_hash,input,state) VALUES($1,$2,$3,'key','hash','private-input','completed')",[tenant,run,session]);
  for(let i=0;i<27;i++)await pool.query("INSERT INTO tool_calls(tenant_id,run_id,id,binding,operation,arguments,request_hash,state,execution_policy,result) VALUES($1,$2,$3,'search','search',$4,'hash','completed',$5,$6)",[tenant,run,String(i).padStart(2,'0'),{private:'hidden'},i===0?{connection_id:otherTool}:i===1?null:{connection_id:tool},{private:'hidden',isError:i===2}]);
 });
 afterAll(async()=>{for(const table of ['tool_calls','runs','session_tools','sessions','agents','connections','tenants'])await pool.query(`DELETE FROM ${table} WHERE ${table==='tenants'?'id':'tenant_id'}=ANY($1::text[])`,[[tenant,foreign]]);await pool.end();});
 it('separates bindings from recorded calls, includes closed sessions and paginates without leaking payloads',async()=>{
  expect((await service.usage(tenant,tool,{section:'agents'})).items[0].id).toBe(agent);
  expect((await service.usage(tenant,tool,{section:'sessions'})).items[0].state).toBe('closed');
  const first=await service.usage(tenant,tool,{section:'calls'}),second=await service.usage(tenant,tool,{section:'calls',offset:25});
  expect(first.items[0]).toMatchObject({session_name:'Wiki session',operation_name:'read_wiki_structure'});expect(first.items).toHaveLength(25);expect(first.next_offset).toBe(25);expect(second.items).toHaveLength(1);expect(second.next_offset).toBeNull();
  const items=[...first.items,...second.items];expect(items.some(i=>i.id==='00')).toBe(false);expect(items.some(i=>i.id==='01')).toBe(true);expect(items.find(i=>i.id==='02').is_error).toBe(true);expect(JSON.stringify(items)).not.toContain('hidden');
  expect((await service.usage(tenant,otherTool,{section:'calls'})).items).toHaveLength(1);
 });
 it('authorizes connection ownership and validates pagination',async()=>{
  await expect(service.usage(foreign,tool,{section:'calls'})).rejects.toMatchObject({status:404});
  await expect(service.usage(tenant,tool,{section:'calls',offset:-1})).rejects.toThrow();
 });
});
