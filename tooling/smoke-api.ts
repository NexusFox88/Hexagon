import { checkCredentialIsolation } from './check-credential-isolation.js';
import { openAccessTunnel } from './access-tunnel.js';
import { createAccessServer } from '../apps/control-plane/access-server.js';
import { ConnectionAccess } from '../modules/access/access.js';
import { modalConfig } from '../integrations/sandboxes/modal.js';
import { blaxelConfig } from '../integrations/sandboxes/blaxel.js';
import { vercelTestConfig } from './vercel-test-config.js';
import { upstashConfig } from '../integrations/sandboxes/upstash.js';
import { spritesConfig } from '../integrations/sandboxes/sprites.js';
import { sandboxConnections, createSandboxConnector } from '../integrations/sandboxes/registry.js';
import { modalTestCredential } from './modal-test-credential.js';
import { checkActiveCancellation } from './check-active-cancellation.js';
import { checkPreviewExpiry } from './check-preview-expiry.js';
import { ResourceFaults } from './resource-faults.js';
import { checkRuntimeLoss } from './check-runtime-loss.js';
import { WorkerProcessDriver } from './worker-process-driver.js';
import { checkConnectionLifecycle } from './check-connection-lifecycle.js';
import { HarnessPackages } from '../modules/execution/harness-packages.js';
import { piAdapter } from '../integrations/harnesses/pi.js';
import { HarnessRegistry } from '../modules/execution/harness.js';
import { localPreviewRequest } from './local-preview-request.js';
import { Previews } from '../modules/sandboxes/previews.js';
import { createPreviewServer } from '../apps/control-plane/preview-server.js';
import Fastify from 'fastify';
import { httpToolConnection } from '../integrations/tools/http-json.js';
import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { spawn } from 'node:child_process';
import { resolve } from 'node:path';
import { mkdir, writeFile, readFile, readdir, unlink } from 'node:fs/promises';
import { Template } from 'e2b';
import { openDatabase } from '../modules/storage/database.js';
import { migrate } from '../modules/storage/migrate.js';
import { SecretCipher, SecretStore } from '../modules/credentials/secret-store.js';
import { tokenDigest } from '../modules/credentials/api-auth.js';
import { Connections } from '../modules/connections/connections.js';
import { Sessions } from '../modules/execution/sessions.js';
import { SandboxLifecycle } from '../modules/sandboxes/lifecycle.js';
import { ExecutionWorker } from '../modules/execution/worker.js';
import { createServer } from '../apps/control-plane/server.js';
import {openaiModelConnection} from '../integrations/models/openai-compatible.js';
import { anthropicModelConnection } from '../integrations/models/anthropic-compatible.js';
import { openCodeAdapter } from '../integrations/harnesses/opencode.js';
import { localTestCredential } from './local-test-credentials.js';
import { Hexagon } from '../sdk/typescript/index.js';

const httpAccessSmoke=process.env.HEXAGON_HTTP_ACCESS_SMOKE==='1';
if(httpAccessSmoke&&process.env.HEXAGON_HARNESS!=='custom')throw new Error('http_access_probe_requires_custom_harness');
const protectedHttpProbe=`import os,json,urllib.request
binding=json.loads(os.environ['HEXAGON_CONNECTIONS'])['catalog']
request=urllib.request.Request(binding['base_url']+'/v1/models',headers=binding['headers'])
with urllib.request.urlopen(request,timeout=60) as response:
 assert response.status==200
 assert isinstance(json.load(response).get('data'),list)
print('protected-http-probe-passed',flush=True)
`;
const serialSdks = process.env.HEXAGON_SERIAL_SDKS === '1';
if (serialSdks && (process.env.HEXAGON_WEB_SMOKE !== '1' || process.env.HEXAGON_BOTH_SDKS !== '1' || ['HEXAGON_ACTIVE_CANCEL','HEXAGON_CONNECTION_LIFECYCLE','HEXAGON_RESOURCE_FAULTS'].some(key=>process.env[key]==='1'))) throw new Error('serial_sdk_requires_plain_dual_web_journey');
const environmentSmoke = process.env.HEXAGON_ENV_SMOKE === '1';
if (environmentSmoke && (process.env.HEXAGON_HARNESS !== 'custom' || process.env.HEXAGON_BOTH_SDKS === '1')) throw new Error('environment_probe_requires_custom_single_sdk');
const environmentProbe = `import os, subprocess, sys
assert os.environ['APP_DEFAULT'] == 'inherited-value'
assert os.environ['APP_OVERRIDE'] == 'session-override'
assert os.environ['APP_EMPTY'] == ''
assert os.environ['APP_LITERAL'] == 'line1\\n$HOME \"quoted\"'
subprocess.run([sys.executable, '-c', \"import os; assert os.environ['APP_OVERRIDE']=='session-override'\"], check=True)
print('environment-probe-passed', flush=True)
`;
const tenant = `api-smoke-${randomUUID()}`;
// Each cloud acceptance worker has its own scheduler namespace and encryption
// key. Preserve its schema with the journal for diagnosis, never claim dev Runs.
const schema = `hexagon_smoke_${tenant.slice(10).replaceAll('-', '')}`;
const databaseUrl = new URL(process.env.DATABASE_URL ?? 'postgres://hexagon@127.0.0.1:55432/hexagon');
const admin = openDatabase(databaseUrl.toString());
try { await admin.query(`CREATE SCHEMA "${schema}"`); } finally { await admin.end(); }
databaseUrl.searchParams.set('options', `-c search_path=${schema}`);
const pool = openDatabase(databaseUrl.toString());
await migrate(pool);
const token = randomBytes(32).toString('hex');
const encryptionKey = randomBytes(32);
const secrets = new SecretStore(pool, new SecretCipher(encryptionKey));
const connections = new Connections(pool, secrets, [...sandboxConnections, anthropicModelConnection, openaiModelConnection, httpToolConnection]);
const harnesses = new HarnessRegistry([openCodeAdapter, piAdapter], new HarnessPackages(pool));
const sessions = new Sessions(pool, connections, harnesses, secrets);
const resourceFaults = process.env.HEXAGON_RESOURCE_FAULTS === '1' ? new ResourceFaults() : undefined;
const lifecycle = new SandboxLifecycle(pool, secrets, (provider, config, key) => {
  const connector = createSandboxConnector(provider, config, key);
  return resourceFaults ? resourceFaults.wrap(connector, save) : connector;
});
const worker = process.env.HEXAGON_WORKER_RESTART === '1'
  ? new WorkerProcessDriver(databaseUrl.toString(), resolve(`.local/evidence/${tenant}.key`))
  : new ExecutionWorker(pool, secrets, lifecycle, harnesses);
