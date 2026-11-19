import { randomUUID } from 'node:crypto';
import { writeFile } from 'node:fs/promises';
import { BlaxelConnector } from '../integrations/sandboxes/blaxel.js';
import { localTestCredential } from './local-test-credentials.js';
const config = { workspace: await localTestCredential('blaxel_workspace', 'sandbox') };
const credential = await localTestCredential('blaxel_personal_api_secret', 'sandbox');
const connector = () => new BlaxelConnector(config, credential);
const operations = [randomUUID(), randomUUID()];
const file = `.local/evidence/blaxel-concurrent-preview-${randomUUID()}.json`;
const evidence: Record<string, any> = { state: 'intent', operations, started_at: new Date().toISOString(), attempts: [] };
const save = () => writeFile(file, JSON.stringify(evidence, null, 2), { mode: 0o600 });
await save();
try {
  const created = await Promise.allSettled(operations.map(async operation => {
    const c = connector();
    const resource = await c.create({ operation_id: operation, session_id: operation, timeout_seconds: 300, network: { mode: 'unrestricted', allowed_hosts: [] } });
    await c.write(resource.id, '/tmp/preview-marker', Buffer.from(operation));
    await c.execute(resource.id, 'python3 -m http.server 3000 --bind 0.0.0.0 --directory /tmp', { background: true, timeout_seconds: 240 });
    return resource;
  }));
  evidence.provision = created.map(result => result.status === 'fulfilled' ? { resource: result.value } : { error: String(result.reason?.message ?? 'unknown') }); await save();
  if (created.some(result => result.status !== 'fulfilled')) throw new Error('provision_incomplete');
  // Two independently constructed clients per resource exercise distributed caller races.
  for (let round = 0; round < 3; round++) {
    const attempts = await Promise.all(operations.flatMap(operation => [0, 1].map(async caller => {
      const id = `hexagon-${operation}`;
      try {
        const target = await connector().preview(id, 3000);
        const response = await fetch(`${target.url}/preview-marker`, { headers: target.headers, signal: AbortSignal.timeout(20000) });
        const body = await response.text();
        return { operation, caller, round, status: response.status, content_matches: body === operation };
      } catch (error) { return { operation, caller, round, error: error instanceof Error ? error.message : 'unknown', provider_operation: (error as any)?.operation }; }
    })));
    evidence.attempts.push(...attempts); await save();
  }
  if (evidence.attempts.some((row: any) => row.status !== 200 || !row.content_matches)) throw new Error('concurrent_preview_failed');
  evidence.state = 'verified';
} catch (error) { evidence.state = 'failed'; evidence.error = error instanceof Error ? error.message : 'unknown'; process.exitCode = 1; }
finally {
  evidence.cleanup = [];
  for (const operation of operations) {
    const id = `hexagon-${operation}`, c = connector();
    try { await c.cleanupAssociatedResources(id); if (await c.inspect(id)) await c.destroy(id); if (await c.inspect(id)) throw new Error('resource_remains'); evidence.cleanup.push({ id, state: 'confirmed' }); }
    catch (error) { evidence.cleanup.push({ id, state: 'unknown', error: error instanceof Error ? error.message : 'unknown' }); process.exitCode = 1; }
  }
  evidence.finished_at = new Date().toISOString(); await save();
}
console.log(JSON.stringify({ file, state: evidence.state, attempts: evidence.attempts, cleanup: evidence.cleanup }));
