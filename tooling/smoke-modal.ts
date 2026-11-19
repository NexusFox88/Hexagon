import { installOpenCode } from '../integrations/harnesses/opencode.js';
import { randomUUID } from 'node:crypto';
import { writeFile } from 'node:fs/promises';
import { ModalConnector, modalConnection, modalConfig } from '../integrations/sandboxes/modal.js';
import { RuntimeClient } from '../modules/sandboxes/runtime-client.js';
import { modalTestCredential } from './modal-test-credential.js';
const operation = randomUUID(), config = modalConfig.parse({ app: 'hexagon', ...(process.env.HEXAGON_MODAL_IMAGE ? { image: process.env.HEXAGON_MODAL_IMAGE } : {}) });
const credential = await modalTestCredential(), connector = new ModalConnector(config, credential);
const file = `.local/evidence/modal-${operation}.json`, evidence: Record<string, any> = { operation, state: 'intent', started_at: new Date().toISOString() };
const save = () => writeFile(file, JSON.stringify(evidence, null, 2), { mode: 0o600 }); await save();
try {
  evidence.validation = await modalConnection.validate(config, credential);
  const resource = await connector.create({ operation_id: operation, session_id: operation, timeout_seconds: 300, network: { mode: 'unrestricted', allowed_hosts: [] } });
  evidence.resource = resource; await save();
  if ((await connector.findByOperation(operation))[0]?.id !== resource.id) throw new Error('operation_lookup_mismatch');
  await connector.write(resource.id, '/tmp/probe.txt', Buffer.from('modal-file-roundtrip'));
  if (Buffer.from(await connector.read(resource.id, '/tmp/probe.txt')).toString() !== 'modal-file-roundtrip') throw new Error('file_roundtrip');
  const command = await connector.execute(resource.id, 'python3 --version && node --version'); if (command.exit_code !== 0) throw new Error('runtime_prerequisites_missing');
  evidence.commands = command;
  const runtime = new RuntimeClient(connector, resource.id, randomUUID()); await runtime.bootstrap();
  evidence.runtime = await runtime.request('GET', '/health');
  const privateTarget = await connector.preview(resource.id, 8765);
  evidence.anonymous_status = (await fetch(`${privateTarget.url}/health`, { signal: AbortSignal.timeout(20000) })).status;
  if (evidence.anonymous_status < 400) throw new Error('runtime_public');
  await connector.execute(resource.id, 'python3 -m http.server 3000 --bind 0.0.0.0 --directory /tmp', { background: true, timeout_seconds: 120 });
  const preview = await connector.preview(resource.id, 3000);
  const response = await fetch(`${preview.url}/probe.txt`, { headers: preview.headers, signal: AbortSignal.timeout(20000) });
  if (!response.ok || await response.text() !== 'modal-file-roundtrip') throw new Error('preview_failed');
  evidence.preview_verified = true;
  if (process.env.HEXAGON_PROBE_HARNESS === '1') { await installOpenCode(connector, resource.id); evidence.harness_version_verified = true; }
  evidence.state = 'verified';
} catch(error) { evidence.state = 'failed'; evidence.error = error instanceof Error ? error.message : 'unknown'; process.exitCode = 1; }
finally {
  try { const rows = evidence.resource ? [evidence.resource] : await connector.findByOperation(operation); for (const row of rows) { await connector.destroy(row.id); if (await connector.inspect(row.id)) throw new Error('cleanup_unconfirmed'); } evidence.cleanup = 'confirmed'; }
  catch { evidence.cleanup = 'requires_reconciliation'; process.exitCode = 1; }
  evidence.finished_at = new Date().toISOString(); await save(); console.log(JSON.stringify({ file, state: evidence.state, error: evidence.error, cleanup: evidence.cleanup }));
}