const previewOrigin = { scheme: 'http', domain: 'localhost', port: 0 };
const previews = new Previews(pool, lifecycle, previewOrigin);
const previewApp = createPreviewServer(previews);
const app = createServer(pool, { connections, sessions, lifecycle, previews, workerHealth: () => worker.health() });
const provider = process.env.HEXAGON_SANDBOX === 'instabox' ? 'instabox' : process.env.HEXAGON_SANDBOX === 'boat' ? 'boat' : process.env.HEXAGON_SANDBOX === 'fly-machines' ? 'fly-machines' : process.env.HEXAGON_SANDBOX === 'freestyle' ? 'freestyle' : process.env.HEXAGON_SANDBOX === 'agent37' ? 'agent37' : process.env.HEXAGON_SANDBOX === 'vercel' ? 'vercel' : process.env.HEXAGON_SANDBOX === 'upstash' ? 'upstash' : process.env.HEXAGON_SANDBOX === 'sprites' ? 'sprites' : process.env.HEXAGON_SANDBOX === 'blaxel' ? 'blaxel' : process.env.HEXAGON_SANDBOX === 'modal' ? 'modal' : process.env.HEXAGON_SANDBOX === 'daytona' ? 'daytona' : 'e2b';
const providerKey = provider === 'instabox' ? await localTestCredential('insta_api_key', 'sandbox') : provider === 'boat' ? await localTestCredential('boat_api_key', 'sandbox') : provider === 'fly-machines' ? await localTestCredential('fly_token', 'sandbox') : provider === 'freestyle' ? await localTestCredential('freestyle_api_key', 'sandbox') : provider === 'agent37' ? await localTestCredential('agent37_api_key', 'sandbox') : provider === 'vercel' ? await localTestCredential('VERCEL_API_KEY', 'sandbox') : provider === 'upstash' ? await localTestCredential('upstash', 'sandbox') : provider === 'sprites' ? await localTestCredential('fly_sprites_token','sandbox') : provider === 'blaxel' ? await localTestCredential('blaxel_personal_api_secret', 'sandbox') : provider === 'modal' ? await modalTestCredential() : await localTestCredential(provider === 'daytona' ? 'daytona_api_key' : 'e2b_api_key', 'sandbox');
const template = `hexagon-${tenant}`;
const providerConfig = provider === 'instabox' ? { template: 'agent-browser' } : provider === 'boat' ? { size: 'small' } : provider === 'fly-machines' ? { organization: 'personal', region: 'iad' } : provider === 'freestyle' ? { snapshot: 'freestyle/ubuntu-sm' } : provider === 'agent37' ? { region: 'us' } : provider === 'vercel' ? vercelTestConfig : provider === 'upstash' ? upstashConfig.parse({}) : provider === 'sprites' ? spritesConfig.parse({}) : provider === 'blaxel' ? blaxelConfig.parse({ workspace: await localTestCredential('blaxel_workspace', 'sandbox') }) : provider === 'modal' ? modalConfig.parse({}) : provider === 'daytona' ? { api_url: await localTestCredential('daytona_endpoint', 'sandbox'), snapshot: 'daytona-medium' } : { template };
const makeConnector = () => createSandboxConnector(provider, providerConfig, providerKey);
const evidence: Record<string, any> = { tenant, schema, template, provider, serial_sdks: serialSdks, state: 'intent', started_at: new Date().toISOString() };
await mkdir('.local/evidence', { recursive: true, mode: 0o700 });
const file = `.local/evidence/${tenant}.json`;
if (resourceFaults) evidence.resource_faults = resourceFaults.evidence;
await writeFile(`.local/evidence/${tenant}.key`, encryptionKey, { mode: 0o600 });
const save = () => writeFile(file, JSON.stringify(evidence, null, 2), { mode: 0o600 });
await save();
let base = '';
let accessTunnel:Awaited<ReturnType<typeof openAccessTunnel>>|undefined;
const webSmoke = process.env.HEXAGON_WEB_SMOKE === '1';
const denyAuthorization = process.env.HEXAGON_GUI_DENY_AUTH === '1';
const toolSmoke = webSmoke || denyAuthorization || process.env.HEXAGON_TOOL_SMOKE === '1';
const webRequirements = webSmoke ? await readFile(new URL('../testing/fixtures/filter-app/README.md', import.meta.url), 'utf8') : ''; 
const toolFixture = Fastify();
const toolKey = randomBytes(24).toString('hex');
let reportCredential = toolKey;
let reportConnection = '';
let previewRequest: (() => Promise<Response>) | undefined;
let requirementReads = 0;
const reports: unknown[] = [];
toolFixture.addHook('onRequest', async (request, reply) => {
  const expected = request.url.startsWith('/reports') ? reportCredential : toolKey;
  if (request.headers.authorization !== `Bearer ${expected}`) {
    if (request.url === '/reports') { evidence.report_authentication_failures = (evidence.report_authentication_failures ?? 0) + 1; }
    return reply.code(401).send({ error: 'invalid' });
  }
});
toolFixture.get('/stats', async () => ({ writes: reports.length, reads: requirementReads }));
toolFixture.get('/auth/check', async () => ({ ok: true }));
toolFixture.get('/reports/auth/check', async () => ({ ok: true }));
toolFixture.get('/requirements', async () => { requirementReads++; return { id: 'ACCEPTANCE-001', instruction: webSmoke ? webRequirements : 'Implement calculate.py add(a,b), run python3 test_calculate.py without changing tests. Then call reports write with a summary.' }; });
toolFixture.post('/reports', async request => { reports.push(request.body); return { id: `report-${reports.length}`, saved: true }; });
async function api(method: string, path: string, body?: unknown, headers: Record<string, string> = {}) {
  return new Hexagon(base, token).request(method, path, body, headers, AbortSignal.timeout(45000));
}
async function guiCheckpoint(suffix: string, payload: unknown) {
  const purpose = `gui-checkpoint:${suffix}`;
  const secret_id = await secrets.save(tenant, purpose, JSON.stringify(payload));
  await writeFile(`${file}.${suffix}.json`, JSON.stringify({ base, tenant, schema, secret_id, purpose }), { mode: 0o600 });
}

