import { installOpenCode } from '../integrations/harnesses/opencode.js';
import { randomUUID } from 'node:crypto';
import { writeFile } from 'node:fs/promises';
import { BlaxelConnector, blaxelConnection, blaxelConfig } from '../integrations/sandboxes/blaxel.js';
import { RuntimeClient } from '../modules/sandboxes/runtime-client.js';
import { localTestCredential } from './local-test-credentials.js';
const operation = randomUUID(), config = blaxelConfig.parse({ workspace: await localTestCredential('blaxel_workspace', 'sandbox') });
const credential = await localTestCredential('blaxel_personal_api_secret', 'sandbox'), connector = new BlaxelConnector(config, credential);
const file = `.local/evidence/blaxel-${operation}.json`, evidence: Record<string, any> = { operation, state: 'intent', started_at: new Date().toISOString() };
const save = () => writeFile(file, JSON.stringify(evidence, null, 2), { mode: 0o600 }); await save();
try {
  evidence.validation = await blaxelConnection.validate(config, credential);
  const resource = await connector.create({ operation_id: operation, session_id: operation, timeout_seconds: 300, network: { mode: 'unrestricted', allowed_hosts: [] } });
  evidence.resource = resource; await save();
  if ((await connector.findByOperation(operation))[0]?.id !== resource.id) throw new Error('operation_lookup_mismatch');
  evidence.stage = 'write'; await save();
  await connector.write(resource.id, '/tmp/probe.txt', Buffer.from('blaxel-file-roundtrip'));
  evidence.stage = 'read'; await save();
  if (Buffer.from(await connector.read(resource.id, '/tmp/probe.txt')).toString() !== 'blaxel-file-roundtrip') throw new Error('file_roundtrip');
  evidence.stage = 'execute'; await save();
  const command = await connector.execute(resource.id, 'python3 --version && node --version'); if (command.exit_code !== 0) throw new Error('runtime_prerequisites_missing');
  evidence.commands = command;
  evidence.stage = 'runtime'; await save();
  const runtime = new RuntimeClient(connector, resource.id, randomUUID()); try { await runtime.bootstrap(); } catch(error) {
    evidence.local_runtime = await connector.execute(resource.id, `python3 - <<'PYPROBE'
import os,urllib.request,urllib.error
print('PORT',os.getenv('PORT'),'HOST',os.getenv('HOST'))
for port in [8765,8080]:
 try:
  r=urllib.request.urlopen('http://127.0.0.1:'+str(port)+'/health',timeout=3);print(port,r.status)
 except urllib.error.HTTPError as e:print(port,e.code)
 except Exception as e:print(port,type(e).__name__)
PYPROBE`);
    try { const target = await connector.preview(resource.id, 8765); evidence.preview_host = new URL(target.url).hostname; const r = await fetch(target.url + '/health', {headers:target.headers,signal:AbortSignal.timeout(15000)}); evidence.preview_status = r.status; } catch(e) { evidence.preview_error = e instanceof Error ? e.message : 'unknown'; evidence.preview_failure_metadata = {operation:(e as any)?.operation,retry_after:(e as any)?.retryAfter,code:(e as any)?.providerCode,reason:(e as any)?.providerReason}; }
    throw error;
  }
  evidence.runtime = await runtime.request('GET', '/health');
  const privateTarget = await connector.preview(resource.id, 8765);
  evidence.anonymous_status = (await fetch(`${privateTarget.url}/health`, { signal: AbortSignal.timeout(20000) })).status;
  if (evidence.anonymous_status < 400) throw new Error('runtime_public');
  await connector.execute(resource.id, 'python3 -m http.server 3000 --bind 0.0.0.0 --directory /tmp', { background: true, timeout_seconds: 120 });
  const preview = await connector.preview(resource.id, 3000);
  const response = await fetch(`${preview.url}/probe.txt`, { headers: preview.headers, signal: AbortSignal.timeout(20000) });
  if (!response.ok || await response.text() !== 'blaxel-file-roundtrip') throw new Error('preview_failed');
  evidence.preview_verified = true;
  if (process.env.HEXAGON_PROBE_HARNESS === '1') {
    evidence.os = await connector.execute(resource.id, 'cat /etc/os-release; uname -m');
    await installOpenCode(connector, resource.id);
    evidence.version = await connector.execute(resource.id, '/tmp/hexagon-harnesses/node_modules/opencode-ai/bin/.opencode --version');
  }
  evidence.state = 'verified';
} catch(error) { evidence.state = 'failed'; evidence.failure_metadata = {operation:(error as any)?.operation,reason:(error as any)?.providerReason,retry_after:(error as any)?.retryAfter}; evidence.cause = (error as any)?.cause?.code; evidence.error = error instanceof Error ? error.message : 'unknown';
  if (evidence.resource) try { evidence.bridge_diagnostic = await connector.execute(evidence.resource.id, `python3 - <<'PYBRIDGE'
import glob,json,urllib.request,urllib.error,pathlib
opener=urllib.request.build_opener(urllib.request.ProxyHandler({}))
for path in glob.glob('/tmp/hexagon-blaxel-ports/state-*.json'):
 v=json.load(open(path));print('state',v,'alive',pathlib.Path('/proc/'+str(v['pid'])).exists())
 for host in ['127.0.0.1','[::1]']:
  try:
   r=opener.open('http://'+host+':'+str(v['port'])+'/probe.txt',timeout=3);print(host,r.status)
  except urllib.error.HTTPError as e:print(host,e.code)
  except Exception as e:print(host,type(e).__name__)
PYBRIDGE`); } catch {}
  await save(); process.exitCode = 1; }
finally {
  try { const rows = evidence.resource ? [evidence.resource] : await connector.findByOperation(operation); for (const row of rows) { await connector.destroy(row.id); if (await connector.inspect(row.id)) throw new Error('cleanup_unconfirmed'); } evidence.cleanup = 'confirmed'; }
  catch { evidence.cleanup = 'requires_reconciliation'; process.exitCode = 1; }
  evidence.finished_at = new Date().toISOString(); await save(); console.log(JSON.stringify({ file, state: evidence.state, error: evidence.error, cleanup: evidence.cleanup }));
}
