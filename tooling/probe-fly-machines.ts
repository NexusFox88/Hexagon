import { randomUUID } from 'node:crypto';
import { writeFile, mkdtemp, rm } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { localTestCredential } from './local-test-credentials.js';
import { openFlyMachinesTunnel } from '../integrations/sandboxes/fly-machines-transport.js';
import { acquireFlyProxy, closeFlyProxies } from '../integrations/sandboxes/fly-machines-proxy.js';

const key = await localTestCredential('fly_token', 'sandbox');
const operation = randomUUID(), app = `hexagon-probe-${operation.slice(0, 18)}`;
const file = `.local/evidence/fly-machines-${operation}.json`;
const evidence: Record<string, any> = { operation, app, state: 'intent', started_at: new Date().toISOString() };
const save = () => writeFile(file, JSON.stringify(evidence, null, 2), { mode: 0o600 });
class FlyError extends Error { constructor(readonly status: number) { super(`fly_http_${status}`); } }
async function request(path: string, method = 'GET', body?: unknown) {
  const response = await fetch(`https://api.machines.dev/v1${path}`, { method, redirect: 'error',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }), signal: AbortSignal.timeout(90000) });
  if (!response.ok) { await response.body?.cancel(); throw new FlyError(response.status); }
  const text = await response.text(); return text ? JSON.parse(text) : undefined;
}
await save();
try {
  await request('/apps', 'POST', { app_name: app, org_slug: 'personal', network: app });
  evidence.app_created = true; await save();
  const machine = await request(`/apps/${app}/machines`, 'POST', { name: `hexagon-${operation}`, region: 'iad',
    config: { image: 'node:24-bookworm', init: { exec: ['sleep', '300'] }, auto_destroy: true,
      guest: { cpu_kind: 'shared', cpus: 2, memory_mb: 2048 }, restart: { policy: 'no' }, services: [], metadata: { hexagon_operation: operation } } });
  evidence.machine = machine.id; evidence.stage = 'created'; await save();
  await request(`/apps/${app}/machines/${machine.id}/wait?state=started&timeout=60`);
  const result = await request(`/apps/${app}/machines/${machine.id}/exec`, 'POST', { command: ['bash', '-lc', 'node --version && python3 --version'], timeout: 20 });
  evidence.command = result;
  if ((result.exit_code ?? 0) !== 0 || result.exit_signal || !/v24\./.test(result.stdout) || !/Python 3/.test(result.stdout)) throw new Error('prerequisites_failed');
  const bytes = Buffer.alloc(256 * 1024); for (let i = 0; i < bytes.length; i++) bytes[i] = i % 256;
  const write = await request(`/apps/${app}/machines/${machine.id}/exec`, 'POST', { command: ['python3', '-c', "import sys,base64;open('/tmp/hexagon-probe.bin','wb').write(base64.b64decode(sys.stdin.read()))"], stdin: bytes.toString('base64'), timeout: 20 });
  if ((write.exit_code ?? 0) !== 0 || write.exit_signal) throw new Error('write_failed');
  const read = await request(`/apps/${app}/machines/${machine.id}/exec`, 'POST', { command: ['base64', '/tmp/hexagon-probe.bin'], timeout: 20 });
  if ((read.exit_code ?? 0) !== 0 || read.exit_signal || !Buffer.from(read.stdout ?? '', 'base64').equals(bytes)) throw new Error('binary_roundtrip_failed');
  evidence.binary_roundtrip = true; evidence.state = 'verified';
  if (process.env.HEXAGON_FLY_TRANSPORT === '1') {
    evidence.state = 'testing_transport'; await save();
    const directory = await mkdtemp(join(tmpdir(), 'hexagon-fly-'));
    try {
      await writeFile(join(directory, 'config.yml'), '{}\n', { mode: 0o600 });
      const output = await new Promise<Buffer>((resolve, reject) => {
        const child = spawn('/opt/homebrew/bin/fly', ['ssh', 'console', '--app', app, '--machine', machine.id,
          '--quiet', '--command', 'python3 -c "import sys;sys.stdout.buffer.write(sys.stdin.buffer.read())"'],
          { env: { ...process.env, FLY_CONFIG_DIR: directory, FLY_API_TOKEN: key, FLY_AGENT_ISOLATED: '1', FLY_WIREGUARD_TOKEN_MODE: '1' }, stdio: 'pipe' });
        const chunks: Buffer[] = []; let stderr = '';
        const timer = setTimeout(() => { child.kill('SIGKILL'); reject(new Error('fly_ssh_timeout')); }, 60000);
        child.stdout.on('data', chunk => chunks.push(chunk));
        child.stderr.on('data', chunk => { stderr = (stderr + chunk.toString()).slice(-2000); });
        child.stdin.on('error', () => {});
        child.once('error', error => { clearTimeout(timer); reject(error); });
        child.once('close', code => { clearTimeout(timer); if (code === 0) resolve(Buffer.concat(chunks));
          else reject(new Error(`fly_ssh_exit_${code}: ${stderr.replaceAll(key, '[REDACTED]')}`)); });
        child.stdin.end(bytes);
      });
      if (!output.equals(bytes)) throw new Error(`fly_ssh_binary_mismatch_${output.length}`);
      evidence.ssh_binary_roundtrip = true; evidence.state = 'verified';
      const server = `from http.server import BaseHTTPRequestHandler,HTTPServer
class Handler(BaseHTTPRequestHandler):
 def do_GET(self):
  if self.headers.get('Authorization') != 'Bearer probe-runtime':
   self.send_response(401);self.end_headers();return
  data=open('/tmp/hexagon-probe.bin','rb').read()
  self.send_response(200)
  if self.path != '/eof':self.send_header('Content-Length',str(len(data)))
  self.end_headers();self.wfile.write(data)
import socket
HTTPServer.address_family=socket.AF_INET6
HTTPServer(('::',8099),Handler).serve_forever()`;
      const launch = await request(`/apps/${app}/machines/${machine.id}/exec`, 'POST', {
        command: ['python3', '-c', `import subprocess,base64\np=subprocess.Popen(['timeout','120s','python3','-u','-c',base64.b64decode('${Buffer.from(server).toString('base64')}').decode()],stdin=subprocess.DEVNULL,stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL,start_new_session=True)\nprint(p.pid)`], timeout: 20 });
      if (launch.exit_code || launch.exit_signal || !Number.isInteger(Number(launch.stdout.trim()))) throw new Error('private_http_server_start_failed');
      const target = process.env.HEXAGON_FLY_PROXY === '1' ? await acquireFlyProxy(app, machine.id, key, 8099) : await openFlyMachinesTunnel(app, machine.id, key, 8099);
      try {
        for (const path of ['/length', '/eof']) {
          const response = await fetch(target.url + path, { headers: { Authorization: 'Bearer probe-runtime' }, signal: AbortSignal.timeout(45000) });
          if (!response.ok || !Buffer.from(await response.arrayBuffer()).equals(bytes)) throw new Error('private_http_binary_failed');
        }
        const denied = await fetch(target.url, { signal: AbortSignal.timeout(45000) });
        if (denied.status !== 401) throw new Error('private_http_auth_failed');
        await denied.arrayBuffer(); evidence.private_http = { binary_bytes: bytes.length, content_length: true, eof: true, anonymous_status: 401 };
      } finally { target.release?.(); await closeFlyProxies(app); }
    } finally { await rm(directory, { recursive: true, force: true }); }
  }
} catch (error) {
  evidence.state = 'failed'; evidence.error = error instanceof Error ? error.message.replaceAll(key, '[REDACTED]').slice(0, 500) : 'unknown';
} finally {
  try {
    // The unique app is exclusively owned by this probe; no existing app is touched.
    try { await request(`/apps/${app}?force=true`, 'DELETE'); }
    catch (error) { if (!(error instanceof FlyError && error.status === 404)) throw error; }
    let absent = false;
    for (let i = 0; i < 60; i++) {
      try { await request(`/apps/${app}`); }
      catch (error) { if (error instanceof FlyError && error.status === 404) { absent = true; break; } throw error; }
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    if (!absent) throw new Error('app_cleanup_unconfirmed');
    evidence.cleanup = 'confirmed';
  } catch { evidence.cleanup = 'unknown'; }
  evidence.finished_at = new Date().toISOString(); await save();
}
console.log(JSON.stringify({ file, state: evidence.state, error: evidence.error, cleanup: evidence.cleanup }));
if (evidence.state !== 'verified' || evidence.cleanup !== 'confirmed') process.exitCode = 1;