async function setupConnection(input: any) {
  if (process.env.HEXAGON_GUI_SETUP !== '1') {
    const row = await api('POST', '/connections', input);
    await api('POST', `/connections/${row.id}/validate`);
    return api('PATCH', `/connections/${row.id}`, { enabled: true });
  }
  const checkpoint = `${file}.setup.json`;
  await guiCheckpoint('setup', { base, token, input });
  evidence.stage = `gui_setup_${input.kind}`; await save();
  console.log(JSON.stringify({ setup_review_file: checkpoint, kind: input.kind }));
  const deadline = Date.now() + 600000;
  while (Date.now() < deadline) {
    const rows = (await api('GET', '/connections')).connections;
    const row = rows.find((item: any) => item.name === input.name && item.kind === input.kind && item.provider === input.provider && item.enabled && item.status === 'ready');
    if (row) {
      evidence.gui_setup ||= [];
      evidence.gui_setup.push({ id: row.id, kind: row.kind, validation: row.validation }); await save();
      return row;
    }
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  throw new Error('gui_setup_timeout');
}

async function allEvents(id: string, after = '0') {
  const result: any[] = [];
  while (true) {
    const page = await api('GET', `/runs/${id}/events?after=${after}`);
    if (!page.events.length) return result;
    result.push(...page.events);
    after = page.events.at(-1).id;
  }
}
async function waitRun(id: string) {
  const deadline = Date.now() + 420000;
  while (Date.now() < deadline) {
    const run = await api('GET', `/runs/${id}`);
    evidence.last_run = { id, state: run.state, error: run.error };
    await save();
    if (resourceFaults && !evidence.creation_uncertainty) {
      const row = (await api('GET', '/fleet')).sessions.find((item: any) => item.id === run.session_id);
      const creation = row?.resource_operations.find((item: any) => item.kind === 'create' && item.state === 'unknown');
      if (creation) { evidence.creation_uncertainty = { operation: creation, sandbox: row.sandbox, run_state: run.state }; await save(); }
    }
    if (toolSmoke && run.state === 'waiting_authorization' && !evidence.authorization_resumed) {
      if (reports.length) throw new Error('write_before_authorization');
      if (process.env.HEXAGON_RUNTIME_LOSS === '1') {
        if (!evidence.runtime_loss) {
          const bound = await api('GET', `/sessions/${run.session_id}`);
          evidence.stage = 'runtime_loss'; await save();
          evidence.runtime_loss = await checkRuntimeLoss(makeConnector(), bound.sandbox.id, run.session_id, api);
          await save();
        }
        await new Promise(resolve => setTimeout(resolve, 1000));
        continue;
      }
      if (worker instanceof WorkerProcessDriver && !evidence.worker_restart) {
        const before = await api('GET', `/sessions/${run.session_id}`);
        const lease = (await pool.query('SELECT generation,lease_owner FROM runs WHERE tenant_id=$1 AND id=$2', [tenant, id])).rows[0];
        await worker.crash(); // Kill the actual worker process; leave cloud Runtime and Harness alive.
        evidence.worker_restart = { old_worker: lease.lease_owner, generation_before: lease.generation, sandbox_before: before.sandbox.id, killed_at: new Date().toISOString() };
        await save(); worker.start();
      }

      if (process.env.HEXAGON_GUI_AUTH === '1' || denyAuthorization) {
        if (!evidence.authorization_wait_observed) {
          await guiCheckpoint('authorization', { base, token, run: id, session: run.session_id, connection: reportConnection, credential: reportCredential });
          evidence.authorization_wait_observed = true; evidence.stage = 'gui_authorization'; await save();
          console.log(JSON.stringify({ authorization_review_file: `${file}.authorization.json` }));
        }
        if (denyAuthorization) {
          const calls = (await api('GET', `/runs/${id}/tool-calls`)).calls;
          if (calls.some((call: any) => call.binding === 'reports' && call.state === 'completed')) evidence.authorization_resumed = true;
          await new Promise(resolve => setTimeout(resolve, 500));
          continue;
        }
        const connection = await api('GET', `/connections/${reportConnection}`);
        if (connection.status === 'ready' && connection.enabled) {
          evidence.authorization_resumed = true; evidence.authorization_external = true;
          if (evidence.credential_expired) evidence.approval_submitted = false;
        }
      } else {
        evidence.authorization_wait_observed = true; await save();
        await api('PATCH', `/connections/${reportConnection}`, { credential: reportCredential });
        await api('POST', `/connections/${reportConnection}/validate`);
        await api('PATCH', `/connections/${reportConnection}`, { enabled: true });
        evidence.authorization_resumed = true;
        if (evidence.credential_expired) evidence.approval_submitted = false;
      }
    }
    if (toolSmoke && run.state === 'waiting_approval' && !evidence.approval_submitted) {
      if (reports.length) throw new Error('write_before_approval');
      let after = '0'; let approval: any;
      while (true) {
        const page = await api('GET', `/runs/${id}/events?after=${after}`);
        for (const event of page.events) if (event.type === 'approval.required') approval = event.data;
        if (!page.events.length) break;
        after = page.events.at(-1).id;
      }
      if (!approval) throw new Error('approval_event_missing');
      evidence.approval_wait_observed = true; evidence.writes_before_approval = reports.length; await save();
      if (process.env.HEXAGON_TOOL_EXPIRY === '1' && !evidence.credential_expired) {
        reportCredential = randomBytes(24).toString('hex');
        evidence.credential_expired = true; evidence.approval_before_expiry = approval.id; await save();
      } else if (evidence.credential_expired) {
        if (approval.id === evidence.approval_before_expiry) throw new Error('stale_approval_reused');
        evidence.approval_after_reauthentication = approval.id;
      }
      await api('POST', `/approvals/${approval.id}/decision`, { approved: true });
      await api('POST', `/approvals/${approval.id}/decision`, { approved: true });
      evidence.approval_submitted = true;
    }
    if (['completed', 'failed', 'cancelled'].includes(run.state)) return run;
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  throw new Error('run_timeout');
}
try {
  await pool.query('INSERT INTO tenants(id,name) VALUES($1,$1)', [tenant]);
  await pool.query("INSERT INTO api_keys(digest,tenant_id,label) VALUES($1,$2,'test')", [tokenDigest(token), tenant]);
  if(process.env.HTTPS_PROXY && process.env.HEXAGON_MODEL==='siliconflow'){process.env.HEXAGON_ACCESS_EGRESS_PROXY_URL=process.env.HTTPS_PROXY;process.env.HEXAGON_ACCESS_EGRESS_HOSTS='api.siliconflow.com';}
  accessTunnel=await openAccessTunnel(createAccessServer(new ConnectionAccess(pool,secrets),undefined,async entry=>{(evidence.access_requests??=[]).push(entry);await save();}));
  process.env.HEXAGON_ACCESS_URL=accessTunnel.origin;
  evidence.credential_access={implementation:connections.adapter('sandbox',provider).capabilities.includes('native_credential_auth')?'external_proxy_with_native_auth':'external_proxy',origin:accessTunnel.origin};await save();
  base = await app.listen({ host: '127.0.0.1', port: 0 });
  previewOrigin.port = Number(new URL(await previewApp.listen({ host: '127.0.0.1', port: 0 })).port);
  evidence.stage = 'build_template'; await save();
  if (provider === 'e2b') await Template.build(Template().fromTemplate('base'), template, { apiKey: providerKey, memoryMB: 2048, cpuCount: 2 });
  worker.start();
  const sandbox = await setupConnection( { kind: 'sandbox', provider, name: 'API test sandbox', config: providerConfig, credential: providerKey });
  const siliconflow = process.env.HEXAGON_MODEL === 'siliconflow';
  const modelConfig = siliconflow
    ? { base_url: 'https://api.siliconflow.com', model: 'deepseek-ai/DeepSeek-V4-Flash' }
    : { base_url: process.env.HEXAGON_MODEL_BASE_URL ?? await localTestCredential('MINIMAX_ANTHROPIC_BASE_URL', 'shell'), model: process.env.HEXAGON_MODEL_NAME ?? await localTestCredential('MINIMAX_ANTHROPIC_MODEL', 'shell') };
  evidence.model = modelConfig; await save();
  const modelSecret=await api('POST','/secrets',{name:'Acceptance model credential',value:await localTestCredential(siliconflow ? 'siliconflow_api_key_polygala' : 'MINIMAX_ANTHROPIC_API_KEY','shell')});
  const model = await setupConnection( { kind: 'model', provider: process.env.HEXAGON_MODEL_PROTOCOL==='openai-compatible'?'openai-compatible':'anthropic-compatible', name: 'API test model', config: modelConfig, secret_id:modelSecret.id });
  const httpBindings:Record<string,string>={};
  if(httpAccessSmoke){
    const http=await setupConnection({kind:'http',provider:'http',name:'Protected model catalog',secret_id:modelSecret.id,config:{endpoint:'https://api.siliconflow.com',authentication:{type:'bearer'},access:{rules:[{methods:['GET'],path:'/v1/models'}]}}});
    httpBindings.catalog=http.id;
  }
  const toolBindings: Record<string, string> = {};
  if (toolSmoke) {
    const toolBase = await toolFixture.listen({ host: '127.0.0.1', port: 0 });
    const requirements = await setupConnection( { kind: 'tool', provider: 'http-json', name: 'Requirements', credential: toolKey, config: { base_url: toolBase, operations: { read: { path: '/requirements', method: 'GET', description: 'Read ACCEPTANCE-001 implementation requirements.' } } } });
    const report = await api('POST', '/connections', { kind: 'tool', provider: 'http-json', name: 'Reports', config: { base_url: toolBase, operations: { write: { path: '/reports', method: 'POST', description: 'Save the final report. Authorization and approval are handled automatically by the platform; call this tool once after tests pass.', approval: true, input_schema: { type: 'object', properties: { summary: { type: 'string' } }, required: ['summary'], additionalProperties: false } } } } });
    reportConnection = report.id;
    if (process.env.HEXAGON_TOOL_EXPIRY === '1') {
      await api('PATCH', `/connections/${report.id}`, { credential: toolKey, config: { ...report.config, verify_path: '/reports/auth/check' } });
      if ((await api('POST', `/connections/${report.id}/validate`)).status !== 'ready') throw new Error('initial_report_validation_failed');
      await api('PATCH', `/connections/${report.id}`, { enabled: true });
    }
    toolBindings.requirements = requirements.id; toolBindings.reports = report.id;
  }
  const harness = process.env.HEXAGON_HARNESS === 'custom' ? { id: 'custom.python-agent', version: '1.0.0' } : process.env.HEXAGON_HARNESS === 'pi' ? { id: 'pi', version: '1.5.2' } : { id: 'opencode', version: '1.2.27' };
  if (process.env.HEXAGON_HARNESS === 'custom') {
    evidence.package = await new Hexagon(base, token).registerHarnessPackage({ ...harness, protocol: 'hexagon-json-v1', interpreter: 'python3', entrypoint: 'main.py',
      capabilities: ['tools', 'conversation'], model_providers: ['anthropic-compatible'],
      files: [{ path: 'main.py', content: (httpAccessSmoke?protectedHttpProbe:'') + (environmentSmoke ? environmentProbe : '') + await readFile('examples/harnesses/python-agent/main.py', 'utf8') }] });
  }
  evidence.harness = harness;
  const agent = await api('POST', '/agents', { name: 'API task', harness, ...(environmentSmoke ? { env: { APP_DEFAULT: 'inherited-value', APP_OVERRIDE: 'agent-default', APP_EMPTY: '', APP_LITERAL: 'line1\n$HOME "quoted"' } } : {}), ...(toolSmoke ? { tools: [{ name: 'requirements' }, { name: 'reports', required_at_start: false }] } : {}) });
  const session = await api('POST', '/sessions', { agent_id: agent.id, sandbox_connection_id: sandbox.id, model_connection_id: model.id, connections:httpBindings, tools: toolBindings, ...(environmentSmoke ? { env: { APP_OVERRIDE: 'session-override' } } : {}) });
  evidence.session = session.id; evidence.stage = 'submit'; await save();
  const testPath = webSmoke ? 'acceptance.mjs' : 'test_calculate.py';
  const implementationPath = webSmoke ? 'filter.mjs' : 'calculate.py';
  const testCommand = webSmoke ? 'node acceptance.mjs' : 'python3 test_calculate.py';
  const testOutput = webSmoke ? '8 assertions passed' : '2 assertions passed';
  const test = webSmoke ? await readFile(new URL('../testing/fixtures/filter-app/acceptance.mjs', import.meta.url), 'utf8') : 'from calculate import add\nassert add(2, 3) == 5\nassert add(-4, 1) == -3\nprint("2 assertions passed")\n';
  let files = [{ path: 'calculate.py', content_base64: Buffer.from('def add(a, b):\n    raise NotImplementedError()\n').toString('base64') }, { path: testPath, content_base64: Buffer.from(test).toString('base64') }];
  if (webSmoke) {
    const directory = new URL('../testing/fixtures/filter-app/', import.meta.url);
    files = await Promise.all((await readdir(directory)).map(async path => ({ path, content_base64: (await readFile(new URL(path, directory))).toString('base64') })));
  }
  await api('POST', `/sessions/${session.id}/files`, { files });
  const input = { input: (toolSmoke ? 'First call the requirements read MCP tool for ACCEPTANCE-001. After implementation, call reports write MCP to submit the report. Wait for platform authorization, approval and the tool result before replying. ' : '') + (webSmoke ? 'Implement Web task filtering following README.md. Do not modify acceptance.mjs. Run node acceptance.mjs, save its output as test-report.txt and copy filter.mjs to the Run artifact directory. Start python3 serve.py on port 3000 and retain the preview process. Explain changes and test results in English.' : 'Implement add in calculate.py and run python3 test_calculate.py without changing tests. Save output as test-report.txt and copy calculate.py into the Run artifact directory so both files can be downloaded. Explain changes and test results in English.') };
  if (denyAuthorization) input.input += 'If the reports tool returns authorization denied, do not retry or attempt another write path. Retain local test artifacts and explicitly state in English that authorization was denied and the report was not uploaded.';
  const run = await api('POST', `/sessions/${session.id}/runs`, input, { 'idempotency-key': 'first' });
  const retry = await api('POST', `/sessions/${session.id}/runs`, input, { 'idempotency-key': 'first' });
  if (run.id !== retry.id) throw new Error('duplicate_run');
  evidence.run = run.id; evidence.stage = 'execute'; await save();
  const eventClient = new Hexagon(base, token);
  const initialStream = eventClient.stream(run.id);
  const firstEvent = await initialStream.next();
  await initialStream.return(undefined);
  if (!firstEvent.value?.id) throw new Error('initial_stream_cursor_missing');
  evidence.stream_disconnect_cursor = firstEvent.value.id;

  const result = await waitRun(run.id);
  evidence.result = result;
  if(httpAccessSmoke){evidence.protected_http_call=(await allEvents(run.id)).some(e=>e.type==='harness.stdout'&&e.data?.text?.includes('protected-http-probe-passed'));if(!evidence.protected_http_call)throw new Error('protected_http_probe_missing');}
  const auditSession=await api('GET',`/sessions/${session.id}`);
  if(auditSession.sandbox?.id){
    const invocationRow=(await pool.query('SELECT secret_id FROM run_invocations WHERE tenant_id=$1 AND run_id=$2',[tenant,run.id])).rows[0];
    const invocation=invocationRow?JSON.parse(await secrets.read(tenant,invocationRow.secret_id,`invocation:${run.id}`)):{};
    const original=await localTestCredential(siliconflow?'siliconflow_api_key_polygala':'MINIMAX_ANTHROPIC_API_KEY','shell');
    const originalCredentials=provider==='instabox'?[original,providerKey]:[original];
    if(originalCredentials.some(value=>JSON.stringify(invocation).includes(value)))throw new Error('original_key_in_persisted_invocation');
    evidence.credential_isolation={...await checkCredentialIsolation(makeConnector(),auditSession.sandbox.id,[...originalCredentials,...(invocation.native_credential_access??[]).map((g:any)=>g.token)]),persisted_invocation_contains_original:false,provider_key_checked:provider==='instabox',native_grants_checked:invocation.native_credential_access?.length??0};
  }
  await save();
  if (environmentSmoke) {
    if (result.state !== 'completed') throw new Error('environment_cloud_run_failed');
    evidence.environment = { defaults: true, session_override: true, empty: true, literal: true, child_inheritance: true };
  }
  if (process.env.HEXAGON_RUNTIME_LOSS === '1') {
    if (result.state !== 'failed' || result.error?.code !== 'runtime_interrupted' || reports.length || !requirementReads || !evidence.runtime_loss) throw new Error('runtime_loss_not_safely_failed');
    const row = (await api('GET', '/fleet')).sessions.find((item: any) => item.id === session.id);
    if (row.runtime_state !== 'interrupted' || row.sandbox.id !== evidence.runtime_loss.unknown.sandbox) throw new Error('runtime_loss_fleet_mismatch');
    const counts = (await pool.query("SELECT (SELECT count(*)::int FROM resource_operations WHERE tenant_id=$1 AND session_id=$2 AND kind='create') AS creates, (SELECT count(*)::int FROM run_invocations WHERE tenant_id=$1 AND run_id=$3) AS invocations", [tenant, session.id, run.id])).rows[0];
    if (counts.creates !== 1 || counts.invocations !== 1) throw new Error('runtime_loss_duplicate_execution');
    evidence.runtime_loss = { ...evidence.runtime_loss, ...counts, final_runtime: row.runtime_state, reports: reports.length, requirement_reads: requirementReads };
    await api('POST', `/sessions/${session.id}/close`);
    if (await makeConnector().inspect(row.sandbox.id)) throw new Error('runtime_loss_cleanup_failed');
    await api('DELETE', `/connections/${sandbox.id}`);
    evidence.state = 'verified'; evidence.product_cleanup = 'confirmed';
  } else {
  if (toolSmoke) {
    evidence.tools = { requirement_reads: requirementReads, reports };
    if (denyAuthorization) {
      const calls = (await api('GET', `/runs/${run.id}/tool-calls`)).calls.filter((call: any) => call.binding === 'reports');
      const denied = (await allEvents(run.id)).filter(event => event.type === 'authorization.denied');
      const connection = await api('GET', `/connections/${reportConnection}`);
      if (!requirementReads || reports.length || calls.length !== 1 || calls[0].state !== 'completed' || denied.length !== 1 || connection.status === 'ready' || evidence.approval_wait_observed || !/(?:denied|refused)/i.test(result.output?.text ?? '')) throw new Error('authorization_denial_incomplete');
      evidence.authorization_denial = { call: calls[0].id, event: denied[0].id, reports: reports.length, connection_status: connection.status, output: result.output.text };
    } else if (!requirementReads || reports.length !== 1 || !evidence.authorization_wait_observed || !evidence.approval_wait_observed) throw new Error('tool_journey_incomplete');
    if (process.env.HEXAGON_TOOL_EXPIRY === '1' && (evidence.report_authentication_failures !== 1 || !evidence.approval_after_reauthentication)) throw new Error('tool_reauthentication_incomplete');
  }
  if (result.state !== 'completed' || !result.output?.text) throw new Error('run_not_completed');
  const bound = await api('GET', `/sessions/${session.id}`);
  if (worker instanceof WorkerProcessDriver) {
    const recovered = (await pool.query('SELECT generation,lease_owner FROM runs WHERE tenant_id=$1 AND id=$2', [tenant, run.id])).rows[0];
    const counts = (await pool.query("SELECT (SELECT count(*)::int FROM resource_operations WHERE tenant_id=$1 AND session_id=$2 AND kind='create') AS creates, (SELECT count(*)::int FROM run_invocations WHERE tenant_id=$1 AND run_id=$3) AS invocations", [tenant, session.id, run.id])).rows[0];
    if (!evidence.worker_restart || recovered.generation <= evidence.worker_restart.generation_before || recovered.lease_owner === evidence.worker_restart.old_worker || bound.sandbox.id !== evidence.worker_restart.sandbox_before || counts.creates !== 1 || counts.invocations !== 1) throw new Error('worker_recovery_invariant_failed');
    evidence.worker_restart = { ...evidence.worker_restart, new_worker: recovered.lease_owner, generation_after: recovered.generation, sandbox_after: bound.sandbox.id, ...counts, recovered: true };
  }

  const connector = makeConnector();
  const testAfter = await connector.read(bound.sandbox.id, `/tmp/hexagon-runtime/workspace/${testPath}`);
  if (Buffer.from(testAfter).toString() !== test) throw new Error('test_modified');
  const tested = await connector.execute(bound.sandbox.id, `cd /tmp/hexagon-runtime/workspace && ${testCommand}`);
  if (tested.exit_code !== 0) throw new Error('fixed_test_failed');
  evidence.independent_test = tested;
  evidence.test_unchanged = true;
  if (webSmoke || process.env.HEXAGON_PREVIEW_SMOKE === '1') {
    if (!webSmoke) {
    await connector.write(bound.sandbox.id, '/tmp/hexagon-runtime/workspace/index.html', Buffer.from('<!doctype html><title>Hexagon cloud preview fixture</title><h1>Cloud preview is alive</h1>'));
    await connector.execute(bound.sandbox.id, 'cd /tmp/hexagon-runtime/workspace && python3 -m http.server 3000 --bind 0.0.0.0', { background: true, timeout_seconds: 600 });
    }
    const grant = await new Hexagon(base, token).createPreview(session.id, 3000);
    const url = new URL(grant.url);
    const entry = await localPreviewRequest(url, previewOrigin.port, url.pathname + url.search);
    if (entry.status !== 302) throw new Error('preview_entry_failed');
    const cookie = entry.headers.get('set-cookie')?.split(';')[0];
    if (!cookie) throw new Error('preview_cookie_missing');
    previewRequest = () => localPreviewRequest(url, previewOrigin.port, '/', cookie);
    const page = await previewRequest();
    const previewBody = await page.text();
    if (!page.ok || !previewBody.includes(webSmoke ? 'ACCEPTANCE-001 / LIVE WORKSPACE' : 'Cloud preview is alive')) {
      evidence.preview_failure = { status: page.status, content_type: page.headers.get('content-type') };
      evidence.preview_diagnostic = await connector.execute(bound.sandbox.id, `cd /tmp/hexagon-runtime/workspace && python3 -c 'import urllib.request; r=urllib.request.urlopen("http://127.0.0.1:3000", timeout=5); print(r.status); print("ACCEPTANCE-001 / LIVE WORKSPACE" in r.read().decode())'`);
      try { const target = await connector.preview(bound.sandbox.id, 3000); const direct = await fetch(target.url, { headers: target.headers, signal: AbortSignal.timeout(15000) }); evidence.preview_failure.provider_status = direct.status; await direct.body?.cancel(); } catch (error) { evidence.preview_failure.provider_error = error instanceof Error ? error.message : 'unknown'; }
      await save();
      throw new Error('preview_content_failed');
    }
    const denied = await localPreviewRequest(url, previewOrigin.port, '/');
    if (denied.status !== 401) throw new Error('preview_anonymous_access');
    evidence.preview = { id: grant.id, content_verified: true, anonymous_denied: true, after_run_completed: true };
    if (process.env.HEXAGON_PREVIEW_EXPIRY === '1') {
      evidence.stage = 'natural_preview_expiry'; await save();
      evidence.preview_expiry = await checkPreviewExpiry(new Hexagon(base, token), session.id, previewOrigin.port, webSmoke ? 'ACCEPTANCE-001 / LIVE WORKSPACE' : 'Cloud preview is alive');
      if (!(await previewRequest()).ok) throw new Error('expiry_invalidated_other_grant');
      evidence.preview_expiry.other_grant_remained_valid = true; await save();
    }
    if (process.env.HEXAGON_BROWSER_REVIEW === '1') {
      await guiCheckpoint('browser', { url: grant.url, base, token, session: session.id, run: run.id });
      evidence.stage = 'browser_review'; await save();
      console.log(JSON.stringify({ browser_review_file: `${file}.browser.json` }));
      const deadline = Date.now() + 240000;
      let verified = false;
      while (Date.now() < deadline) {
        const result = await readFile(`${file}.browser-result.json`, 'utf8').catch(() => null);
        if (result) { evidence.browser = JSON.parse(result); verified = evidence.browser.passed === true; break; }
        await new Promise(resolve => setTimeout(resolve, 500));
      }
      if (!verified) throw new Error('browser_review_not_passed');
    }
  }

  const downloaded: Record<string, string> = {};
  const artifactClient = new Hexagon(base, token);
  const artifacts = (await artifactClient.artifacts(run.id)).artifacts;
  for (const name of ['test-report.txt', implementationPath]) {
    const artifact = artifacts.find(value => value.name === name);
    if (!artifact) throw new Error(`artifact_missing_${name}`);
    const content = Buffer.from(await artifactClient.downloadArtifact(artifact.id));
    if (createHash('sha256').update(content).digest('hex') !== artifact.sha256) throw new Error('artifact_hash_mismatch');
    if (name === 'test-report.txt' && !content.toString().includes(testOutput)) throw new Error('artifact_test_report_invalid');
    if (name === implementationPath && !content.equals(Buffer.from(await connector.read(bound.sandbox.id, `/tmp/hexagon-runtime/workspace/${implementationPath}`)))) throw new Error('artifact_code_mismatch');
    downloaded[artifact.id] = artifact.sha256;
  }
  evidence.artifacts = artifacts;

  const events = await allEvents(run.id);
  const verifiedInputs = events.filter(event => event.type === 'workspace.inputs_verified');
  const expectedInputs = files.map(file => { const bytes = Buffer.from(file.content_base64, 'base64'); return { path: file.path, sha256: createHash('sha256').update(bytes).digest('hex'), size: bytes.length }; }).sort((a, b) => a.path.localeCompare(b.path));
  if (verifiedInputs.length !== 1 || JSON.stringify(verifiedInputs[0].data.files.map((file: any) => ({ path: file.path, sha256: file.sha256, size: file.size })).sort((a: any, b: any) => a.path.localeCompare(b.path))) !== JSON.stringify(expectedInputs)) throw new Error('workspace_input_receipt_mismatch');
  evidence.input_delivery = { files: expectedInputs, verified_event: verifiedInputs[0].id, idempotent_run: run.id === retry.id };
  const cursor = events[2].id;
  const replay = await allEvents(run.id, cursor);
  if (JSON.stringify(replay) !== JSON.stringify(events.slice(3))) throw new Error('cursor_replay_mismatch');
  const streamed = [];
  for await (const event of eventClient.stream(run.id, firstEvent.value.id)) if (event.id) streamed.push(event.id);
  const expectedStream = events.filter(event => BigInt(event.id) > BigInt(firstEvent.value.id!)).map(event => event.id);
  if (JSON.stringify(streamed) !== JSON.stringify(expectedStream)) throw new Error('stream_resume_mismatch');
  evidence.stream_resume_verified = true;
  evidence.event_count = events.length;
  evidence.replay_verified = true;
  const followup = await api('POST', `/sessions/${session.id}/runs`, { input: 'Summarize the modified file and its implementation in one English sentence. Do not call tools.' }, { 'idempotency-key': 'followup' });
  evidence.followup = await waitRun(followup.id);
  if (evidence.followup.state !== 'completed') throw new Error('followup_failed');
  if (process.env.HEXAGON_BOTH_SDKS === '1') {
    evidence.stage = 'python_sdk'; await save();
    if (webSmoke) {
      const reportConfig = (await api('GET', `/connections/${reportConnection}`)).config;
      evidence.python = await pythonWebJourney({ base, token, harness, serial_sdks: serialSdks, ts_session: session.id, sandbox: sandbox.id, model: model.id, requirements: toolBindings.requirements, report_config: reportConfig, tool_base: reportConfig.base_url, tool_key: toolKey, gui_auth: process.env.HEXAGON_PYTHON_GUI_AUTH === '1', fixture: resolve('testing/fixtures/filter-app') }, async checkpoint => {
        if (checkpoint.kind === 'preview_failure') {
          evidence.python_preview_failure = checkpoint;
          const row = await api('GET', `/sessions/${checkpoint.session}`);
          evidence.python_preview_listener = await connector.execute(row.sandbox.id, `python3 - <<'PY'
import json,urllib.request
for host in ['127.0.0.1','[::1]']:
 try:
  response=urllib.request.urlopen('http://'+host+':3000/',timeout=5)
  print(json.dumps({'host':host,'status':response.status,'expected':b'ACCEPTANCE-001 / LIVE WORKSPACE' in response.read()}))
 except Exception as error: print(json.dumps({'host':host,'error_type':type(error).__name__}))
PY`);
          try {
            const target = await connector.preview(row.sandbox.id, 3000);
            const response = await fetch(target.url, { headers: target.headers, signal: AbortSignal.timeout(15000) });
            evidence.python_preview_failure.provider_status = response.status;
            await response.body?.cancel();
          } catch (error) {
            evidence.python_preview_failure.provider_error = error instanceof Error ? error.message : 'unknown';
          }
          await save();
          return;
        }
        if (checkpoint.kind === 'authorization') {
          await guiCheckpoint('authorization', { base, token, ...checkpoint, credential: toolKey });
          evidence.python_gui_authorization = { run: checkpoint.run, session: checkpoint.session, connection: checkpoint.connection, state: 'waiting' };
          evidence.stage = 'python_gui_authorization'; await save();
          console.log(JSON.stringify({ authorization_review_file: `${file}.authorization.json`, client: 'python' }));
          const deadline = Date.now() + 600000;
          while (Date.now() < deadline) {
            const connection = await api('GET', `/connections/${checkpoint.connection}`);
            if (connection.status === 'ready' && connection.enabled) {
              evidence.python_gui_authorization.state = 'ready'; await save(); return;
            }
            await new Promise(resolve => setTimeout(resolve, 500));
          }
          throw new Error('python_gui_authorization_timeout');
        }
        evidence.python_checkpoint = checkpoint; await save();
        const pythonSession = await api('GET', `/sessions/${checkpoint.session}`);
        const unchanged = await connector.read(pythonSession.sandbox.id, '/tmp/hexagon-runtime/workspace/acceptance.mjs');
        if (Buffer.from(unchanged).toString() !== test) throw new Error('python_web_test_modified');
        evidence.python_independent_test = await connector.execute(pythonSession.sandbox.id, 'cd /tmp/hexagon-runtime/workspace && node acceptance.mjs');
        if (evidence.python_independent_test.exit_code !== 0) throw new Error('python_web_fixed_test_failed');
        const cross = await new Hexagon(base, token).submit(pythonSession.id, 'Describe the previous filtering logic in one English sentence. Do not call tools.', 'ts-web-cross');
        evidence.ts_cross_language = await waitRun(cross.id);
        if (evidence.ts_cross_language.state !== 'completed') throw new Error('ts_web_cross_failed');
      });
      const closed = await api('GET', `/sessions/${evidence.python.session}`);
      if (closed.state !== 'closed' || await connector.inspect(closed.sandbox.id)) throw new Error('python_web_cleanup_failed');
      if (reports.length !== 2) throw new Error('python_web_report_count');
    } else {
      evidence.python = await pythonJourney({ base, token, ts_session: session.id, definition: { agent_id: agent.id, sandbox_connection_id: sandbox.id, model_connection_id: model.id, connections:httpBindings, tools: toolBindings } });
      const pythonSession = await api('GET', `/sessions/${evidence.python.session}`);
      const pythonTest = await connector.read(pythonSession.sandbox.id, '/tmp/hexagon-runtime/workspace/test_calculate.py');
      if (Buffer.from(pythonTest).toString() !== test) throw new Error('python_test_modified');
      evidence.python.independent_test = await connector.execute(pythonSession.sandbox.id, 'cd /tmp/hexagon-runtime/workspace && python3 test_calculate.py');
      if (evidence.python.independent_test.exit_code !== 0) throw new Error('python_fixed_test_failed');
      const cross = await new Hexagon(base, token).submit(pythonSession.id, 'Describe the previous changes in one English sentence. Do not call tools.', 'ts-cross');
      evidence.ts_cross_language = await waitRun(cross.id);
      if (evidence.ts_cross_language.state !== 'completed') throw new Error('ts_cross_language_failed');
      await new Hexagon(base, token).close(pythonSession.id);
    }
  }
  if (process.env.HEXAGON_ACTIVE_CANCEL === '1') {
    evidence.active_cancellation = await checkActiveCancellation(new Hexagon(base, token), connector, bound.sandbox.id, session.id);
    await save();
  }
  if (serialSdks) {
    evidence.cancelled_run=evidence.python.ts_cancelled_run;
    if(!evidence.cancelled_run || (await api('GET',`/runs/${evidence.cancelled_run}`)).state!=='cancelled')throw new Error('serial_ts_cancellation_missing');
  } else {
  const cancelled = await new Hexagon(base, token).submit(session.id, 'Run sleep 120 and reply only after it finishes.', 'ts-cancel');
  await new Hexagon(base, token).cancel(cancelled.id);
  const cancellationResult = await waitRun(cancelled.id);
  if (cancellationResult.state !== 'cancelled') throw new Error('ts_cancellation_failed');
  evidence.cancelled_run = cancelled.id;
  }
  const connectionCheck = process.env.HEXAGON_CONNECTION_LIFECYCLE === '1'
    ? await checkConnectionLifecycle(new Hexagon(base, token), { connection: sandbox, session, agent, model, tools: toolBindings, credential: providerKey,
      alternateConfig: provider === 'instabox' ? { template: 'ci' } : provider === 'boat' ? { size: 'default' } : provider === 'fly-machines' ? { organization: 'personal', region: 'ord' } : provider === 'freestyle' ? { snapshot: 'freestyle/ubuntu' } : provider === 'agent37' ? { region: 'eu' } : provider === 'vercel' ? { ...providerConfig, vcpus: 4 } : provider === 'upstash' ? { size: 'medium' } : provider === 'modal' || provider === 'blaxel' || provider === 'sprites' ? { ...providerConfig, memory_mb: 4096 } : provider === 'e2b' ? { template: 'base' } : { ...providerConfig, snapshot: 'daytona-small' } })
    : undefined;
  if (connectionCheck) { evidence.connection_lifecycle = connectionCheck.result; evidence.stage = 'disabled_connection_cleanup'; await save(); }
  if (resourceFaults) {
    evidence.deletion_failures = [];
    for (let attempt = 0; attempt < 2; attempt++) {
      try { await api('POST', `/sessions/${session.id}/close`); throw new Error('expected_delete_uncertainty'); }
      catch (error) { if (!(error instanceof Error) || !error.message.includes('sandbox_deletion_unconfirmed')) throw error; }
      const row = (await api('GET', '/fleet')).sessions.find((item: any) => item.id === session.id);
      const deletion = row.resource_operations.find((item: any) => item.kind === 'delete');
      if (row.state !== 'closing' || deletion?.state !== 'unknown') throw new Error('delete_uncertainty_not_visible');
      const exists = !!await connector.inspect(bound.sandbox.id);
      if (exists !== (attempt === 0)) throw new Error('delete_fault_not_injected');
      evidence.deletion_failures.push({ attempt, session_state: row.state, operation: deletion, provider_exists: exists });
      await save();
    }
  }
  await api('POST', `/sessions/${session.id}/close`);
  if (resourceFaults) {
    const row = (await api('GET', '/fleet')).sessions.find((item: any) => item.id === session.id);
    const operations = row.resource_operations;
    if (!evidence.creation_uncertainty || row.state !== 'closed' || operations.length !== 2 || operations.some((item: any) => item.state !== 'completed') || resourceFaults.evidence.creates !== 1 || resourceFaults.evidence.actual_deletes !== 1 || resourceFaults.evidence.delete_attempts !== 2 || resourceFaults.evidence.created_resource !== bound.sandbox.id) throw new Error('resource_reconciliation_invariants_failed');
    evidence.resource_operations = operations;
  }
  if (await connector.inspect(bound.sandbox.id)) throw new Error('resource_not_deleted');
  for (const [id, hash] of Object.entries(downloaded)) {
    if (createHash('sha256').update(await artifactClient.downloadArtifact(id)).digest('hex') !== hash) throw new Error('artifact_not_retained');
  }
  evidence.artifacts_retained_after_close = true;
  if (previewRequest) { if ((await previewRequest()).status !== 401) throw new Error('preview_survived_close'); evidence.preview.closed_access_denied = true; }
  const retained = await api('GET', `/runs/${run.id}`);
  if (retained.output.text !== result.output.text) throw new Error('result_not_retained');
  if (connectionCheck) evidence.connection_lifecycle = await connectionCheck.verifyAfterClose();
  else await api('DELETE', `/connections/${sandbox.id}`);
  evidence.state = 'verified'; evidence.product_cleanup = 'confirmed';
  }
} catch (error) {
  evidence.state = 'failed'; evidence.error = error instanceof Error ? error.message : 'unknown'; process.exitCode = 1;
} finally {
  await worker.stop();
  await app.close();
  await accessTunnel?.close();
  await previewApp.close();
  await toolFixture.close();
  // Failure fallback only touches test-owned resources. It is not reported as
  // product cleanup success; retain DB rows/journal for diagnosis and recovery.
  try {
    const owned = (await pool.query("SELECT id,session_id,provider_resource_id FROM resource_operations WHERE tenant_id=$1 AND kind='create'", [tenant])).rows;
    const connector = makeConnector();
    for (const operation of owned) {
      const ids = operation.provider_resource_id ? [operation.provider_resource_id] : (await connector.findByOperation(operation.id)).map(r => r.id);
      for (const id of ids) { await connector.cleanupAssociatedResources?.(id); if (await connector.inspect(id)) await connector.destroy(id); if (await connector.inspect(id)) throw new Error('cleanup_unconfirmed'); }
    }
    evidence.resource_cleanup = 'confirmed';
  } catch { evidence.resource_cleanup = 'requires_reconciliation'; process.exitCode = 1; }
  try {
    if (provider === 'e2b' && await Template.exists(template, { apiKey: providerKey })) await Template.delete(template, { apiKey: providerKey });
    if (provider === 'e2b' && await Template.exists(template, { apiKey: providerKey })) throw new Error('template_remains');
    evidence.template_cleanup = provider === 'e2b' ? 'confirmed' : 'not_created';
  } catch { evidence.template_cleanup = 'requires_reconciliation'; process.exitCode = 1; }
  await unlink(`${file}.browser.json`).catch(() => {});
  await unlink(`${file}.authorization.json`).catch(() => {});
  evidence.finished_at = new Date().toISOString(); await save(); await pool.end();
  console.log(JSON.stringify({ file, state: evidence.state, error: evidence.error, resource_cleanup: evidence.resource_cleanup, template_cleanup: evidence.template_cleanup }));
}

function pythonJourney(config: unknown): Promise<any> {
  return new Promise((done, reject) => {
    const child = spawn('python3', ['testing/python-cloud-client.py'], { env: { ...process.env, PYTHONPATH: resolve('sdk/python') }, stdio: ['pipe', 'pipe', 'pipe'] });
    let output = '';
    child.stdout.on('data', chunk => { output += chunk; });
    child.stderr.resume();
    child.on('error', reject);
    child.on('close', code => { if (code !== 0) reject(new Error(`python_cloud_client_exit_${code}`)); else { try { done(JSON.parse(output)); } catch (error) { reject(error); } } });
    child.stdin.end(JSON.stringify(config));
  });
}

function pythonWebJourney(config: unknown, checkpoint: (value: any) => Promise<void>): Promise<any> {
  return new Promise((done, reject) => {
    const child = spawn('python3', ['testing/python-web-client.py'], { env: { ...process.env, PYTHONPATH: resolve('sdk/python') }, stdio: ['pipe','pipe','pipe'] });
    let pending = '', result: any, stderr = '', failure: Error | undefined;
    let handling = Promise.resolve();
    child.stdout.on('data', chunk => {
      pending += chunk;
      let end: number;
      while ((end = pending.indexOf('\n')) !== -1) {
        const line = pending.slice(0, end); pending = pending.slice(end + 1);
        handling = handling.then(async () => {
          const message = JSON.parse(line);
          if (message.checkpoint) { await checkpoint(message.checkpoint); child.stdin.write(JSON.stringify({ verified: true }) + '\n'); }
          if (message.result) result = message.result;
        }).catch(error => { failure = error; child.kill('SIGTERM'); });
      }
    });
    child.stderr.on('data', chunk => { stderr = (stderr + chunk).slice(-4000); });
    child.on('error', reject);
    child.on('close', async code => {
      await handling;
      if (failure) reject(failure);
      else if (code !== 0 || !result) {
        evidence.python_failure_location = stderr.split('\n').filter(line => /File .*line [0-9]+/.test(line));
        reject(new Error(`python_web_client_exit_${code}`));
      } else done(result);
    });
    child.stdin.write(JSON.stringify(config) + '\n');
  });
}
