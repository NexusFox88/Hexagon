import { readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { openDatabase } from '../modules/storage/database.js';

const defaults = [
  'api-smoke-843b93cb-4e9f-406b-b4a3-eef8ba8bd5b6',
  'api-smoke-8364f454-0251-4da4-a36d-80f7574c8b0f',
  'api-smoke-57b3ff48-0087-4efd-aa72-db24b202c584',
  'api-smoke-79e630ed-c2c6-455b-8942-cd5a5d7470ff',
  'api-smoke-ec4e9e16-514e-4aec-8426-67578d070196',
];
const journals = process.argv.length > 2 ? process.argv.slice(2) : defaults;
const evidence: Record<string, any> = { state: 'checking', checked_at: new Date().toISOString(), journeys: [] };
try {
  for (const name of journals) {
    if (!/^api-smoke-[a-f0-9-]{36}$/.test(name)) throw new Error('invalid_journal_name');
    const journal = JSON.parse(await readFile(`.local/evidence/${name}.json`, 'utf8'));
    if (journal.state !== 'verified' || !/^hexagon_smoke_[a-f0-9]+$/.test(journal.schema)) throw new Error('unverified_journal');
    const url = new URL(process.env.DATABASE_URL ?? 'postgres://hexagon@127.0.0.1:55432/hexagon');
    url.searchParams.set('options', `-c search_path=${journal.schema}`);
    const pool = openDatabase(url.toString());
    try {
      const ids = [journal.run, journal.python?.run?.id];
      if (ids.some(id => typeof id !== 'string' || !id) || new Set(ids).size !== 2) throw new Error('both_independent_sdk_runs_required');
      const records = [];
      for (const id of ids) {
        const run = (await pool.query('SELECT r.state,r.output,s.state AS session_state FROM runs r JOIN sessions s ON s.tenant_id=r.tenant_id AND s.id=r.session_id WHERE r.tenant_id=$1 AND r.id=$2', [journal.tenant, id])).rows[0];
        if (run?.state !== 'completed' || run.session_state !== 'closed' || !run.output?.text) throw new Error('retained_run_incomplete');
        const artifacts = (await pool.query('SELECT name,content,sha256,size FROM artifacts WHERE tenant_id=$1 AND run_id=$2', [journal.tenant, id])).rows;
        if (!artifacts.some(a => a.name === 'filter.mjs') || !artifacts.some(a => a.name === 'test-report.txt')) throw new Error('required_artifact_missing');
        for (const a of artifacts) if (Number(a.size) !== a.content.length || createHash('sha256').update(a.content).digest('hex') !== a.sha256) throw new Error('retained_artifact_corrupt');
        const report = artifacts.find(a => a.name === 'test-report.txt').content.toString();
        if (!report.includes('8 assertions passed')) throw new Error('retained_test_report_failed');
        const events = (await pool.query('SELECT type FROM events WHERE tenant_id=$1 AND run_id=$2 ORDER BY sequence', [journal.tenant, id])).rows;
        if (events.filter(e => e.type === 'run.completed').length !== 1) throw new Error('terminal_event_mismatch');
        records.push({ run: id, state: run.state, session: run.session_state, artifacts: artifacts.map(a => ({ name: a.name, sha256: a.sha256 })), events: events.length });
      }
      const unresolved = (await pool.query("SELECT count(*)::int AS count FROM resource_operations WHERE tenant_id=$1 AND state<>'completed'", [journal.tenant])).rows[0].count;
      if (unresolved) throw new Error('unresolved_resource_operation');
      evidence.journeys.push({ journal: name, records, unresolved_operations: unresolved });
    } finally { await pool.end(); }
  }
  evidence.state = 'verified';
} catch (error) { evidence.state = 'failed'; evidence.error = error instanceof Error ? error.message : 'unknown'; process.exitCode = 1; }
await writeFile('.local/evidence/retained-journey-audit.json', JSON.stringify(evidence, null, 2), { mode: 0o600 });
console.log(JSON.stringify({ state: evidence.state, journeys: evidence.journeys.length, runs: evidence.journeys.reduce((n: number, row: any) => n + row.records.length, 0), error: evidence.error }));
