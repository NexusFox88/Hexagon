import { randomUUID } from 'node:crypto';
import { writeFile } from 'node:fs/promises';
import { localTestCredential } from './local-test-credentials.js';

const key = await localTestCredential('agent37_api_key', 'sandbox');
const operation = randomUUID(), name = `hexagon-probe-${operation}`;
const evidence: Record<string, any> = { operation, name, state: 'intent', started_at: new Date().toISOString() };
const path = `.local/evidence/agent37-${operation}.json`;
const save = () => writeFile(path, JSON.stringify(evidence, null, 2), { mode: 0o600 });
const quote = (value: string) => `'${value.replaceAll("'", "'\\''")}'`;
async function request(route: string, method = 'GET', body?: unknown) {
  const response = await fetch(`https://api.agent37.com/v1${route}`, {
    method, headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }), signal: AbortSignal.timeout(90000),
  });
  if (!response.ok) throw new Error(`agent37_http_${response.status}`);
  return response.json() as Promise<any>;
}
const matches = async () => {
  const result = await request('/instances');
  if (!Array.isArray(result.data)) throw new Error('invalid_instance_list');
  return result.data.filter((row: any) => row.name === name && row.metadata?.hexagon_operation === operation);
};
await save();
try {
  const box = await request('/instances', 'POST', { template: 'agent37-base', name,
    metadata: { hexagon_operation: operation }, resources: { cpu: 2, memory: 4, disk: 4 },
    auto_sleep: false, public_ports: [], budget: { monthly_cap_micros: 0 } });
  if (!/^[a-zA-Z0-9-]+$/.test(box.id)) throw new Error('invalid_instance_id');
  evidence.id = box.id; evidence.stage = 'created'; await save();
  const exec = async (command: string, background = false) => {
    const result = await request(`/instances/${box.id}/exec`, 'POST', { command, background, name: randomUUID() });
    if (result.truncated || (!background && result.exit_code !== 0)) throw new Error('command_failed_or_truncated');
    return result;
  };
  evidence.command = await exec('node --version && python3 --version && timeout --version | head -1');
  const bytes = Buffer.alloc(256 * 1024); for (let i = 0; i < bytes.length; i++) bytes[i] = i % 256;
  await exec(`printf %s ${quote(bytes.toString('base64'))} | base64 -d > /tmp/hexagon-probe.bin`);
  const read = await exec('base64 /tmp/hexagon-probe.bin');
  if (!Buffer.from(read.stdout, 'base64').equals(bytes)) throw new Error('binary_roundtrip_failed');
  evidence.binary_roundtrip = true;
  const source = `from http.server import BaseHTTPRequestHandler,ThreadingHTTPServer
class H(BaseHTTPRequestHandler):
 def do_GET(self):
  if self.headers.get('X-Agent37-Key'):
   self.send_response(500);self.end_headers();return
  ok=self.headers.get('Authorization')=='Bearer probe-only'
  body=bytes(range(256))*1024 if ok else b'denied'
  self.send_response(200 if ok else 401)
  if self.path!='/eof':self.send_header('Content-Length',str(len(body)))
  self.end_headers();self.wfile.write(body)
ThreadingHTTPServer(('0.0.0.0',8765),H).serve_forever()
`;
  await exec(`timeout --kill-after=5s 120s python3 -u -c ${quote(source)}`, true);
  await exec(`python3 -c ${quote("import socket,time\nfor i in range(50):\n try:\n  s=socket.create_connection(('127.0.0.1',8765),.2);s.close();break\n except OSError:time.sleep(.1)\nelse:raise RuntimeError('not_ready')")}`);
  const url = `https://${box.id}-8765.agent37.app`;
  for (const suffix of ['/', '/eof']) {
    const response = await fetch(url + suffix, { headers: { 'X-Agent37-Key': key, Authorization: 'Bearer probe-only' }, signal: AbortSignal.timeout(30000) });
    if (response.status !== 200 || !Buffer.from(await response.arrayBuffer()).equals(bytes)) throw new Error('private_http_failed');
  }
  const anonymous = await fetch(url, { redirect: 'manual', signal: AbortSignal.timeout(15000) });
  await anonymous.body?.cancel();
  if (anonymous.status < 400) throw new Error('anonymous_not_denied');
  const appDenied = await fetch(url, { headers: { 'X-Agent37-Key': key }, signal: AbortSignal.timeout(15000) });
  if (appDenied.status !== 401 || await appDenied.text() !== 'denied') throw new Error('application_auth_failed');
  const rows = await matches();
  if (rows.length !== 1 || rows[0].id !== box.id || rows[0].public_ports?.length) throw new Error('reconciliation_or_privacy_failed');
  evidence.private_http = { bytes: bytes.length, content_length: true, eof: true, provider_auth: true, application_auth: true };
  evidence.state = 'verified';
} catch (error) {
  evidence.state = 'failed'; evidence.error = error instanceof Error ? error.message.replaceAll(key, '[REDACTED]').slice(0, 500) : 'unknown';
} finally {
  try {
    for (const row of await matches()) await request(`/instances/${encodeURIComponent(row.id)}`, 'DELETE');
    if ((await matches()).length) throw new Error('resource_still_present');
    if (evidence.id) {
      const check = await fetch(`https://api.agent37.com/v1/instances/${evidence.id}`, { headers: { Authorization: `Bearer ${key}` }, signal: AbortSignal.timeout(15000) });
      await check.body?.cancel();
      if (check.status !== 404) throw new Error('absence_not_confirmed');
    }
    evidence.cleanup = 'confirmed';
  } catch { evidence.cleanup = 'unknown'; }
  evidence.finished_at = new Date().toISOString(); await save();
}
console.log(JSON.stringify({ path, state: evidence.state, error: evidence.error, cleanup: evidence.cleanup }));
if (evidence.state !== 'verified' || evidence.cleanup !== 'confirmed') process.exitCode = 1;
