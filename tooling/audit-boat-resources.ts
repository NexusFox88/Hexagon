import { readFile, readdir, writeFile } from 'node:fs/promises';
import { BoatConnector } from '../integrations/sandboxes/boat.js';
import { localTestCredential } from './local-test-credentials.js';
import { openDatabase } from '../modules/storage/database.js';

// Read-only verification of exact test-owned resources; never inventories or deletes unrelated instances.
const credential = await localTestCredential('boat_api_key', 'sandbox');
const connector = new BoatConnector({}, credential);
const ids = new Set<string>(), creates = new Set<string>(), deletions = new Set<string>();
const evidence: Record<string, any> = { checked_at: new Date().toISOString(), state: 'checking', journals: [], skipped_active: [], resources: [], create_queries: [], purges: [] };
for (const file of await readdir('.local/evidence')) {
  if (!/^(boat|api-smoke)-[a-f0-9-]{36}\.json$/.test(file)) continue;
  const journal = JSON.parse(await readFile(`.local/evidence/${file}`, 'utf8'));
  if (!file.startsWith('boat-') && journal.provider !== 'boat') continue;
  if (!['verified', 'failed'].includes(journal.state)) { evidence.skipped_active.push(file); continue; }
  evidence.journals.push(file);
  for (const id of [journal.id, journal.resource?.id, ...(journal.cleanup_ids ?? [])]) if (typeof id === 'string' && id.startsWith('bx_')) ids.add(id);
  if (journal.operation) creates.add(journal.operation);
  if (journal.deletion_operation) deletions.add(journal.deletion_operation);
  if (journal.schema) {
    if (!/^hexagon_(smoke|sprites)_[a-f0-9]+$/.test(journal.schema)) throw new Error('unexpected_schema');
    const url = new URL('postgres://hexagon@127.0.0.1:55432/hexagon');
    url.searchParams.set('options', `-c search_path=${journal.schema}`);
    const pool = openDatabase(url.toString());
    try {
      const rows = (await pool.query('SELECT id,kind,provider_resource_id,detail FROM resource_operations WHERE tenant_id=$1', [journal.tenant])).rows;
      for (const row of rows) {
        if (row.kind === 'create') creates.add(row.id);
        if (row.provider_resource_id) ids.add(row.provider_resource_id);
        if (row.detail?.provider_operation_id) deletions.add(row.detail.provider_operation_id);
      }
    } finally { await pool.end(); }
  }
}
try {
  for (const id of ids) {
    const resource = await connector.inspect(id);
    evidence.resources.push({ id, absent: resource === null });
    if (resource) throw new Error('owned_resource_remains');
  }
  for (const operation of creates) {
    const matches = await connector.findByOperation(operation);
    evidence.create_queries.push({ operation, matching_ids: matches.map(row => row.id) });
    if (matches.length) throw new Error('owned_creation_remains');
  }
  for (const operation of deletions) {
    if (!/^bdop_[a-f0-9]{32}$/.test(operation)) throw new Error('invalid_deletion_id');
    const response = await fetch(`https://boat.dev/api/v1/deletion-operations/${operation}`, {
      headers: { Authorization: `Bearer ${credential}` }, redirect: 'error', signal: AbortSignal.timeout(30000),
    });
    if (!response.ok) { await response.body?.cancel(); throw new Error(`purge_lookup_http_${response.status}`); }
    const result = await response.json() as any;
    evidence.purges.push({ operation, target: result.operation?.targetId, status: result.operation?.status });
    if (result.ok !== true || result.operation?.status !== 'completed') throw new Error('purge_not_completed');
  }
  evidence.state = 'verified';
} catch (error) { evidence.state = 'failed'; evidence.error = error instanceof Error ? error.message.replaceAll(credential, '[REDACTED]') : 'unknown'; process.exitCode = 1; }
evidence.finished_at = new Date().toISOString();
await writeFile('.local/evidence/boat-resource-audit.json', JSON.stringify(evidence, null, 2), { mode: 0o600 });
console.log(JSON.stringify({ state: evidence.state, journals: evidence.journals.length, resources: evidence.resources.length, creates: evidence.create_queries.length, purges: evidence.purges.length, active_journals_excluded: evidence.skipped_active.length, error: evidence.error }));
