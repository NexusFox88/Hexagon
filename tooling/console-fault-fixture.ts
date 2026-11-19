import { randomBytes, randomUUID } from 'node:crypto';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { z } from 'zod';
import { openDatabase } from '../modules/storage/database.js';
import { migrate } from '../modules/storage/migrate.js';
import { SecretCipher, SecretStore } from '../modules/credentials/secret-store.js';
import { tokenDigest } from '../modules/credentials/api-auth.js';
import { Connections, type ConnectionAdapter } from '../modules/connections/connections.js';
import { Sessions } from '../modules/execution/sessions.js';
import { SandboxLifecycle } from '../modules/sandboxes/lifecycle.js';
import type { SandboxConnector } from '../modules/sandboxes/connector.js';
import { createServer } from '../apps/control-plane/server.js';

const id = randomUUID(), tenant = `console-fault-${id}`, schema = `hexagon_smoke_${id.replaceAll('-', '')}`;
const url = new URL('postgres://hexagon@127.0.0.1:55432/hexagon');
const admin = openDatabase(url.toString());
await admin.query(`CREATE SCHEMA "${schema}"`);
url.searchParams.set('options', `-c search_path=${schema}`);
const pool = openDatabase(url.toString()); await migrate(pool);
const key = randomBytes(32), token = randomBytes(32).toString('hex');
const store = new SecretStore(pool, new SecretCipher(key));
const adapters: ConnectionAdapter[] = ['sandbox', 'model'].map(kind => ({ kind: kind as 'sandbox' | 'model', provider: 'fixture', config: z.object({}), capabilities: [], async validate() { return { operations: ['controlled_fixture'] }; } }));
const connections = new Connections(pool, store, adapters);
const sessions = new Sessions(pool, connections, [{ id: 'fixture', version: '1', capabilities: [], model_providers: ['fixture'] }]);
let resource = true, deletes = 0;
const unsupported = async (): Promise<never> => { throw new Error('not_used'); };
const connector: SandboxConnector = {
  create: unsupported, findByOperation: async () => [],
  inspect: async () => resource ? { id: 'controlled-resource', state: 'running' } : null,
  destroy: async () => { deletes++; if (deletes === 1) throw new Error('controlled_delete_failure'); resource = false; },
  execute: unsupported, read: unsupported, write: unsupported, preview: unsupported,
};
const lifecycle = new SandboxLifecycle(pool, store, () => connector);
const app = createServer(pool, { connections, sessions, lifecycle });
const file = '.local/evidence/fleet-ui';
const evidence: Record<string, any> = { tenant, schema, state: 'running', cases: {} };
try {
  await pool.query('INSERT INTO tenants(id,name) VALUES($1,$1)', [tenant]);
  await pool.query("INSERT INTO api_keys(digest,tenant_id,label) VALUES($1,$2,'browser-fixture')", [tokenDigest(token), tenant]);
  const ids: Record<string, string> = {};
  for (const kind of ['sandbox', 'model'] as const) {
    const c = await connections.create(tenant, { kind, provider: 'fixture', name: `Controlled ${kind}`, credential: 'fixture-only' });
    await connections.validate(tenant, c.id); await connections.patch(tenant, c.id, { enabled: true }); ids[kind] = c.id;
  }
  for (const name of ['Runtime unreachable', 'Runtime interrupted', 'Cleanup retry', 'Creation unknown']) {
    const agent = await sessions.createAgent(tenant, { name, harness: { id: 'fixture', version: '1' } });
    const session = await sessions.create(tenant, { agent_id: agent.id, sandbox_connection_id: ids.sandbox!, model_connection_id: ids.model! });
    evidence.cases[name] = session.id;
    if (name === 'Creation unknown') {
      await pool.query("INSERT INTO resource_operations(tenant_id,id,session_id,kind,state,detail) VALUES($1,$2,$3,'create','unknown',$4)", [tenant, randomUUID(), session.id, { reason: 'creation_unconfirmed' }]);
      continue;
    }
    await pool.query('UPDATE sessions SET sandbox=$3 WHERE tenant_id=$1 AND id=$2', [tenant, session.id, { id: 'controlled-resource', state: 'running' }]);
    const secret = await store.save(tenant, `runtime:${session.id}`, 'fixture-runtime');
    await pool.query('INSERT INTO session_runtimes(tenant_id,session_id,secret_id,state) VALUES($1,$2,$3,$4)', [tenant, session.id, secret, name === 'Runtime unreachable' ? 'unreachable' : name === 'Runtime interrupted' ? 'interrupted' : 'ready']);
    const run = randomUUID();
    await pool.query("INSERT INTO runs(tenant_id,id,session_id,idempotency_key,request_hash,input,state,error) VALUES($1,$2,$3,'fixture','fixture','Controlled fault display',$4,$5)", [tenant, run, session.id, name === 'Runtime unreachable' ? 'waiting_authorization' : 'failed', { code: name === 'Runtime interrupted' ? 'runtime_interrupted' : 'controlled_fixture' }]);
    await pool.query("INSERT INTO events(tenant_id,run_id,type,data) VALUES($1,$2,'fixture.observation',$3)", [tenant, run, { message: 'Controlled event for browser acceptance' }]);
    if (name === 'Cleanup retry') await lifecycle.close(tenant, session.id).catch(error => { if (error.code !== 'sandbox_deletion_unconfirmed') throw error; });
  }
  const base = await app.listen({ host: '127.0.0.1', port: 0 });
  await mkdir('.local/evidence', { recursive: true, mode: 0o700 });
  await writeFile(`${file}.key`, key, { mode: 0o600 });
  const purpose = 'gui-checkpoint:browser';
  const secret_id = await store.save(tenant, purpose, JSON.stringify({ base, token, cases: evidence.cases }));
  await writeFile(`${file}.json.browser.json`, JSON.stringify({ base, tenant, schema, secret_id, purpose }), { mode: 0o600 });
  console.log(JSON.stringify({ base, checkpoint: `${file}.json.browser.json` }));
  const deadline = Date.now() + 600000;
  let result;
  while (Date.now() < deadline) {
    result = await readFile(`${file}.${id}.done.json`, 'utf8').catch(() => null);
    if (result) break;
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  if (!result) throw new Error('browser_timeout');
  evidence.browser = JSON.parse(result);
  const closed = await sessions.get(tenant, evidence.cases['Cleanup retry']);
  if (closed.state !== 'closed' || resource || deletes !== 2 || !evidence.browser.passed) throw new Error('cleanup_browser_not_verified');
  evidence.state = 'verified'; evidence.delete_attempts = deletes;
} catch (error) { evidence.state = 'failed'; evidence.error = error instanceof Error ? error.message : 'unknown'; process.exitCode = 1; }
finally {
  await app.close(); await pool.end();
  await admin.query(`DROP SCHEMA "${schema}" CASCADE`); await admin.end();
  evidence.fixture_cleanup = 'confirmed';
  await writeFile(`${file}.${id}.json`, JSON.stringify(evidence, null, 2), { mode: 0o600 });
  console.log(JSON.stringify({ evidence: `${file}.${id}.json`, state: evidence.state }));
}
