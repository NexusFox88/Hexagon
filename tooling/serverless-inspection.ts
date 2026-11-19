/** Independent local acceptance audit; provider credentials never enter evidence. */
import {resolve} from 'node:path';
import {createHash} from 'node:crypto';
import {openDatabase} from '../modules/storage/database.js';
import {SecretStore,loadLocalCipher} from '../modules/credentials/secret-store.js';
import {createSandboxConnector} from '../integrations/sandboxes/registry.js';
export async function inspectServerlessWorkspace(sessionId:string,filename='hexagon-workspace-file'){
 if(!/^[a-zA-Z0-9_.-]+$/.test(filename)||filename==='.'||filename==='..')throw Error('invalid_acceptance_filename');
 const pool=openDatabase(process.env.HEXAGON_ACCEPTANCE_DATABASE_URL??process.env.DATABASE_URL??'postgres://hexagon@127.0.0.1:55432/hexagon');
 try{
  const s=(await pool.query("SELECT s.*,r.native_session FROM sessions s JOIN session_runtimes r ON r.tenant_id=s.tenant_id AND r.session_id=s.id WHERE s.tenant_id='local-workspace' AND s.id=$1",[sessionId])).rows[0];
  if(!s)throw Error('missing_local_session');
  const c=(await pool.query('SELECT * FROM connections WHERE tenant_id=$1 AND id=$2',[s.tenant_id,s.sandbox_connection_id])).rows[0];
  const pinned=s.definition.connections.find((p:any)=>p.id===c.id);
  const secrets=new SecretStore(pool,await loadLocalCipher(resolve(process.env.HEXAGON_DATA_DIR??'.local/control-plane','master.key')));
  const connector=createSandboxConnector(pinned.provider,pinned.config,await secrets.read(c.tenant_id,c.secret_id,'connection:'+c.id));
  const bytes=await connector.read(s.sandbox.id,'/tmp/hexagon-runtime/workspace/'+filename);
  return {sha256:createHash('sha256').update(bytes).digest('hex'),native_session:s.native_session,file:Buffer.from(bytes).toString('utf8').trim()};
 }finally{await pool.end();}
}
