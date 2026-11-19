import { randomUUID } from 'node:crypto';
import { writeFile } from 'node:fs/promises';
import { UpstashConnector } from '../integrations/sandboxes/upstash.js';
import { localTestCredential } from './local-test-credentials.js';

const credential = await localTestCredential('upstash', 'sandbox');
const connector = new UpstashConnector({}, credential), operation = randomUUID();
const file = `.local/evidence/upstash-expiry-${operation}.json`;
const evidence: Record<string, any> = { operation, state: 'intent', started_at: new Date().toISOString() };
const save = () => writeFile(file, JSON.stringify(evidence, null, 2), { mode: 0o600 });
await save();
try {
  evidence.resource = await connector.create({ operation_id: operation, session_id: randomUUID(), timeout_seconds: 30, network: { mode: 'unrestricted', allowed_hosts: [] } });
  await save();
  if (!await connector.inspect(evidence.resource.id)) throw new Error('resource_missing_before_deadline');
  const expires = Date.parse(evidence.resource.expires_at);
  if (!Number.isFinite(expires) || expires <= Date.now()) throw new Error('invalid_provider_deadline');
  const deadline = expires + 90000;
  // No destroy calls until after recording natural provider absence.
  while (Date.now() < deadline) {
    if (!await connector.inspect(evidence.resource.id)) {
      if (Date.now() < expires - 1000) throw new Error('resource_expired_early');
      evidence.natural_absence_at = new Date().toISOString();
      evidence.expiry_lag_ms = Date.now() - expires;
      break;
    }
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
  if (!evidence.natural_absence_at) throw new Error('provider_expiry_unconfirmed');
  if ((await connector.findByOperation(operation)).length) throw new Error('expired_resource_still_listed');
  evidence.state = 'verified';
} catch (error) { evidence.state = 'failed'; evidence.error = error instanceof Error ? error.message.replaceAll(credential, '[REDACTED]') : 'unknown'; }
finally {
  try {
    for (const resource of await connector.findByOperation(operation)) await connector.destroy(resource.id);
    evidence.cleanup = (await connector.findByOperation(operation)).length ? 'unconfirmed' : 'confirmed';
  } catch { evidence.cleanup = 'requires_reconciliation'; }
  evidence.finished_at = new Date().toISOString(); await save();
  console.log(JSON.stringify({ file, state: evidence.state, cleanup: evidence.cleanup, error: evidence.error, expiry_lag_ms: evidence.expiry_lag_ms }));
  if (evidence.state !== 'verified' || evidence.cleanup !== 'confirmed') process.exitCode = 1;
}
