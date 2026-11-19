import { randomBytes, randomUUID } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import { openDatabase } from '../modules/storage/database.js';
import { migrate } from '../modules/storage/migrate.js';
import { SecretCipher, SecretStore } from '../modules/credentials/secret-store.js';
import { tokenDigest } from '../modules/credentials/api-auth.js';
import { Connections } from '../modules/connections/connections.js';
import { Sessions } from '../modules/execution/sessions.js';
import { HarnessRegistry } from '../modules/execution/harness.js';
import { HarnessPackages } from '../modules/execution/harness-packages.js';
import { ExecutionWorker } from '../modules/execution/worker.js';
import { SandboxLifecycle } from '../modules/sandboxes/lifecycle.js';
import { E2BConnector, e2bConnection } from '../integrations/sandboxes/e2b.js';
import { anthropicModelConnection } from '../integrations/models/anthropic-compatible.js';
import { createServer } from '../apps/control-plane/server.js';
import { Hexagon } from '../sdk/typescript/index.js';
import { localTestCredential } from './local-test-credentials.js';

const id = randomUUID(), tenant = `network-api-${id}`, schema = `hexagon_smoke_${id.replaceAll('-', '')}`;
const url = new URL('postgres://hexagon@127.0.0.1:55432/hexagon');
const admin = openDatabase(url.toString()); await admin.query(`CREATE SCHEMA "${schema}"`); await admin.end();
url.searchParams.set('options', `-c search_path=${schema}`);
const pool = openDatabase(url.toString()); await migrate(pool);
const key = randomBytes(32), token = randomBytes(32).toString('hex');
const secrets = new SecretStore(pool, new SecretCipher(key));
const connections = new Connections(pool, secrets, [e2bConnection, anthropicModelConnection]);
const harnesses = new HarnessRegistry([], new HarnessPackages(pool));
const sessions = new Sessions(pool, connections, harnesses);
const lifecycle = new SandboxLifecycle(pool, secrets, (_provider, config, credential) => new E2BConnector(config, credential));
const worker = new ExecutionWorker(pool, secrets, lifecycle, harnesses);
const app = createServer(pool, { connections, sessions, lifecycle, workerHealth: () => worker.health() });
const providerKey = await localTestCredential('e2b_api_key', 'sandbox');
const connector = new E2BConnector({}, providerKey);
const evidence: Record<string, any> = { tenant, schema, state: 'intent', cases: [], started_at: new Date().toISOString() };
const file = `.local/evidence/${tenant}.json`;
await mkdir('.local/evidence', { recursive: true, mode: 0o700 }); await writeFile(`.local/evidence/${tenant}.key`, key, { mode: 0o600 });
const save = () => writeFile(file, JSON.stringify(evidence, null, 2), { mode: 0o600 }); await save();
const source = `import json, subprocess, sys\nfrom pathlib import Path\nrequest=json.load(sys.stdin)\nresults={}\nfor host in ['example.com','example.org']:\n result=subprocess.run(['curl','--noproxy','*','--silent','--output','/dev/null','--write-out','%{http_code}','--connect-timeout','8','--max-time','12','https://'+host+'/'],capture_output=True,text=True,timeout=15)\n results[host]={'exit_code':result.returncode,'http_status':result.stdout.strip()}\nfolder=Path(request['artifact_directory']);folder.mkdir(parents=True,exist_ok=True)\n(folder/'network.json').write_text(json.dumps(results))\nprint(json.dumps({'type':'hexagon.result','text':json.dumps(results),'failed':False}))\n`;
try {
  await pool.query('INSERT INTO tenants(id,name) VALUES($1,$1)', [tenant]);
  await pool.query("INSERT INTO api_keys(digest,tenant_id,label) VALUES($1,$2,'network')", [tokenDigest(token), tenant]);
  const base = await app.listen({ host: '127.0.0.1', port: 0 });
  const client = new Hexagon(base, token);
  const ready = async (input: unknown) => { const row = await client.createConnection(input); await client.validateConnection(row.id); return client.updateConnection(row.id, { enabled: true }); };
  const sandbox = await ready({ kind: 'sandbox', provider: 'e2b', name: 'Network test', config: { template: 'base' }, credential: providerKey });
  const model = await ready({ kind: 'model', provider: 'anthropic-compatible', name: 'User model binding', config: { base_url: await localTestCredential('MINIMAX_ANTHROPIC_BASE_URL', 'shell'), model: await localTestCredential('MINIMAX_ANTHROPIC_MODEL', 'shell') }, credential: await localTestCredential('MINIMAX_ANTHROPIC_API_KEY', 'shell') });
  const harness = { id: 'custom.network-probe', version: '1' };
  await client.registerHarnessPackage({ ...harness, protocol: 'hexagon-json-v1', interpreter: 'python3', entrypoint: 'probe.py', capabilities: [], model_providers: ['anthropic-compatible'], files: [{ path: 'probe.py', content: source }] });
  worker.start();
  for (const mode of ['unrestricted', 'allowlist'] as const) {
    const policy = { mode, allowed_hosts: mode === 'allowlist' ? ['example.com'] : [] };
    const agent = await client.request('POST', '/agents', { name: `Network ${mode}`, harness, network: policy, resources: { timeout_seconds: 300 }, required_capabilities: ['files', 'commands', 'network_allowlist'] });
    const session = await client.createSession({ agent_id: agent.id, sandbox_connection_id: sandbox.id, model_connection_id: model.id });
    if (JSON.stringify(session.definition.network) !== JSON.stringify(policy)) throw new Error('network_not_pinned');
    const entry: Record<string, any> = { mode, session: session.id, policy }; evidence.cases.push(entry); await save();
    const run = await client.submit(session.id, 'Probe public HTTPS destinations and save network.json.', 'network'); entry.run = run.id; await save();
    const deadline = Date.now() + 240000;
    let result;
    while (Date.now() < deadline) {
      result = await client.run(run.id);
      if (['completed', 'failed', 'cancelled'].includes(result.state)) break;
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    if (result?.state !== 'completed') throw new Error('network_probe_run_failed');
    const artifact = (await client.artifacts(run.id)).artifacts.find(row => row.name === 'network.json');
    if (!artifact) throw new Error('network_artifact_missing');
    const bytes = Buffer.from(await client.downloadArtifact(artifact.id));
    const probes = JSON.parse(bytes.toString()); entry.probes = probes; entry.artifact = artifact.id;
    if (JSON.stringify(JSON.parse(result.output!.text)) !== JSON.stringify(probes)) throw new Error('network_output_mismatch');
    const allowed = probes['example.com'], denied = probes['example.org'];
    if (allowed.exit_code !== 0 || allowed.http_status !== '200') throw new Error('allowed_host_unreachable');
    if (mode === 'unrestricted' && (denied.exit_code !== 0 || denied.http_status !== '200')) throw new Error('baseline_host_unreachable');
    if (mode === 'allowlist' && (denied.exit_code === 0 || denied.http_status !== '000')) throw new Error('denied_host_reachable');
    const bound = await client.request('GET', `/sessions/${session.id}`); entry.resource = bound.sandbox.id; await save();
    await client.close(session.id);
    if (await connector.inspect(entry.resource)) throw new Error('network_resource_remains');
    if (!Buffer.from(await client.downloadArtifact(artifact.id)).equals(bytes)) throw new Error('network_artifact_not_retained');
    entry.cleanup = 'confirmed'; entry.verified = true; await save();
  }
  await client.deleteConnection(sandbox.id);
  evidence.state = 'verified';
} catch (error) { evidence.state = 'failed'; evidence.error = error instanceof Error ? error.message : 'unknown'; process.exitCode = 1; }
finally {
  await worker.stop(); await app.close();
  try {
    const operations = (await pool.query("SELECT id,provider_resource_id FROM resource_operations WHERE tenant_id=$1 AND kind='create'", [tenant])).rows;
    for (const operation of operations) {
      const resources = operation.provider_resource_id ? [{ id: operation.provider_resource_id }] : await connector.findByOperation(operation.id);
      for (const resource of resources) { if (await connector.inspect(resource.id)) await connector.destroy(resource.id); if (await connector.inspect(resource.id)) throw new Error('cleanup_unconfirmed'); }
    }
    evidence.cleanup = 'confirmed';
  } catch { evidence.cleanup = 'requires_reconciliation'; process.exitCode = 1; }
  evidence.finished_at = new Date().toISOString(); await save(); await pool.end();
  console.log(JSON.stringify({ file, state: evidence.state, error: evidence.error, cleanup: evidence.cleanup }));
}
