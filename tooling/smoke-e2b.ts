import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { homedir } from 'node:os';
import { randomUUID, randomBytes } from 'node:crypto';
import { E2BConnector, e2bConnection } from '../integrations/sandboxes/e2b.js';
import { RuntimeClient } from '../modules/sandboxes/runtime-client.js';
import { installOpenCode, openCodeRequest, decodeOpenCode } from '../integrations/harnesses/opencode.js';
import { localTestCredential } from './local-test-credentials.js';
import { Template } from 'e2b';

const text = await readFile(`${homedir()}/Desktop/sandbox_credential.txt`, 'utf8');
const raw = text.match(/^\s*(?:export\s+)?e2b_api_key\s*=\s*(.+)$/mi)?.[1]?.trim();
const credential = raw?.replace(/^(['"])(.*)\1$/, '$2');
if (!credential) throw new Error('E2B credential not found');
let connector = new E2BConnector({}, credential);
const operation = randomUUID();
await mkdir('.local/evidence', { recursive: true, mode: 0o700 });
const file = `.local/evidence/e2b-${operation}.json`;
const evidence: Record<string, unknown> = { operation, started_at: new Date().toISOString(), state: 'intent' };
const save = () => writeFile(file, JSON.stringify(evidence, null, 2), { mode: 0o600 });
await save();
let resource: string | undefined;
let template: string | undefined;
try {
  evidence.validation = await e2bConnection.validate({}, credential);
  await save();
  if (process.env.HEXAGON_MODEL_SMOKE === '1') {
    template = `hexagon-test-${operation}`;
    evidence.template = template;
    evidence.stage = 'build_2g_template'; await save();
    await Template.build(Template().fromTemplate('base'), template, { apiKey: credential, memoryMB: 2048, cpuCount: 2 });
    connector = new E2BConnector({ template }, credential);
  }
  const created = await connector.create({ operation_id: operation, session_id: `smoke-${operation}`, timeout_seconds: process.env.HEXAGON_MODEL_SMOKE ? 600 : 180, network: { mode: 'unrestricted', allowed_hosts: [] } });
  resource = created.id;
  evidence.resource = created;
  evidence.state = 'created';
  await save();
  const command = await connector.execute(resource, 'printf hexagon-cloud-ok');
  if (command.exit_code !== 0 || command.stdout !== 'hexagon-cloud-ok') throw new Error('command mismatch');
  evidence.command = command;
  const bytes = new TextEncoder().encode('Hexagon cloud file roundtrip\n');
  await connector.write(resource, '/tmp/hexagon-smoke.txt', bytes);
  const returned = await connector.read(resource, '/tmp/hexagon-smoke.txt');
  if (!Buffer.from(bytes).equals(Buffer.from(returned))) throw new Error('file mismatch');
  evidence.file_roundtrip = true;
  evidence.reconciled = (await connector.findByOperation(operation)).some(row => row.id === resource);
  const runtime = new RuntimeClient(connector, resource, randomBytes(32).toString('hex'));
  evidence.stage = 'runtime_bootstrap';
  await save();
  await runtime.bootstrap();
  evidence.stage = 'runtime_execution';
  const run = randomUUID();
  const request = { id: run, command: ['python3', '-c', "from pathlib import Path; Path('runtime-output.txt').write_text('real sandbox child'); print('runtime-child-ok')"] };
  const first = await runtime.request('POST', '/runs', request);
  const retry = await runtime.request('POST', '/runs', request);
  if (first.pid !== retry.pid) throw new Error('runtime duplicated process');
  let result;
  for (let attempt = 0; attempt < 20; attempt++) {
    result = await runtime.request('GET', `/runs/${run}`);
    if (result.state === 'exited') break;
    await new Promise(resolve => setTimeout(resolve, 250));
  }
  if (result?.exit_code !== 0) throw new Error('runtime child failed');
  const events = await runtime.request('GET', `/runs/${run}/events`);
  if (!events.events.some((e: any) => e.type === 'harness.stdout' && e.data.text.includes('runtime-child-ok'))) throw new Error('runtime output missing');
  const output = await connector.read(resource, '/tmp/hexagon-runtime/workspace/runtime-output.txt');
  if (Buffer.from(output).toString() !== 'real sandbox child') throw new Error('runtime workspace mismatch');
  const preview = await connector.preview(resource, 8765);
  const unauthenticated = await fetch(`${preview.url}/health`, { headers: preview.headers, signal: AbortSignal.timeout(15000) });
  if (unauthenticated.status !== 401) throw new Error('runtime authentication not enforced');
  evidence.runtime = { state: result.state, exit_code: result.exit_code, event_count: events.events.length, idempotent: true, unauthenticated_status: unauthenticated.status, workspace_verified: true };
  if (process.env.HEXAGON_MODEL_SMOKE === '1') {
    evidence.stage = 'install_opencode'; await save();
    evidence.memory_initial = (await connector.execute(resource, 'free -m')).stdout;
    await save();
    await installOpenCode(connector, resource);
    evidence.memory_before = (await connector.execute(resource, 'free -m; cat /sys/fs/cgroup/memory.events 2>/dev/null || true')).stdout;
    const model = {
      base_url: await localTestCredential('MINIMAX_ANTHROPIC_BASE_URL', 'shell'),
      model: await localTestCredential('MINIMAX_ANTHROPIC_MODEL', 'shell'),
      credential: await localTestCredential('MINIMAX_ANTHROPIC_API_KEY', 'shell'),
    };
    await connector.write(resource, '/tmp/hexagon-runtime/workspace/calculate.py', Buffer.from('def add(a, b):\n    raise NotImplementedError()\n'));
    await connector.write(resource, '/tmp/hexagon-runtime/workspace/test_calculate.py', Buffer.from('from calculate import add\nassert add(2, 3) == 5\nassert add(-4, 1) == -3\nprint("2 assertions passed")\n'));
    const agentRun = randomUUID();
    evidence.stage = 'model_execution'; await save();
    await runtime.request('POST', '/runs', openCodeRequest(agentRun, 'Implement add in calculate.py and run python3 test_calculate.py without changing tests. Briefly explain changes and test results in English.', model));
    let state;
    let cursor = 0;
    const decoded: NonNullable<ReturnType<typeof decodeOpenCode>>[] = [];
    const diagnostics: string[] = [];
    const consume = (batch: any) => {
      cursor = batch.cursor;
      for (const event of batch.events) {
        if (event.type === 'harness.stdout' || event.type === 'harness.stderr') diagnostics.push(event.data.text.replaceAll(model.credential, '[REDACTED]').slice(0, 4000));
        if (event.type === 'harness.stdout') for (const line of event.data.text.split('\n')) { const item = decodeOpenCode(line); if (item) decoded.push(item); }
      }
    };
    const deadline = Date.now() + 240000;
    while (Date.now() < deadline) {
      const batch = await runtime.request('GET', `/runs/${agentRun}/events?after=${cursor}`);
      consume(batch);
      state = await runtime.request('GET', `/runs/${agentRun}`);
      if (['exited', 'failed', 'interrupted'].includes(state.state)) {
        while (true) { const final = await runtime.request('GET', `/runs/${agentRun}/events?after=${cursor}`); consume(final); if (!final.events.length) break; }
        break;
      }
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    const answer = decoded.filter(event => event.type === 'text').map(event => event.text).join('\n');
    evidence.model = { harness: 'opencode@1.2.27', model: model.model, state: state?.state, exit_code: state?.exit_code, event_types: decoded.map(e => e.type), answer, native_session: decoded.find(e => e.session_id)?.session_id };
    if (!answer) {
      evidence.memory_after = (await connector.execute(resource, 'free -m; cat /sys/fs/cgroup/memory.events 2>/dev/null || true')).stdout;
      evidence.harness_diagnostics = diagnostics;
      const logRead = await connector.execute(resource, "python3 -c \"from pathlib import Path; p=Path.home()/'.local/share/opencode/log'; files=sorted(p.glob('*.log'),key=lambda x:x.stat().st_mtime); print(files[-1].read_text()[-16000:] if files else 'no opencode log')\"", { timeout_seconds: 15 });
      evidence.harness_log = logRead.stdout.replaceAll(model.credential, '[REDACTED]');
    }
    await save();
    if (state?.exit_code !== 0 || !answer || decoded.some(event => event.type === 'error')) throw new Error('model_harness_failed');
    const fixedTest = Buffer.from(await connector.read(resource, '/tmp/hexagon-runtime/workspace/test_calculate.py')).toString();
    if (fixedTest !== 'from calculate import add\nassert add(2, 3) == 5\nassert add(-4, 1) == -3\nprint("2 assertions passed")\n') throw new Error('agent_modified_fixed_test');
    evidence.model_changes = Buffer.from(await connector.read(resource, '/tmp/hexagon-runtime/workspace/calculate.py')).toString();
    const verified = await connector.execute(resource, 'cd /tmp/hexagon-runtime/workspace && python3 test_calculate.py');
    evidence.model_test = verified;
    if (verified.exit_code !== 0) throw new Error('model_changes_failed_tests');
  }
  evidence.stage = 'complete';
  evidence.state = 'verified';
  await save();
} catch (error) {
  evidence.state = 'failed';
  evidence.error_type = error instanceof Error ? error.name : 'unknown';
  evidence.error_code = (error as { cause?: { code?: string } }).cause?.code;
  evidence.error_location = error instanceof Error ? error.stack?.split('\n').slice(1, 4) : [];
  process.exitCode = 1;
} finally {
  // Reconcile an uncertain creation before deciding whether there is anything to clean up.
  try {
    const owned = resource ? [{ id: resource }] : await connector.findByOperation(operation);
    for (const row of owned) {
      await connector.destroy(row.id);
      if (await connector.inspect(row.id)) throw new Error('Resource remains after delete');
    }
    evidence.cleanup = 'confirmed';
  } catch (error) {
    evidence.cleanup = 'requires_reconciliation';
    evidence.cleanup_error_type = error instanceof Error ? error.name : 'unknown';
    process.exitCode = 1;
  }
  if (template) {
    try {
      if (await Template.exists(template, { apiKey: credential })) await Template.delete(template, { apiKey: credential });
      if (await Template.exists(template, { apiKey: credential })) throw new Error('template remains');
      evidence.template_cleanup = 'confirmed';
    } catch { evidence.template_cleanup = 'requires_reconciliation'; process.exitCode = 1; }
  }
  evidence.finished_at = new Date().toISOString();
  await save();
  console.log(JSON.stringify({ evidence_file: file, state: evidence.state, cleanup: evidence.cleanup, error_type: evidence.error_type, cleanup_error_type: evidence.cleanup_error_type }));
}
