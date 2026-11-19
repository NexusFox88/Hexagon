import { randomBytes, randomUUID } from 'node:crypto';
import { spawn, type ChildProcess } from 'node:child_process';
import { once } from 'node:events';
import { createServer } from 'node:net';
import { mkdir, readFile, writeFile, stat } from 'node:fs/promises';
import { resolve } from 'node:path';
import Fastify from 'fastify';
import { openDatabase } from '../modules/storage/database.js';
import { Hexagon } from '../sdk/typescript/index.js';

const releaseRoot=process.env.HEXAGON_TEST_RELEASE_ROOT?resolve(process.env.HEXAGON_TEST_RELEASE_ROOT):undefined;
const schema = `hexagon_startup_${randomUUID().replaceAll('-', '')}`;
const data = resolve('.local/startup', schema);
const url = new URL(process.env.DATABASE_URL ?? 'postgres://hexagon@127.0.0.1:55432/hexagon');
const admin = openDatabase(url.toString());
url.searchParams.set('options', `-c search_path=${schema}`);
const env = { ...process.env, DATABASE_URL: url.toString(), HEXAGON_DATA_DIR: data, HEXAGON_LOCAL_DISCOVERY_FILE:resolve(data,'discovery.json'), HOST: '127.0.0.1', PREVIEW_HOST: '127.0.0.1', HEXAGON_ACCESS_PORT:'0' };
const fixture = Fastify();
const toolKey = randomBytes(32).toString('hex');
fixture.get('/auth/check', async (req, reply) => req.headers.authorization === `Bearer ${toolKey}` ? { ok: true } : reply.code(401).send({ error: 'invalid' }));
let child: ChildProcess | undefined;
let closed: Promise<unknown> | undefined;
const evidence: Record<string, unknown> = { schema, distribution:releaseRoot??'source', started_at: new Date().toISOString() };
const pause = (ms: number) => new Promise(done => setTimeout(done, ms));
async function port() {
  const listener = createServer(); listener.listen(0, '127.0.0.1'); await once(listener, 'listening');
  const value = (listener.address() as { port: number }).port;
  await new Promise<void>((done, reject) => listener.close(error => error ? reject(error) : done())); return value;
}
async function command(args: string[]) {
  const process = spawn('npm', args, { env, cwd:releaseRoot, stdio: 'ignore' });
  const [code] = await once(process, 'exit'); if (code !== 0) throw new Error('migration_failed');
}
async function start() {
  const apiPort = await port(), previewPort = await port();
  child = spawn(releaseRoot?process.execPath:'npm', releaseRoot?['apps/control-plane/main.js']:['run', 'dev'], { cwd:releaseRoot, env: { ...env, PORT: String(apiPort), PREVIEW_PORT: String(previewPort) }, detached: true, stdio: 'ignore' });
  closed = once(child, 'exit');
  const base = `http://127.0.0.1:${apiPort}`;
  for (let i = 0; i < (process.env.HEXAGON_ACCESS_TUNNEL?700:100); i++) {
    if (child.exitCode !== null || child.signalCode !== null) throw new Error('startup_failed');
    try { if ((await fetch(`${base}/health/live`, { signal: AbortSignal.timeout(500) })).ok) return base; } catch {}
    await pause(100);
  }
  throw new Error('startup_timeout');
}
async function stop() {
  if (!child?.pid || child.exitCode !== null || child.signalCode !== null) return;
  const group = child.pid;
  process.kill(-group, 'SIGTERM');
  let forced = false;
  const timeout = setTimeout(() => { forced = true; try { process.kill(-group, 'SIGKILL'); } catch {} }, 10000);
  try {
    await closed;
    for (let i = 0; i < 100; i++) {
      try { process.kill(-group, 0); } catch { check(!forced, 'forced_shutdown'); return; }
      await pause(100);
    }
    throw new Error('process_group_still_running');
  } finally { clearTimeout(timeout); child = undefined; }
}
function check(value: unknown, code: string): asserts value { if (!value) throw new Error(code); }
try {
  await mkdir(data, { recursive: true, mode: 0o700 });
  await admin.query(`CREATE SCHEMA "${schema}"`);
  await command(['run', 'db:migrate']);
  await command(['run', 'db:migrate']); // Migration replay must preserve initialization state.
  const toolBase = await fixture.listen({ host: '127.0.0.1', port: 0 });
  let base = await start();
  const ownerFile = await readFile(resolve(data, 'owner.json'));
  const owner = JSON.parse(ownerFile.toString());
  const key = await readFile(resolve(data, 'master.key'));
  check((await stat(resolve(data, 'owner.json'))).mode % 512 === 0o600, 'owner_permissions');
  check((await stat(resolve(data, 'master.key'))).mode % 512 === 0o600, 'key_permissions');
  check((await fetch(`${base}/v1/health`)).status === 401, 'anonymous_health_access');
  const consoleResponse=await fetch(`${base}/console/`);
  check(consoleResponse.ok&&(await consoleResponse.text()).includes('/console/app.js'), 'console_unavailable');
  const bootstrap=await fetch(`${base}/local/connect`,{method:'POST',headers:{origin:base,'x-hexagon-local':'1','sec-fetch-site':'same-origin'}});
  const localGrant=await bootstrap.json() as {token:string;mode:string};
  check(bootstrap.ok&&localGrant.mode==='local'&&localGrant.token!==owner.token,'local_bootstrap');
  check((await fetch(`${base}/v1/health`,{headers:{authorization:`Bearer ${localGrant.token}`}})).ok,'local_browser_access');
  let client = await Hexagon.local({dataDirectory:data,baseUrl:base});
  evidence.local_identity={console_bootstrap:true,owner_not_exposed:true,sdk_discovery:true};
  const before = await client.request('GET', '/health');
  check(before.database === 'ready' && before.credentials.state === 'ready' && before.execution.state === 'running', 'initial_health');
  const connection = await client.createConnection({ kind: 'tool', provider: 'http-json', name: 'Restart credential verification', credential: toolKey, config: { base_url: toolBase, operations: {} } });
  check((await client.validateConnection(connection.id)).status === 'ready', 'initial_credential_validation');
  await client.updateConnection(connection.id, { enabled: true });
  const agent = await client.createAgent({ name: 'Persistent definition', harness: { id: 'opencode', version: '1.2.27' } });
  await stop();
  base = await start(); client = await Hexagon.local({dataDirectory:data,baseUrl:base});
  check((await readFile(resolve(data, 'owner.json'))).equals(ownerFile), 'owner_replaced');
  check((await readFile(resolve(data, 'master.key'))).equals(key), 'key_replaced');
  const after = await client.request('GET', '/health');
  check(after.credentials.state === 'ready' && after.credentials.check === 'roundtrip_and_stored_record' && after.execution.state === 'running', 'restart_health');
  const persisted = await client.request('GET', `/connections/${connection.id}`);
  check(persisted.enabled && persisted.has_credential && persisted.name === connection.name, 'connection_not_retained');
  check((await client.validateConnection(connection.id)).status === 'ready', 'credential_not_decryptable_after_restart');
  check((await client.request('GET', '/agents')).agents.some((row: any) => row.id === agent.id), 'agent_not_retained');
  evidence.restart = { owner_unchanged: true, cipher_key_unchanged: true, connection_preserved: true, credential_revalidated: true, agent_preserved: true, health: after };
  await stop();
  // Corrupt only this test deployment's key, proving health detects a retained DB/key mismatch.
  await writeFile(resolve(data, 'master.key'), randomBytes(32), { mode: 0o600 });
  try {
    base = await start();
    const response = await fetch(`${base}/v1/health`, { headers: { authorization: `Bearer ${owner.token}` } });
    const failed = await response.json() as any;
    check(response.status === 503 && failed.credentials.state === 'unavailable', 'wrong_key_not_detected');
    evidence.wrong_key_detected = true;
  } finally { await stop(); await writeFile(resolve(data, 'master.key'), key, { mode: 0o600 }); }
  evidence.state = 'verified';
} catch (error) { evidence.state = 'failed'; evidence.error = error instanceof Error ? error.message : 'unknown'; process.exitCode = 1; }
finally {
  await stop(); await fixture.close(); await admin.end();
  evidence.finished_at = new Date().toISOString();
  await writeFile(resolve(data, 'evidence.json'), JSON.stringify(evidence, null, 2), { mode: 0o600 });
  console.log({ state: evidence.state, error: evidence.error, evidence: resolve(data, 'evidence.json') });
}
