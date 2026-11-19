import { randomBytes, randomUUID } from 'node:crypto';
import { writeFile, mkdir, unlink } from 'node:fs/promises';
import { z } from 'zod';
import { openDatabase } from '../modules/storage/database.js';
import { migrate } from '../modules/storage/migrate.js';
import { SecretCipher, SecretStore } from '../modules/credentials/secret-store.js';
import { tokenDigest } from '../modules/credentials/api-auth.js';
import { Connections } from '../modules/connections/connections.js';
import { Sessions } from '../modules/execution/sessions.js';
import { SandboxLifecycle } from '../modules/sandboxes/lifecycle.js';
import { createServer } from '../apps/control-plane/server.js';
import { e2bConnection, E2BConnector } from '../integrations/sandboxes/e2b.js';
import { localTestCredential } from './local-test-credentials.js';
import { Hexagon, HexagonError } from '../sdk/typescript/index.js';

const id = randomUUID(), tenant = `connection-ui-${id}`, schema = `hexagon_smoke_${id.replaceAll('-', '')}`;
const url = new URL('postgres://hexagon@127.0.0.1:55432/hexagon');
const admin = openDatabase(url.toString()); await admin.query(`CREATE SCHEMA "${schema}"`); await admin.end();
url.searchParams.set('options', `-c search_path=${schema}`);
const pool = openDatabase(url.toString()); await migrate(pool);
const key = randomBytes(32), token = randomBytes(32).toString('hex');
const store = new SecretStore(pool, new SecretCipher(key));
const credential = await localTestCredential('e2b_api_key', 'sandbox');
const connections = new Connections(pool, store, [e2bConnection, { kind: 'model', provider: 'fixture', config: z.object({}), capabilities: [], async validate() { return { operations: ['fixture_only_no_model_request'] }; } }]);
const sessions = new Sessions(pool, connections, [{ id: 'fixture', version: '1', capabilities: [], model_providers: ['fixture'] }]);
const lifecycle = new SandboxLifecycle(pool, store, (_provider, config, value) => new E2BConnector(config, value));
const app = createServer(pool, { connections, sessions, lifecycle });
const file = `.local/evidence/${tenant}`;
const evidence: Record<string, any> = { tenant, schema, state: 'intent', observations: [], started_at: new Date().toISOString() };
await mkdir('.local/evidence', { recursive: true, mode: 0o700 }); await writeFile(`${file}.key`, key, { mode: 0o600 });
const save = () => writeFile(`${file}.json`, JSON.stringify(evidence, null, 2), { mode: 0o600 });
const connector = new E2BConnector({ template: 'base' }, credential);
try {
  await pool.query('INSERT INTO tenants(id,name) VALUES($1,$1)', [tenant]);
  await pool.query("INSERT INTO api_keys(digest,tenant_id,label) VALUES($1,$2,'browser')", [tokenDigest(token), tenant]);
  const base = await app.listen({ host: '127.0.0.1', port: 0 }), client = new Hexagon(base, token);
  const sandbox = await client.createConnection({ kind: 'sandbox', provider: 'e2b', name: 'Lifecycle sandbox', config: { template: 'base' }, credential });
  await client.validateConnection(sandbox.id); await client.updateConnection(sandbox.id, { enabled: true });
  const sibling = await client.createConnection({ kind: 'sandbox', provider: 'e2b', name: 'Shared credential sibling', config: { template: 'base' }, credential });
  await client.validateConnection(sibling.id);
  const model = await client.createConnection({ kind: 'model', provider: 'fixture', name: 'Lifecycle fixture model', credential: 'fixture-only' });
  await client.validateConnection(model.id); await client.updateConnection(model.id, { enabled: true });
  const agent = await client.createAgent({ name: 'Lifecycle fixture', harness: { id: 'fixture', version: '1' } });
  const definition = { agent_id: agent.id, sandbox_connection_id: sandbox.id, model_connection_id: model.id };
  const session = await client.createSession(definition);
  evidence.session = session.id; evidence.connection = sandbox.id; evidence.sibling = sibling.id; await save();
  evidence.resource = await lifecycle.provision(tenant, session.id); await save();
  const purpose = 'gui-checkpoint:browser';
  const secret_id = await store.save(tenant, purpose, JSON.stringify({ base, token, credential, session: session.id, connection: sandbox.id }));
  await writeFile(`${file}.json.browser.json`, JSON.stringify({ base, tenant, schema, secret_id, purpose }), { mode: 0o600 });
  console.log(JSON.stringify({ checkpoint: `${file}.json.browser.json`, session: session.id }));
  const deadline = Date.now() + 900000; let last = '';
  while (Date.now() < deadline) {
    const row = (await pool.query('SELECT name,status,enabled,version,config,deleted_at FROM connections WHERE tenant_id=$1 AND id=$2', [tenant, sandbox.id])).rows[0];
    const state = JSON.stringify(row);
    if (last !== state) { evidence.observations.push(row); last = state; await save(); }
    if (row.status === 'ready' && row.enabled && row.version > 2) evidence.reenabled = true;
    if (evidence.reenabled && !row.enabled && !row.deleted_at && !evidence.disabled_rejections) {
      for (const action of [() => client.createSession(definition), () => client.submit(session.id, 'Must not execute', 'disabled')]) {
        try { await action(); throw new Error('disabled_connection_accepted'); }
        catch (error) { if (!(error instanceof HexagonError) || error.code !== 'connection_not_ready') throw error; }
      }
      evidence.disabled_rejections = true; await save();
    }
    if (row.deleted_at) {
      if (!evidence.disabled_rejections || (await client.session(session.id)).state !== 'closed') throw new Error('lifecycle_order_incomplete');
      if (await connector.inspect(evidence.resource.id)) throw new Error('resource_remains');
      if ((await client.validateConnection(sibling.id)).status !== 'ready') throw new Error('shared_credential_affected');
      if (!evidence.observations.some((r: any) => r.status === 'invalid') || !evidence.observations.some((r: any) => r.name === 'Updated lifecycle sandbox' && r.config.template === 'nonexistent-lifecycle-template' && r.status === 'draft' && !r.enabled)) throw new Error('gui_edits_missing');
      if (JSON.stringify((await client.session(session.id)).definition) !== JSON.stringify(session.definition)) throw new Error('pinned_definition_changed');
      await client.deleteConnection(sibling.id); await client.deleteConnection(model.id);
      evidence.shared_credential_still_valid = true; evidence.product_cleanup = 'confirmed'; evidence.state = 'verified'; break;
    }
    await new Promise(resolve => setTimeout(resolve, 250));
  }
  if (evidence.state !== 'verified') throw new Error('browser_timeout');
} catch (error) { evidence.state = 'failed'; evidence.error = error instanceof Error ? error.message : 'unknown'; process.exitCode = 1; }
finally {
  await app.close();
  try {
    const ops = (await pool.query("SELECT id,provider_resource_id FROM resource_operations WHERE tenant_id=$1 AND kind='create'", [tenant])).rows;
    for (const op of ops) {
      const ids = op.provider_resource_id ? [op.provider_resource_id] : (await connector.findByOperation(op.id)).map(r => r.id);
      for (const resource of ids) { if (await connector.inspect(resource)) await connector.destroy(resource); if (await connector.inspect(resource)) throw new Error('resource_remains'); }
    }
    evidence.resource_cleanup = 'confirmed';
  } catch { evidence.resource_cleanup = 'requires_reconciliation'; process.exitCode = 1; }
  await unlink(`${file}.json.browser.json`).catch(() => {});
  evidence.finished_at = new Date().toISOString(); await save(); await pool.end();
  console.log(JSON.stringify({ file: `${file}.json`, state: evidence.state, error: evidence.error, cleanup: evidence.resource_cleanup }));
}
