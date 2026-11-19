import { randomUUID } from 'node:crypto';
import { writeFile } from 'node:fs/promises';
import { localTestCredential } from './local-test-credentials.js';

const key = await localTestCredential('boat_api_key', 'sandbox');
const operation = randomUUID(), name = `hexagon-${operation}`;
const file = `.local/evidence/boat-${operation}.json`;
const evidence: Record<string, any> = { operation, name, state: 'intent', started_at: new Date().toISOString() };
const save = () => writeFile(file, JSON.stringify(evidence, null, 2), { mode: 0o600 });
const pause = () => new Promise(resolve => setTimeout(resolve, 1000));
const quote = (s: string) => `'${s.replaceAll("'", "'\\''")}'`;
async function api(path: string, method = 'GET', body?: unknown, headers: Record<string, string> = {}) {
  const response = await fetch(`https://boat.dev/api/v1${path}`, { method, redirect: 'error',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json', ...headers },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }), signal: AbortSignal.timeout(90000) });
  const result = await response.json() as any;
  if (!response.ok || result.ok !== true) throw new Error(`boat_http_${response.status}_${String(result.error?.code ?? result.code ?? '').replace(/[^a-zA-Z0-9_]/g, '').slice(0, 80)}`);
  return result;
}
async function matches() {
  const rows = [], cursors = new Set<string>(); let cursor = '';
  do {
    const result = await api(`/sandboxes?name=${encodeURIComponent(name)}&limit=200${cursor ? `&cursor=${encodeURIComponent(cursor)}` : ''}`);
    if (!Array.isArray(result.sandboxes)) throw new Error('invalid_list');
    rows.push(...result.sandboxes.filter((row: any) => row.name === name));
    if (!result.pageInfo?.hasMore) break;
    cursor = result.pageInfo.nextCursor;
    if (!cursor || cursors.has(cursor)) throw new Error('invalid_pagination');
    cursors.add(cursor);
  } while (true);
  return rows;
}
await save();
try {
  const created = await api('/sandboxes', 'POST', { name, type: 'small', noEnv: true, snapshots: false, ttlSeconds: 300,
    labels: { hexagon_operation: operation } }, { 'Idempotency-Key': operation });
  const id = created.sandbox?.id;
  if (typeof id !== 'string' || !/^bx_[a-zA-Z0-9]+$/.test(id)) throw new Error('invalid_sandbox_id');
  evidence.id = id; evidence.stage = 'provision'; await save();
  let ready = false;
  for (let i = 0; i < 120; i++) {
    const result = await api(`/sandboxes/${id}`);
    if (['ready', 'idle', 'running'].includes(result.sandbox?.state)) { ready = true; break; }
    if (result.sandbox?.state === 'error') throw new Error('provision_failed');
    await pause();
  }
  if (!ready) throw new Error('provision_timeout');
  const exec = async (command: string, detached = false) => {
    const result = await api(`/sandboxes/${id}/commands`, 'POST', { command, detached, timeoutSeconds: 30 });
    if (!detached && (result.exitCode !== 0 || result.stdoutTruncated || result.stderrTruncated)) {
      evidence.command_failure = { exit_code: result.exitCode, stdout_truncated: result.stdoutTruncated, stderr_truncated: result.stderrTruncated,
        stderr: typeof result.stderr === 'string' ? result.stderr.replaceAll(key, '[REDACTED]').slice(0, 500) : undefined };
      throw new Error('command_failed_or_truncated');
    }
    return result;
  };
  const versions = await exec('node --version && python3 --version');
  evidence.command = { exit_code: versions.exitCode, stdout: versions.stdout };
  evidence.stage = 'files'; await save();
  const bytes = Buffer.alloc(256 * 1024); for (let i = 0; i < bytes.length; i++) bytes[i] = i % 256;
  const written = await api(`/sandboxes/${id}/files`, 'PUT', { path: '/tmp/hexagon-probe.bin', content: bytes.toString('base64'), encoding: 'base64' });
  if (written.size !== bytes.length) throw new Error('binary_write_size_mismatch');
  const read = await api(`/sandboxes/${id}/files?path=${encodeURIComponent('/tmp/hexagon-probe.bin')}&encoding=base64`);
  if (typeof read.content !== 'string' || !Buffer.from(read.content, 'base64').equals(bytes)) throw new Error('binary_roundtrip_failed');
  evidence.binary_roundtrip = true;
  evidence.stage = 'private_http'; await save();
  const source = `from http.server import BaseHTTPRequestHandler,ThreadingHTTPServer
class H(BaseHTTPRequestHandler):
 def do_GET(self):
  ok=self.headers.get('Authorization')=='Bearer probe-only'
  body=bytes(range(256))*1024 if ok else b'denied'
  self.send_response(200 if ok else 401)
  if self.path!='/eof':self.send_header('Content-Length',str(len(body)))
  self.end_headers();self.wfile.write(body)
ThreadingHTTPServer(('0.0.0.0',8765),H).serve_forever()
`;
  await exec(`timeout --kill-after=5s 120s python3 -u -c ${quote(source)}`, true);
  const hosted = await api(`/sandboxes/${id}/host`, 'POST', { port: 8765, public: false });
  const url = new URL(hosted.url), token = url.searchParams.get('_token');
  if (url.protocol !== 'https:' || !url.hostname.endsWith('.on.boat.dev') || !token || /[;\r\n]/.test(token)) throw new Error('private_url_invalid');
  url.search = ''; url.pathname = '';
  for (const path of ['/', '/eof']) {
    const response = await fetch(url.origin + path, { redirect: 'error', headers: { Cookie: `_port_auth=${token}`, Authorization: 'Bearer probe-only' }, signal: AbortSignal.timeout(20000) });
    if (response.status !== 200 || !Buffer.from(await response.arrayBuffer()).equals(bytes)) throw new Error('private_http_failed');
  }
  const denied = await fetch(url, { redirect: 'manual', signal: AbortSignal.timeout(15000) });
  await denied.body?.cancel(); if (denied.status === 200) throw new Error('anonymous_not_denied');
  const appDenied = await fetch(url, { headers: { Cookie: `_port_auth=${token}` }, signal: AbortSignal.timeout(15000) });
  if (appDenied.status !== 401 || await appDenied.text() !== 'denied') throw new Error('application_auth_failed');
  evidence.private_http = { bytes: bytes.length, content_length: true, eof: true, provider_auth: true, application_auth: true };
  evidence.state = 'verified';
} catch (error) {
  evidence.state = 'failed'; evidence.error = error instanceof Error ? error.message.replaceAll(key, '[REDACTED]').slice(0, 500) : 'unknown';
} finally {
  try {
    const rows = await matches(); evidence.cleanup_ids = rows.map(row => row.id); await save();
    for (const row of rows) {
      const deleted = await api(`/sandboxes/${encodeURIComponent(row.id)}`, 'DELETE', undefined, { 'X-Ascii-Confirm-Delete': row.id });
      const deletion = deleted.operation?.id;
      if (!deletion) throw new Error('deletion_operation_missing');
      evidence.deletion_operation = deletion; await save();
      let completed = false;
      for (let i = 0; i < 120; i++) {
        const status = await api(`/deletion-operations/${encodeURIComponent(deletion)}`);
        if (status.operation?.status === 'completed') { completed = true; break; }
        await pause();
      }
      if (!completed) throw new Error('deletion_unconfirmed');
    }
    if ((await matches()).length) throw new Error('resource_still_present');
    evidence.cleanup = 'confirmed';
  } catch (error) { evidence.cleanup = 'unknown'; evidence.cleanup_error = error instanceof Error ? error.message.replaceAll(key, '[REDACTED]').slice(0, 500) : 'unknown'; }
  evidence.finished_at = new Date().toISOString(); await save();
}
console.log(JSON.stringify({ file, state: evidence.state, error: evidence.error, cleanup: evidence.cleanup }));
if (evidence.state !== 'verified' || evidence.cleanup !== 'confirmed') process.exitCode = 1;
