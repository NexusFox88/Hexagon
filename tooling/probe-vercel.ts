import { Sandbox } from '@vercel/sandbox';
import { randomUUID } from 'node:crypto';
import { writeFile } from 'node:fs/promises';
import { localTestCredential } from './local-test-credentials.js';
import { openVercelTunnel } from '../integrations/sandboxes/vercel-transport.js';

const token = await localTestCredential('VERCEL_API_KEY', 'sandbox');
const options = { token, projectId: 'prj_bgSVMWuV2wZ6BnrSXrbr8UlL3qB7', teamId: 'team_4dWacL8XOriOF6EAIAGZ2X22' };
const name = `hexagon-${randomUUID()}`, file = `.local/evidence/vercel-${name}.json`;
const evidence: Record<string, any> = { name, project_id: options.projectId, state: 'intent', started_at: new Date().toISOString() };
const save = () => writeFile(file, JSON.stringify(evidence, null, 2), { mode: 0o600 });
await save();
try {
  const box = await Sandbox.create({ ...options, name, persistent: false, timeout: 180000, resources: { vcpus: 2 }, tags: { hexagon: name }, signal: AbortSignal.timeout(90000) });
  evidence.created = true; await save();
  const result = await box.runCommand('bash', ['-lc', 'node --version && python3 --version'], { timeoutMs: 15000 });
  evidence.command = { exit_code: result.exitCode, stdout: await result.stdout() };
  if (result.exitCode !== 0) throw new Error('prerequisites_failed');
  const bytes = Buffer.alloc(256 * 1024); for (let i = 0; i < bytes.length; i++) bytes[i] = i % 256;
  await box.writeFiles([{ path: '/tmp/hexagon-probe.bin', content: bytes }]);
  const received = await box.readFileToBuffer({ path: '/tmp/hexagon-probe.bin' });
  if (!received?.equals(bytes)) throw new Error('binary_roundtrip_failed');
  evidence.binary_roundtrip = true;
  const matches = await (await Sandbox.list({ ...options, namePrefix: name, sortBy: 'name', signal: AbortSignal.timeout(15000) })).toArray();
  if (matches.filter(row => row.name === name).length !== 1) throw new Error('name_reconciliation_failed');
  if (process.env.HEXAGON_VERCEL_TRANSPORT === '1') {
    if (box.routes.length) throw new Error('unexpected_public_route');
    evidence.stage = 'private_transport'; await save();
    const server = `from http.server import BaseHTTPRequestHandler,ThreadingHTTPServer
class Handler(BaseHTTPRequestHandler):
 def do_GET(self):
  authorized=self.headers.get('Authorization')=='Bearer probe-only'
  body=bytes(range(256))*1024 if authorized else b'denied'
  self.send_response(200 if authorized else 401)
  if self.path != '/eof': self.send_header('Content-Length',str(len(body)))
  self.end_headers();self.wfile.write(body)
ThreadingHTTPServer(('127.0.0.1',8765),Handler).serve_forever()
`;
    await box.runCommand({ cmd: 'timeout', args: ['120s', 'python3', '-u', '-c', server], detached: true });
    const ready = await box.runCommand('python3', ['-c', `import socket,time
for i in range(50):
 try:
  s=socket.create_connection(('127.0.0.1',8765),.2);s.close();break
 except OSError: time.sleep(.1)
else: raise RuntimeError('not_ready')`]);
    if (ready.exitCode !== 0) throw new Error('probe_server_not_ready');
    const target = await openVercelTunnel(box, 8765);
    try {
      for (const path of ['/', '/eof']) {
        const response = await fetch(target.url + path, { headers: { Authorization: 'Bearer probe-only' }, signal: AbortSignal.timeout(20000) });
        if (response.status !== 200 || !Buffer.from(await response.arrayBuffer()).equals(bytes)) throw new Error('private_binary_response_mismatch');
      }
      const denied = await fetch(target.url, { signal: AbortSignal.timeout(20000) });
      if (denied.status !== 401 || await denied.text() !== 'denied') throw new Error('private_auth_failure');
      evidence.private_transport = { binary_bytes: bytes.length, content_length: true, close_delimited: true, authentication: true, public_routes: 0 };
    } finally { target.release?.(); }
  }
  evidence.state = 'verified';
} catch (error) {
  evidence.state = 'failed'; evidence.error = error instanceof Error ? error.message.replaceAll(token, '[REDACTED]').slice(0, 1200) : 'unknown';
} finally {
  try {
    const rows = await (await Sandbox.list({ ...options, namePrefix: name, sortBy: 'name', signal: AbortSignal.timeout(15000) })).toArray();
    for (const row of rows.filter(row => row.name === name)) {
      const box = await Sandbox.get({ ...options, name, signal: AbortSignal.timeout(15000) });
      await box.delete({ deleteOrphanSnapshots: true, signal: AbortSignal.timeout(30000) });
    }
    const rowsAfter = await (await Sandbox.list({ ...options, namePrefix: name, sortBy: 'name', signal: AbortSignal.timeout(15000) })).toArray();
    evidence.cleanup = rowsAfter.some(row => row.name === name) ? 'unconfirmed' : 'confirmed';
  } catch { evidence.cleanup = 'requires_reconciliation'; }
  evidence.finished_at = new Date().toISOString(); await save();
  console.log(JSON.stringify({ file, state: evidence.state, cleanup: evidence.cleanup, error: evidence.error }));
  if (evidence.state !== 'verified' || evidence.cleanup !== 'confirmed') process.exitCode = 1;
}
