import { Freestyle, FreestyleApiError } from 'freestyle';
import { randomUUID } from 'node:crypto';
import { writeFile } from 'node:fs/promises';
import { localTestCredential } from './local-test-credentials.js';
import { openFreestyleTunnel } from '../integrations/sandboxes/freestyle-transport.js';

const key = await localTestCredential('freestyle_api_key', 'sandbox');
const client = new Freestyle({ apiKey: key, fetch: (input, init) => fetch(input, { ...init, signal: init?.signal ?? AbortSignal.timeout(90000) }) });
const operation = randomUUID(), slug = `hexagon-${operation}`;
const file = `.local/evidence/freestyle-${operation}.json`;
const evidence: Record<string, any> = { slug, operation, state: 'intent', started_at: new Date().toISOString() };
const save = () => writeFile(file, JSON.stringify(evidence, null, 2), { mode: 0o600 });
await save();
try {
  const created = await client.vms.create({ slug, snapshotId: 'freestyle/ubuntu-sm', metadata: { hexagon_operation: operation },
    ttlSeconds: 300, autoDeleteSeconds: 0, idleTimeoutSeconds: -1, automaticRestart: false,
    firewall: { rules: [{ action: 'allow', source: {}, destination: { public: true } }] } });
  evidence.id = created.vmId; evidence.stage = 'created'; await save();
  const result = await created.vm.exec({ command: 'node --version && python3 --version', timeoutMs: 30000 });
  evidence.command = { stdout: result.stdout, stderr: result.stderr, exit_code: result.statusCode };
  if (result.statusCode !== 0) throw new Error('prerequisites_failed');
  const bytes = Buffer.alloc(256 * 1024); for (let i = 0; i < bytes.length; i++) bytes[i] = i % 256;
  await created.vm.fs.writeFile('/tmp/hexagon-probe.bin', bytes);
  if (!Buffer.from(await created.vm.fs.readFile('/tmp/hexagon-probe.bin')).equals(bytes)) throw new Error('binary_roundtrip_failed');
  evidence.binary_roundtrip = true;
  if (process.env.HEXAGON_FREESTYLE_TRANSPORT === '1') {
    const source = `from http.server import BaseHTTPRequestHandler,ThreadingHTTPServer
class H(BaseHTTPRequestHandler):
 def do_GET(self):
  ok=self.headers.get('Authorization')=='Bearer probe-only'
  body=bytes(range(256))*1024 if ok else b'denied'
  self.send_response(200 if ok else 401)
  if self.path!='/eof':self.send_header('Content-Length',str(len(body)))
  self.end_headers();self.wfile.write(body)
ThreadingHTTPServer(('127.0.0.1',8765),H).serve_forever()
`;
    await created.vm.fs.writeTextFile('/tmp/hexagon-http.py', source);
    const started = await created.vm.exec({ command: `python3 -c "import subprocess;print(subprocess.Popen(['timeout','120s','python3','/tmp/hexagon-http.py'],stdin=subprocess.DEVNULL,stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL,start_new_session=True).pid)"`, timeoutMs: 15000 });
    if (started.statusCode !== 0) throw new Error('server_start_failed');
    evidence.stage = 'private_transport'; await save();
    const target = await openFreestyleTunnel(created.vm, 8765);
    try {
      for (const suffix of ['/', '/eof']) {
        const response = await fetch(target.url + suffix, { headers: { Authorization: 'Bearer probe-only' }, signal: AbortSignal.timeout(30000) });
        if (response.status !== 200 || !Buffer.from(await response.arrayBuffer()).equals(bytes)) throw new Error('private_http_failed');
      }
      const denied = await fetch(target.url, { signal: AbortSignal.timeout(30000) });
      if (denied.status !== 401 || await denied.text() !== 'denied') throw new Error('application_auth_failed');
      evidence.private_http = { binary_bytes: bytes.length, content_length: true, eof: true, authentication: true, public_ingress: false };
    } finally { target.release?.(); }
  }
  const rows = (await client.vms.list({ slug })).vms;
  if (rows.length !== 1 || rows[0]?.id !== created.vmId) throw new Error('slug_reconciliation_failed');
  evidence.firewall_rules = created.firewallRules.map(row => row.id);
  evidence.state = 'verified';
} catch (error) {
  evidence.state = 'failed'; evidence.error = error instanceof FreestyleApiError ? `freestyle_${error.status}_${error.code}` : error instanceof Error ? error.message.replaceAll(key, '[REDACTED]').slice(0, 500) : 'unknown';
} finally {
  try {
    const rows = (await client.vms.list({ slug })).vms;
    for (const row of rows.filter(row => row.slug === slug)) await client.vms.delete(row.id);
    if ((await client.vms.list({ slug })).vms.length) throw new Error('cleanup_unconfirmed');
    if (evidence.id) {
      try { await client.vms.get(evidence.id); throw new Error('resource_still_present'); }
      catch (error) { if (!(error instanceof FreestyleApiError && error.status === 404)) throw error; }
    }
    evidence.cleanup = 'confirmed';
  } catch { evidence.cleanup = 'unknown'; }
  evidence.finished_at = new Date().toISOString(); await save();
}
console.log(JSON.stringify({ file, state: evidence.state, error: evidence.error, cleanup: evidence.cleanup }));
if (evidence.state !== 'verified' || evidence.cleanup !== 'confirmed') process.exitCode = 1;
