import { readFile, readdir } from 'node:fs/promises';
import pg from 'pg';
const files=(await readdir('.local/evidence')).filter(f=>/^api-smoke-[a-f0-9-]+\.json$/.test(f));
const entries=await Promise.all(files.map(async f=>({file:f,...JSON.parse(await readFile(`.local/evidence/${f}`,'utf8'))})));
for(const e of entries.filter(e=>['boat','e2b','modal'].includes(e.provider)).sort((a,b)=>b.started_at.localeCompare(a.started_at)).slice(0,3)){
 const url=new URL('postgres://hexagon@127.0.0.1:55432/hexagon');url.searchParams.set('options',`-c search_path=${e.schema}`);const pool=new pg.Pool({connectionString:url.toString()});
 try{console.log(JSON.stringify({file:e.file,provider:e.provider,state:e.state,error:e.error,operations:(await pool.query('SELECT kind,state,detail FROM resource_operations')).rows,runs:(await pool.query('SELECT state,error FROM runs ORDER BY created_at')).rows,runtimes:(await pool.query('SELECT state FROM session_runtimes')).rows}));}finally{await pool.end();}
}
