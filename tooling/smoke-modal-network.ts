import { randomUUID } from 'node:crypto';
import { writeFile } from 'node:fs/promises';
import { ModalConnector } from '../integrations/sandboxes/modal.js';
import { modalTestCredential } from './modal-test-credential.js';
const connector = new ModalConnector({}, await modalTestCredential());
const journal: Record<string, any> = { at: new Date().toISOString(), cases: [], state: 'intent' };
const file = `.local/evidence/modal-network-${randomUUID()}.json`;
const save = () => writeFile(file, JSON.stringify(journal, null, 2), { mode: 0o600 });
try {
  for (const mode of ['unrestricted', 'allowlist'] as const) {
    const operation = randomUUID();
    const row: Record<string, any> = { mode, operation }; journal.cases.push(row); await save();
    try {
      row.resource = await connector.create({ operation_id: operation, session_id: operation, timeout_seconds: 180, network: { mode, allowed_hosts: mode === 'allowlist' ? ['registry.npmjs.org'] : [] } }); await save();
      for (const [label, url] of [['allowed', 'https://registry.npmjs.org/'], ['denied', 'https://example.com/']] as const) {
        row[label] = await connector.execute(row.resource.id, `curl --connect-timeout 10 --max-time 20 -sS -o /dev/null -w '%{http_code}' '${url}'`, { timeout_seconds: 25 });
        await save();
      }
    } finally {
      const resources = row.resource ? [row.resource] : await connector.findByOperation(operation);
      for (const resource of resources) { await connector.destroy(resource.id); if (await connector.inspect(resource.id)) throw Error('cleanup_unconfirmed'); }
      row.cleanup = 'confirmed'; await save();
    }
  }
  const [baseline, policy] = journal.cases;
  if (baseline.allowed.stdout !== '200' || baseline.denied.stdout !== '200' || policy.allowed.stdout !== '200' || (policy.denied.exit_code === 0 && policy.denied.stdout === '200')) throw Error('network_policy_verification_failed');
  journal.state = 'verified';
} catch (error) { journal.state = 'failed'; journal.error = error instanceof Error ? error.message : 'unknown'; process.exitCode = 1; }
finally { await save(); console.log(JSON.stringify({ file, state: journal.state, error: journal.error })); }
