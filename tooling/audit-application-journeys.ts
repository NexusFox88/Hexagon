import assert from 'node:assert/strict';
import {readFile,readdir,writeFile} from 'node:fs/promises';
import {openDatabase} from '../modules/storage/database.js';
import {InstaboxConnector} from '../integrations/sandboxes/instabox.js';
import {localTestCredential} from './local-test-credentials.js';
const pool=openDatabase(process.env.DATABASE_URL??'postgres://hexagon@127.0.0.1:55432/hexagon');const box=new InstaboxConnector({},await localTestCredential('insta_api_key','sandbox'));
const keys=await Promise.all(['EXA_API','TAVILY_API_KEY','DEEPL_API_KEY'].map(key=>localTestCredential(key,'shell')));const evidence:any[]=[];
try{for(const file of (await readdir('.local/applications')).filter(n=>/^(python|typescript)-.*\.json$/.test(n))){const entry=JSON.parse(await readFile('.local/applications/'+file,'utf8'));assert.equal(entry.state,'passed');assert.equal(entry.closed,true);
 const session=(await pool.query('SELECT state FROM sessions WHERE id=$1',[entry.session])).rows[0];assert.equal(session.state,'closed');
 const calls=(await pool.query('SELECT binding,operation,state,result FROM tool_calls WHERE run_id=$1',[entry.run])).rows;assert.equal(calls.length,3);for(const call of calls){assert.equal(call.state,'completed');assert.notEqual(call.result?.isError,true);}
 const events=(await pool.query('SELECT data FROM events WHERE run_id=$1',[entry.run])).rows;const serialized=JSON.stringify({calls,events});for(const key of keys)assert.equal(serialized.includes(key),false);
 const resources=(await pool.query("SELECT provider_resource_id FROM resource_operations WHERE session_id=$1 AND kind='create'",[entry.session])).rows;
 for(const resource of resources){assert.ok(resource.provider_resource_id);assert.equal(await box.inspect(resource.provider_resource_id),null);}
 evidence.push({file,session:entry.session,run:entry.run,tool_results:'all_successful',credential_leak_check:'passed',cleanup:'provider_confirmed_absent',resources:resources.map(r=>r.provider_resource_id)});
 }await writeFile('.local/evidence/application-journey-audit.json',JSON.stringify(evidence,null,2),{mode:0o600});console.log(JSON.stringify(evidence));}finally{await pool.end();}
