import { randomUUID } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { E2BConnector } from '../integrations/sandboxes/e2b.js';
import { localTestCredential } from './local-test-credentials.js';
const operation = randomUUID();
const connector = new E2BConnector({ template: 'base' }, await localTestCredential('e2b_api_key', 'sandbox'));
const evidence: Record<string, any> = { operation, state: 'intent' };
const file = `.local/evidence/runtime-linux-${operation}.json`;
const save = () => writeFile(file, JSON.stringify(evidence, null, 2), { mode: 0o600 });
await save();
try {
  const resource = await connector.create({ operation_id: operation, session_id: operation, timeout_seconds: 180, network: { mode: 'unrestricted', allowed_hosts: [] } });
  evidence.resource = resource.id; await save();
  await connector.execute(resource.id, 'mkdir -p /tmp/hexagon-runtime-tests');
  for (const name of ['server.py', 'tool_bridge.py', 'test_server.py', 'test_tools.py']) await connector.write(resource.id, `/tmp/hexagon-runtime-tests/${name}`, await readFile(`runtime/${name}`));
  evidence.tests = await connector.execute(resource.id, "cd /tmp/hexagon-runtime-tests && python3 -m unittest discover -p 'test_*.py'", { timeout_seconds: 60 });
  if (evidence.tests.exit_code !== 0 || evidence.tests.stderr.includes('skipped=')) throw new Error('linux_runtime_suite_failed');
  evidence.state = 'verified';
} catch (error) { evidence.state = 'failed'; evidence.error = error instanceof Error ? error.message : 'unknown'; process.exitCode = 1; }
finally {
  try {
    const ids = evidence.resource ? [evidence.resource] : (await connector.findByOperation(operation)).map(r => r.id);
    for (const id of ids) { if (await connector.inspect(id)) await connector.destroy(id); if (await connector.inspect(id)) throw new Error('resource_remains'); }
    evidence.cleanup = 'confirmed';
  } catch { evidence.cleanup = 'requires_reconciliation'; process.exitCode = 1; }
  await save(); console.log(JSON.stringify({ file, ...evidence }));
}
