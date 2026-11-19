import { randomUUID } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import { E2BConnector } from '../integrations/sandboxes/e2b.js';
import { localTestCredential } from './local-test-credentials.js';

// Public, credential-free destinations. A baseline distinguishes remote outage
// from enforcement by the restricted sandbox.
const connector = new E2BConnector({}, await localTestCredential('e2b_api_key', 'sandbox'));
const id = randomUUID();
const file = `.local/evidence/network-${id}.json`;
const evidence: Record<string, any> = { started_at: new Date().toISOString(), state: 'intent', cases: [] };
await mkdir('.local/evidence', { recursive: true, mode: 0o700 });
const save = () => writeFile(file, JSON.stringify(evidence, null, 2), { mode: 0o600 });
await save();
try {
  for (const mode of ['unrestricted', 'allowlist'] as const) {
    const operation = randomUUID();
    const entry: Record<string, any> = { operation, mode, allowed_hosts: mode === 'allowlist' ? ['example.com'] : [] };
    evidence.cases.push(entry); await save();
    let resource: string | undefined;
    try {
      resource = (await connector.create({ operation_id: operation, session_id: `network-${id}`, timeout_seconds: 180, network: { mode, allowed_hosts: entry.allowed_hosts } })).id;
      entry.resource = resource; await save();
      entry.probes = {};
      for (const host of ['example.com', 'example.org']) {
        const result = await connector.execute(resource, `curl --noproxy '*' --silent --output /dev/null --write-out '%{http_code}' --connect-timeout 8 --max-time 12 https://${host}/`, { timeout_seconds: 20 });
        entry.probes[host] = { exit_code: result.exit_code, http_status: result.stdout.trim() }; await save();
      }
      const allowed = entry.probes['example.com']; const denied = entry.probes['example.org'];
      if (allowed.exit_code !== 0 || allowed.http_status !== '200') throw new Error('allowed_destination_unreachable');
      if (mode === 'unrestricted' && (denied.exit_code !== 0 || denied.http_status !== '200')) throw new Error('baseline_unreachable');
      if (mode === 'allowlist' && (denied.exit_code === 0 || denied.http_status !== '000')) throw new Error('denied_destination_reachable');
      entry.verified = true;
    } finally {
      const owned = resource ? [{ id: resource }] : await connector.findByOperation(operation);
      for (const row of owned) {
        await connector.destroy(row.id);
        if (await connector.inspect(row.id)) throw new Error('cleanup_unconfirmed');
      }
      entry.cleanup = 'confirmed'; await save();
    }
  }
  evidence.state = 'verified';
} catch (error) {
  evidence.state = 'failed'; evidence.error = error instanceof Error ? error.message : 'unknown'; process.exitCode = 1;
} finally {
  evidence.finished_at = new Date().toISOString(); await save();
  console.log(JSON.stringify({ evidence_file: file, state: evidence.state, cleanup: evidence.cases.map((entry: any) => entry.cleanup ?? 'requires_reconciliation') }));
}
