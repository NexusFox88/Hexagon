import { Box, EphemeralBox, type ExecSessionHandle } from '@upstash/box';
import { randomUUID } from 'node:crypto';
import { EventEmitter } from 'node:events';
import { readFile, writeFile } from 'node:fs/promises';
import { PassThrough, Writable } from 'node:stream';
import { openCommandTunnel } from '../integrations/sandboxes/command-tunnel.js';
import { localTestCredential } from './local-test-credentials.js';

// Feasibility probe only: this does not advertise a production Connector.
const apiKey = await localTestCredential('upstash', 'sandbox');
const options = { apiKey, enableTelemetry: false, timeout: 15000 };
const name = `hexagon-${randomUUID()}`;
const file = `.local/evidence/upstash-transport-${name}.json`;
const evidence: Record<string, unknown> = { name, state: 'intent', started_at: new Date().toISOString() };
const save = () => writeFile(file, JSON.stringify(evidence, null, 2), { mode: 0o600 });
await save();
let server: ExecSessionHandle | undefined;
let release: (() => void) | undefined;
try {
  const box = await EphemeralBox.create({ ...options, name, runtime: 'node', size: 'small', ttl: 300, labels: ['hexagon-probe'] });
  evidence.resource = { id: box.id, expires_at: box.expiresAt }; await save();
  const source = `from http.server import BaseHTTPRequestHandler,ThreadingHTTPServer
class Handler(BaseHTTPRequestHandler):
 def do_GET(self):
  authorized=self.headers.get('Authorization')=='Bearer probe-only'
  body=bytes(range(256))*1024 if authorized else b'denied'
  self.send_response(200 if authorized else 401)
  if self.path != '/eof': self.send_header('Content-Length',str(len(body)))
  self.end_headers();self.wfile.write(body)
ThreadingHTTPServer(('127.0.0.1',8765),Handler).serve_forever()
`;
  if (process.env.HEXAGON_UPSTASH_DETACHED === '1') {
    const launch = `import base64,subprocess; print(subprocess.Popen(['python3','-u','-c',base64.b64decode('${Buffer.from(source).toString('base64')}').decode()],stdin=subprocess.DEVNULL,stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL,start_new_session=True).pid)`;
    const result = await box.exec.command(`python3 -c '${launch.replaceAll("'", "'\\''")}'`);
    if (result.exitCode !== 0 || !/^\d+\s*$/.test(result.stdout)) throw new Error('detached_server_start_failed');
    evidence.server_mode = 'detached';
  } else {
    server = await box.exec.session({ argv: ['python3', '-u', '-c', source] });
    evidence.server_mode = 'live_session';
  }
  // The start acknowledgement can precede the Python listen call.
  const ready = await box.exec.command(`python3 -c 'import socket,time
for i in range(50):
 try:
  s=socket.create_connection(("127.0.0.1",8765),.2);s.close();break
 except OSError: time.sleep(.1)
else: raise RuntimeError("server_not_ready")'`);
  if (ready.exitCode !== 0) throw new Error('server_not_ready');
  const relay = await readFile(new URL('../integrations/sandboxes/stdio-tcp-relay.py', import.meta.url), 'utf8');
  const target = await openCommandTunnel(async () => {
    const events = new EventEmitter(); events.on('error', () => {});
    const stdout = new PassThrough(), stderr = new PassThrough();
    const session = await box.exec.session({ argv: ['python3', '-u', '-c', relay, '8765'],
      onStdout: bytes => { stdout.write(bytes); }, onStderr: bytes => { stderr.write(bytes); } });
    const stdin = new Writable({
      write(bytes, _encoding, callback) { try { session.write(bytes); callback(); } catch (error) { callback(error as Error); } },
      final(callback) { try { session.endStdin(); callback(); } catch (error) { callback(error as Error); } },
    });
    void session.wait().then(code => {
      if (code !== 0) events.emit('error', new Error('relay_failed'));
      stdout.end(); stderr.end(); session.close();
    });
    return Object.assign(events, { stdin, stdout, stderr,
      kill: (signal?: string) => session.kill(signal), close: () => session.close() });
  });
  release = target.release;
  for (const path of ['/', '/eof']) {
    const response = await fetch(target.url + path, { headers: { Authorization: 'Bearer probe-only' }, signal: AbortSignal.timeout(20000) });
    const bytes = Buffer.from(await response.arrayBuffer());
    if (response.status !== 200 || bytes.length !== 256 * 1024 || bytes.some((value, index) => value !== index % 256)) throw new Error('binary_response_mismatch');
  }
  const denied = await fetch(target.url, { signal: AbortSignal.timeout(20000) });
  if (denied.status !== 401 || await denied.text() !== 'denied') throw new Error('authorization_not_preserved');
  release?.();
  let closed = false;
  try { await fetch(target.url, { signal: AbortSignal.timeout(2000) }); } catch { closed = true; }
  if (!closed) throw new Error('listener_not_released');
  evidence.checks = { binary_bytes: 256 * 1024, content_length: true, close_delimited: true, authorization: true, release: true };
  evidence.state = 'verified';
} catch (error) {
  evidence.state = 'failed';
  evidence.error = error instanceof Error ? error.message.replaceAll(apiKey, '[REDACTED]') : 'unknown';
} finally {
  release?.(); server?.close();
  try {
    const owned = (await Box.list(options)).filter(row => row.name === name);
    for (const row of owned) await Box.delete({ ...options, boxIds: row.id });
    evidence.cleanup = (await Box.list(options)).some(row => row.name === name) ? 'unconfirmed' : 'confirmed';
  } catch { evidence.cleanup = 'requires_reconciliation'; }
  evidence.finished_at = new Date().toISOString(); await save();
  console.log(JSON.stringify({ file, state: evidence.state, cleanup: evidence.cleanup, error: evidence.error }));
  if (evidence.state !== 'verified' || evidence.cleanup !== 'confirmed') process.exitCode = 1;
}
