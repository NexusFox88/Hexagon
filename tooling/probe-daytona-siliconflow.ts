import { randomUUID } from 'node:crypto';
import { writeFile, mkdir } from 'node:fs/promises';
import { DaytonaConnector } from '../integrations/sandboxes/daytona.js';
import { localTestCredential } from './local-test-credentials.js';

const operation = randomUUID();
const connector = new DaytonaConnector({ api_url: await localTestCredential('daytona_endpoint', 'sandbox') }, await localTestCredential('daytona_api_key', 'sandbox'));
const file = `.local/evidence/daytona-siliconflow-${operation}.json`;
const evidence: Record<string, any> = { operation, started_at: new Date().toISOString(), endpoint: 'https://api.siliconflow.com/v1/models', state: 'intent' };
await mkdir('.local/evidence', { recursive: true, mode: 0o700 });
const save = () => writeFile(file, JSON.stringify(evidence, null, 2), { mode: 0o600 });
await save();
try {
  const resource = await connector.create({ operation_id: operation, session_id: `probe-${operation}`, timeout_seconds: 180, network: { mode: 'unrestricted', allowed_hosts: [] } });
  evidence.resource = resource.id; await save();
  evidence.connectivity = {};
  for (const [name, url] of [['baseline', 'https://registry.npmjs.org/'], ['siliconflow', evidence.endpoint]]) {
    const response = await connector.execute(resource.id, `curl --silent --show-error --output /dev/null --write-out '%{http_code}' --connect-timeout 8 --max-time 12 '${url}'`, { timeout_seconds: 20 });
    evidence.connectivity[name] = { exit_code: response.exit_code, http_status: response.stdout.trim(), tls_reset: response.stderr.includes('SSL_ERROR_SYSCALL') || response.stderr.includes('SSL_connect') };
    await save();
  }
  if (evidence.connectivity.siliconflow.exit_code !== 0) {
    evidence.state = 'transport_blocked'; evidence.authentication = 'not_reached';
  } else {
    await connector.write(resource.id, '/tmp/siliconflow-probe-key', Buffer.from(await localTestCredential('siliconflow_api_key_polygala', 'shell')));
    const source = `import json, urllib.request, urllib.error\nfrom pathlib import Path\np=Path('/tmp/siliconflow-probe-key')\nkey=p.read_text(); p.unlink()\nrequest=urllib.request.Request('https://api.siliconflow.com/v1/models',headers={'Authorization':'Bearer '+key})\ntry:\n with urllib.request.urlopen(request,timeout=25) as response:\n  body=json.load(response); print(json.dumps({'status':response.status,'model_list':isinstance(body.get('data'),list)}))\nexcept urllib.error.HTTPError as error: print(json.dumps({'status':error.code,'model_list':False}))\nexcept Exception: print(json.dumps({'status':0,'transport_failed':True}))\n`;
    await connector.write(resource.id, '/tmp/siliconflow-probe.py', Buffer.from(source));
    const response = await connector.execute(resource.id, 'chmod 600 /tmp/siliconflow-probe-key && python3 /tmp/siliconflow-probe.py', { timeout_seconds: 35 });
    evidence.authentication = JSON.parse(response.stdout.trim());
    evidence.state = evidence.authentication.status === 200 ? 'authenticated' : 'authentication_not_verified';
  }
} catch { evidence.state = 'probe_failed'; process.exitCode = 1; }
finally {
  try {
    const resources = evidence.resource ? [{ id: evidence.resource }] : await connector.findByOperation(operation);
    for (const resource of resources) { await connector.destroy(resource.id); if (await connector.inspect(resource.id)) throw new Error('resource_remains'); }
    evidence.cleanup = 'confirmed';
  } catch { evidence.cleanup = 'requires_reconciliation'; process.exitCode = 1; }
  evidence.finished_at = new Date().toISOString(); await save();
  console.log(JSON.stringify({ file, ...evidence }));
}
