import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { openDatabase } from '../modules/storage/database.js';
import { SecretCipher, SecretStore } from '../modules/credentials/secret-store.js';
import { tokenDigest } from '../modules/credentials/api-auth.js';
import { Connections, type ConnectionAdapter } from '../modules/connections/connections.js';
import { Sessions } from '../modules/execution/sessions.js';
import { HarnessRegistry } from '../modules/execution/harness.js';
import { HarnessPackages } from '../modules/execution/harness-packages.js';
import { Runs } from '../modules/execution/runs.js';
import { Artifacts } from '../modules/artifacts/artifacts.js';
import { SandboxLifecycle } from '../modules/sandboxes/lifecycle.js';
import { Previews } from '../modules/sandboxes/previews.js';
import { createServer } from '../apps/control-plane/server.js';
import { Hexagon } from '../sdk/typescript/index.js';

describe.skipIf(!process.env.TEST_DATABASE_URL)('Tenant boundaries over actual HTTP', () => {
  it('denies foreign reads, streams, mutations and bindings without remote side effects', async () => {
    const pool = openDatabase(process.env.TEST_DATABASE_URL!);
    const owner = randomUUID(), outsider = randomUUID();
    const ownerToken = randomUUID(), outsiderToken = randomUUID();
    const secretValue = `private-credential-${randomUUID()}`;
    const privateText = `private-artifact-${randomUUID()}`;
    const secrets = new SecretStore(pool, new SecretCipher(randomBytes(32)));
    let validations = 0, remoteAccess = 0;
    const adapters: ConnectionAdapter[] = ['sandbox', 'model', 'tool'].map(kind => ({
      kind: kind as ConnectionAdapter['kind'], provider: 'fixture', config: z.object({}).strict(), capabilities: ['preview'],
      async validate() { validations++; return { operations: ['fixture'] }; },
    }));
    const connections = new Connections(pool, secrets, adapters);
    const registry = new HarnessRegistry([{ definition: { id: 'fixture', version: '1', capabilities: ['tools'], model_providers: ['fixture'] },
      async install() { throw new Error('not used'); }, invocation() { throw new Error('not used'); }, result() { throw new Error('not used'); } }], new HarnessPackages(pool));
    const sessions = new Sessions(pool, connections, registry);
    const lifecycle = new SandboxLifecycle(pool, secrets, () => { remoteAccess++; throw new Error('Unexpected provider access'); });
    const previews = new Previews(pool, lifecycle);
    const app = createServer(pool, { connections, sessions, lifecycle, previews });
    try {
      await pool.query('INSERT INTO tenants(id,name) VALUES($1,$1),($2,$2)', [owner, outsider]);
      await pool.query("INSERT INTO api_keys(digest,tenant_id,label) VALUES($1,$2,'owner'),($3,$4,'outsider')", [tokenDigest(ownerToken), owner, tokenDigest(outsiderToken), outsider]);
      const base = await app.listen({ host: '127.0.0.1', port: 0 });
      const a = new Hexagon(base, ownerToken), b = new Hexagon(base, outsiderToken);
      async function setup(client: Hexagon) {
        const ids: Record<string, string> = {};
        for (const kind of ['sandbox', 'model', 'tool']) {
          const c = await client.createConnection({ kind, provider: 'fixture', name: kind, credential: secretValue });
          expect(JSON.stringify(c)).not.toContain(secretValue);
          await client.validateConnection(c.id); await client.updateConnection(c.id, { enabled: true }); ids[kind] = c.id;
        }
        const agent = await client.createAgent({ name: 'Owned agent', harness: { id: 'fixture', version: '1' }, tools: [{ name: 'reports' }] });
        const input = { agent_id: agent.id, sandbox_connection_id: ids.sandbox!, model_connection_id: ids.model!, tools: { reports: ids.tool! } };
        const session = await client.createSession(input);
        return { ids, agent, session, input };
      }
      const owned = await setup(a), other = await setup(b);
      await expect(b.agent(owned.agent.id)).rejects.toMatchObject({code:'agent_not_found'});
      await expect(b.archiveAgent(owned.agent.id)).rejects.toMatchObject({code:'agent_not_found'});
      await expect(b.copyAgent(owned.agent.id,'foreign')).rejects.toMatchObject({code:'agent_not_found'});
      await expect(b.createAgent({name:'foreign binding',harness:{id:'fixture',version:'1'},bindings:{sandbox_connection_id:owned.ids.sandbox!,model_connection_id:other.ids.model!}})).rejects.toMatchObject({code:'connection_not_found'});

      await a.upload(owned.session.id, [{ path: 'private.txt', content_base64: Buffer.from(privateText).toString('base64') }]);
      const run = await a.submit(owned.session.id, 'Owner task', 'owner-task');
      const runs = new Runs(pool);
      const lease = await runs.claim('boundary-fixture');
      expect(lease.id).toBe(run.id);
      await runs.advance(lease, 'provisioning'); await runs.advance(lease, 'running');
      const artifacts = await new Artifacts(pool).capture(lease, { files: [{ name: 'private.txt', content_base64: Buffer.from(privateText).toString('base64'), sha256: createHash('sha256').update(privateText).digest('hex') }] });
      const artifact = artifacts[0]!;
      const approval = await runs.requestApproval(lease, { tool: 'reports', operation: 'write' });
      await pool.query('UPDATE sessions SET sandbox=$3 WHERE tenant_id=$1 AND id=$2', [owner, owned.session.id, { id: 'controlled-fixture-resource', state: 'running' }]);
      const preview = await a.createPreview(owned.session.id, 3000);
      const beforeValidations = validations;
      const requests: Array<[string, string, unknown?]> = [
        ['GET', `/connections/${owned.ids.sandbox}`], ['PATCH', `/connections/${owned.ids.sandbox}`, { credential: 'foreign-replacement' }],
        ['POST', `/connections/${owned.ids.sandbox}/validate`], ['DELETE', `/connections/${owned.ids.sandbox}`],
        ['GET', `/sessions/${owned.session.id}`], ['GET', `/sessions/${owned.session.id}/files`],
        ['POST', `/sessions/${owned.session.id}/files`, { files: [{ path: 'attack.txt', content_base64: '' }] }],
        ['GET', `/sessions/${owned.session.id}/runs`], ['POST', `/sessions/${owned.session.id}/runs`, { input: 'Foreign task' }],
        ['POST', `/sessions/${owned.session.id}/close`], ['POST', `/sessions/${owned.session.id}/previews`, { port: 3000 }],
        ['DELETE', `/previews/${preview.id}`], ['GET', `/runs/${run.id}`], ['POST', `/runs/${run.id}/cancel`],
        ['GET', `/runs/${run.id}/events`], ['GET', `/runs/${run.id}/stream`], ['GET', `/runs/${run.id}/artifacts`],
        ['GET', `/artifacts/${artifact.id}/content`], ['GET', `/runs/${run.id}/tool-calls`],
        ['POST', `/approvals/${approval}/decision`, { approved: true }],
        ['POST', `/runs/${run.id}/tool-calls/${randomUUID()}/resolve`, { request_hash: '0'.repeat(64), outcome: 'failed', text: 'Foreign resolution', evidence: 'Fixture' }],
      ];
      for (const [method, path, body] of requests) {
        for (const token of [outsiderToken, undefined]) {
          const response = await fetch(`${base}/v1${path}`, { method, headers: { ...(token ? { authorization: `Bearer ${token}` } : {}), ...(body === undefined ? {} : { 'content-type': 'application/json' }), 'idempotency-key': 'foreign' }, body: body === undefined ? undefined : JSON.stringify(body), signal: AbortSignal.timeout(5000) });
          expect(response.status, `${method} ${path} with ${token ? 'other tenant' : 'no identity'}`).toBe(token ? 404 : 401);
          const text = await response.text();
          expect(text).not.toContain(privateText); expect(text).not.toContain(secretValue);
          expect(response.headers.get('content-type')).not.toContain('text/event-stream');
        }
      }
      for (const foreignInput of [
        { ...other.input, agent_id: owned.agent.id }, { ...other.input, sandbox_connection_id: owned.ids.sandbox! },
        { ...other.input, model_connection_id: owned.ids.model! }, { ...other.input, tools: { reports: owned.ids.tool! } },
      ]) await expect(b.createSession(foreignInput)).rejects.toMatchObject({ status: 404 });
      expect((await b.request('GET', '/connections')).connections.map((row: any) => row.id).sort()).toEqual(Object.values(other.ids).sort());
      expect((await b.request('GET', '/sessions')).sessions.map((row: any) => row.id)).toEqual([other.session.id]);
      expect((await b.request('GET', '/fleet')).sessions.map((row: any) => row.id)).toEqual([other.session.id]);
      expect((await b.listRuns()).runs).toEqual([]);expect((await b.pending()).items).toEqual([]);expect(await b.overview()).toMatchObject({open_sessions:1,pending_approvals:0,active_runs:0});
      expect((await b.listSessions({search:owned.session.id})).sessions).toEqual([]);
      await expect(b.request('GET',`/connections/${owned.ids.sandbox}/dependencies`)).rejects.toMatchObject({status:404});
      expect((await b.request('GET', '/agents')).agents.map((row: any) => row.id)).toEqual([other.agent.id]);
      await a.registerHarnessPackage({ id: 'custom.owner-only', version: '1', protocol: 'hexagon-json-v1', interpreter: 'python3', entrypoint: 'main.py', model_providers: ['anthropic-compatible'], files: [{ path: 'main.py', content: '# inert fixture' }] });
      expect((await a.catalog()).harnesses.some((h: any) => h.id === 'custom.owner-only')).toBe(true);
      expect((await b.catalog()).harnesses.some((h: any) => h.id === 'custom.owner-only')).toBe(false);
      await expect(b.createAgent({ name: 'Foreign package', harness: { id: 'custom.owner-only', version: '1' } })).rejects.toMatchObject({ code: 'unsupported_harness' });
      expect(validations).toBe(beforeValidations); expect(remoteAccess).toBe(0);
      expect((await a.run(run.id)).state).toBe('waiting_approval');
      expect(Buffer.from(await a.downloadArtifact(artifact.id)).toString()).toBe(privateText);
      expect((await a.request('GET', `/connections/${owned.ids.sandbox}`)).version).toBe(2);
      const ticket = new URL(preview.url);
      expect((await previews.authorize(ticket.hostname, ticket.searchParams.get('ticket')!)).id).toBe(preview.id);
      expect((await pool.query('SELECT state FROM approvals WHERE tenant_id=$1 AND id=$2', [owner, approval])).rows[0].state).toBe('pending');
      expect((await pool.query('SELECT count(*)::int AS count FROM sessions WHERE tenant_id=$1', [outsider])).rows[0].count).toBe(1);
    } finally {
      await app.close();
      for (const table of ['preview_grants', 'artifacts', 'tool_calls', 'events', 'approvals', 'runs', 'session_inputs', 'session_tools', 'sessions', 'agents', 'connections', 'secrets', 'api_keys', 'harness_packages', 'tenants']) await pool.query(`DELETE FROM ${table} WHERE ${table === 'tenants' ? 'id' : 'tenant_id'}=ANY($1::text[])`, [[owner, outsider]]);
      await pool.end();
    }
  }, 20000);
});
