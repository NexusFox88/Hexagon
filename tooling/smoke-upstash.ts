import { randomUUID } from 'node:crypto';
import { writeFile } from 'node:fs/promises';
import { UpstashConnector } from '../integrations/sandboxes/upstash.js';
import { RuntimeClient } from '../modules/sandboxes/runtime-client.js';
import { localTestCredential } from './local-test-credentials.js';

const credential = await localTestCredential('upstash', 'sandbox');
const connector = new UpstashConnector({}, credential), operation = randomUUID();
const file = `.local/evidence/upstash-connector-${operation}.json`;
const evidence: Record<string, any> = { operation, state: 'intent', started_at: new Date().toISOString() };
const save = () => writeFile(file, JSON.stringify(evidence, null, 2), { mode: 0o600 });
await save();
try {
  evidence.validation = await connector.validate();
  evidence.resource = await connector.create({ operation_id: operation, session_id: randomUUID(), timeout_seconds: 300, network: { mode: 'unrestricted', allowed_hosts: [] } });
  await save();
  const id = evidence.resource.id;
  const bytes = Buffer.alloc(256 * 1024); for (let i = 0; i < bytes.length; i++) bytes[i] = i % 256;
  await connector.write(id, '/tmp/hexagon-bytes', bytes);
  if (!bytes.equals(Buffer.from(await connector.read(id, '/tmp/hexagon-bytes')))) throw new Error('binary_file_mismatch');
  evidence.binary_roundtrip = true;
  const absent = await connector.execute(id, 'hexagon-command-that-does-not-exist');
  if (absent.exit_code !== 127) throw new Error('nonzero_exit_mismatch');
  const timeout = await connector.execute(id, 'sleep 30', { timeout_seconds: 1 });
  if (timeout.exit_code !== 124) throw new Error('command_timeout_mismatch');
  evidence.command_checks = { nonzero: absent.exit_code, timeout: timeout.exit_code };
  evidence.stage = 'runtime'; await save();
  const runtime = new RuntimeClient(connector, id, randomUUID());
  await runtime.bootstrap(); evidence.runtime = await runtime.request('GET', '/health');
  const target = await connector.preview(id, 8765);
  try {
    const response = await fetch(target.url + '/health', { signal: AbortSignal.timeout(15000) });
    await response.body?.cancel();
    if (response.status !== 401) throw new Error('runtime_auth_missing');
    evidence.anonymous_status = response.status;
  } finally { target.release?.(); }
  const restored = new UpstashConnector({}, credential);
  const matches = await restored.findByOperation(operation);
  if (matches.length !== 1 || matches[0]?.id !== id || !await restored.inspect(id)) throw new Error('reconciliation_mismatch');
  evidence.reconstructed_connector = true;
  evidence.state = 'verified';
} catch (error) { evidence.state = 'failed'; evidence.error = error instanceof Error ? error.message.replaceAll(credential, '[REDACTED]') : 'unknown'; }
finally {
  try {
    for (const resource of await connector.findByOperation(operation)) await connector.destroy(resource.id);
    if ((await connector.findByOperation(operation)).length) throw new Error('cleanup_unconfirmed');
    evidence.cleanup = 'confirmed';
  } catch { evidence.cleanup = 'requires_reconciliation'; }
  evidence.finished_at = new Date().toISOString(); await save();
  console.log(JSON.stringify({ file, state: evidence.state, stage: evidence.stage, error: evidence.error, cleanup: evidence.cleanup }));
  if (evidence.state !== 'verified' || evidence.cleanup !== 'confirmed') process.exitCode = 1;
}
