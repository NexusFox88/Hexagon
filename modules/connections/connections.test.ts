import { randomBytes, randomUUID } from 'node:crypto';
import { beforeAll, afterAll, describe, it, expect } from 'vitest';
import { z } from 'zod';
import { openDatabase } from '../storage/database.js';
import { SecretCipher, SecretStore } from '../credentials/secret-store.js';
import { Connections, type ConnectionAdapter } from './connections.js';
import { Sessions } from '../execution/sessions.js';
import { SandboxLifecycle } from '../sandboxes/lifecycle.js';
import type { SandboxConnector, SandboxResource } from '../sandboxes/connector.js';
import { createServer } from '../../apps/control-plane/server.js';
import { tokenDigest } from '../credentials/api-auth.js';

const url = process.env.TEST_DATABASE_URL;
describe.skipIf(!url)('Connection and Session boundaries', () => {
  const pool = openDatabase(url ?? '');
  const tenant = `test-${randomUUID()}`;
  const token = randomUUID();
  const store = new SecretStore(pool, new SecretCipher(randomBytes(32)));
  const adapters: ConnectionAdapter[] = ['sandbox', 'model', 'tool'].map(kind => ({
    kind: kind as ConnectionAdapter['kind'], provider: 'fixture', config: z.object({}).strict(),
    capabilities: kind === 'sandbox' ? ['files', 'preview'] : [],
    async validate(_config, credential) { if (credential !== 'fixture-valid') throw new Error('invalid'); return { operations: ['fixture_authenticated'] }; },
  }));
  const connections = new Connections(pool, store, adapters);
  const sessions = new Sessions(pool, connections, [{ id: 'fixture', version: '1', capabilities: ['tools'], model_providers: ['fixture'] }]);
  beforeAll(async () => { await pool.query('INSERT INTO tenants(id,name) VALUES($1,$1)', [tenant]); await pool.query("INSERT INTO api_keys(digest,tenant_id,label) VALUES($1,$2,'test')", [tokenDigest(token), tenant]); });
  afterAll(async () => {
    for (const table of ['resource_operations', 'session_tools', 'sessions', 'agents', 'connections', 'secrets', 'api_keys', 'tenants']) await pool.query(`DELETE FROM ${table} WHERE ${table === 'tenants' ? 'id' : 'tenant_id'}=$1`, [tenant]);
    await pool.end();
  });
  async function ready(kind: ConnectionAdapter['kind']) {
    const row = await connections.create(tenant, { kind, provider: 'fixture', name: kind, credential: 'fixture-valid' });
    expect(row.status).toBe('draft');
    expect(row.secret_id).toBeNull();
    await connections.validate(tenant, row.id);
    return connections.patch(tenant, row.id, { enabled: true });
  }
  it('validates and enables a connection through authenticated HTTP and classifies malformed JSON', async () => {
    const app = createServer(pool, { connections, sessions });
    const headers = { authorization: `Bearer ${token}` };
    try {
      const consolePage = await app.inject({ url: '/console/' });
      expect(consolePage.statusCode).toBe(200);
      expect(consolePage.headers['content-security-policy']).toContain("script-src 'self'");
      expect(consolePage.body).toContain('data-view="runtime"');
      expect(consolePage.body).toContain('data-view="tools"');
      expect((await app.inject({ url: '/v1/fleet' })).statusCode).toBe(401);
      expect((await app.inject({ url: '/v1/fleet', headers })).json().sessions).toEqual([]);
      const created = await app.inject({ method: 'POST', url: '/v1/connections', headers, payload: { kind: 'sandbox', provider: 'fixture', name: 'HTTP', credential: 'fixture-valid' } });
      expect(created.statusCode).toBe(201);
      const id = created.json().id;
      const verified = await app.inject({ method: 'POST', url: `/v1/connections/${id}/validate`, headers });
      expect(verified.statusCode).toBe(200);
      expect(verified.json().status).toBe('ready');
      expect((await app.inject({ method: 'PATCH', url: `/v1/connections/${id}`, headers, payload: { enabled: true } })).json().enabled).toBe(true);
      expect((await app.inject({ method: 'POST', url: `/v1/connections/${id}/validate`, headers: { ...headers, 'content-type': 'application/json' } })).statusCode).toBe(400);
    } finally { await app.close(); }
  });
  it('requires validation, pins configuration, blocks deletion and preserves credentials', async () => {
    const sandbox = await ready('sandbox');
    const model = await ready('model');
    const tool = await connections.create(tenant, { kind: 'tool', provider: 'fixture', name: 'report' });
    await expect(connections.patch(tenant, tool.id, { enabled: true })).rejects.toMatchObject({ code: 'validation_required' });
    expect((await connections.validate(tenant, tool.id)).status).toBe('invalid');
    const agent = await sessions.createAgent(tenant, { name: 'fixture', harness: { id: 'fixture', version: '1' }, tools: [{ name: 'report', required_at_start: false }], required_capabilities: ['files', 'tools'] });
    const input = { agent_id: agent.id, sandbox_connection_id: sandbox.id, model_connection_id: model.id, tools: { report: tool.id } };
    const session = await sessions.create(tenant, input);
    expect(session.definition.connections.find((c: { id: string }) => c.id === sandbox.id).version).toBe(sandbox.version);
    await expect(connections.remove(tenant, sandbox.id)).rejects.toMatchObject({ code: 'connection_in_use' });
    await expect(connections.remove(tenant, tool.id)).rejects.toMatchObject({ code: 'connection_in_use' });
    await expect(sessions.create('other-tenant', input)).rejects.toMatchObject({ code: 'agent_not_found' });
    await expect(connections.get('other-tenant', sandbox.id)).rejects.toMatchObject({ status: 404 });
    await connections.patch(tenant, sandbox.id, { enabled: false });
    await expect(sessions.create(tenant, input)).rejects.toMatchObject({ code: 'connection_not_ready' });
    const rotated = await connections.patch(tenant, model.id, { credential: 'wrong' });
    expect(rotated.status).toBe('draft');
    expect(rotated.enabled).toBe(false);
    expect((await connections.validate(tenant, model.id)).status).toBe('invalid');
    await connections.patch(tenant, model.id, { credential: 'fixture-valid' });
    expect((await connections.validate(tenant, model.id)).status).toBe('ready');
    await pool.query("UPDATE sessions SET state='closed' WHERE tenant_id=$1 AND id=$2", [tenant, session.id]);
    const before = (await pool.query('SELECT count(*) FROM secrets WHERE tenant_id=$1', [tenant])).rows[0].count;
    await connections.remove(tenant, sandbox.id);
    await expect(connections.get(tenant, sandbox.id)).rejects.toMatchObject({ status: 404 });
    expect((await pool.query('SELECT count(*) FROM secrets WHERE tenant_id=$1', [tenant])).rows[0].count).toBe(before);
    expect((await sessions.get(tenant, session.id)).state).toBe('closed');
    const fleet = await sessions.fleet(tenant);
    expect(fleet.find(row => row.id === session.id)?.runtime_state).toBe('stopped');
    expect(JSON.stringify(fleet)).not.toContain('secret_id');
    expect(await sessions.fleet('other-tenant')).toEqual([]);
  });
  it('cannot validate a credential revision that changed during a remote check', async () => {
    let release!: () => void;
    let started!: () => void;
    const entered = new Promise<void>(resolve => { started = resolve; });
    const waiting = new Promise<void>(resolve => { release = resolve; });
    const slow = new Connections(pool, store, [{ ...adapters[0]!, async validate() { started(); await waiting; return { operations: ['old_revision'] }; } }]);
    const row = await slow.create(tenant, { kind: 'sandbox', provider: 'fixture', name: 'race', credential: 'old' });
    const pending = slow.validate(tenant, row.id);
    await entered;
    await slow.patch(tenant, row.id, { credential: 'new' });
    release();
    await expect(pending).rejects.toMatchObject({ code: 'connection_changed_during_validation' });
    expect((await slow.get(tenant, row.id)).status).toBe('draft');
  });

  it('rejects tool bindings for a harness that cannot execute tools before provisioning', async () => {
    const plain = new Sessions(pool, connections, [{ id: 'conversation-only', version: '1', capabilities: ['conversation'], model_providers: ['fixture'] }]);
    await expect(plain.createAgent(tenant, { name: 'unsupported tools', harness: { id: 'conversation-only', version: '1' }, tools: [{ name: 'report', required_at_start: false }] })).rejects.toMatchObject({ code: 'harness_tools_unsupported' });
    await expect(plain.createAgent(tenant, { name: 'unknown version', harness: { id: 'conversation-only', version: '2' } })).rejects.toMatchObject({ code: 'unsupported_harness' });
  });

  it('reconciles a lost create response and retries uncertain deletion after disabling the connection', async () => {
    const sandbox = await ready('sandbox');
    const model = await ready('model');
    const agent = await sessions.createAgent(tenant, { name: 'lifecycle', harness: { id: 'fixture', version: '1' } });
    const session = await sessions.create(tenant, { agent_id: agent.id, sandbox_connection_id: sandbox.id, model_connection_id: model.id });
    let resource: SandboxResource | null = null;
    let creates = 0;
    let matches: SandboxResource[] | undefined;
    let deleteResponseLost = true;
    let deletes = 0;
    let failDelete = true;
    const connector: SandboxConnector = {
      async create() { creates++; resource = { id: randomUUID(), state: 'running' }; throw new Error('response lost'); },
      async findByOperation() { return matches ?? (resource ? [resource] : []); },
      async inspect() { return resource; },
      async destroy() { deletes++; if (failDelete) throw new Error('temporary provider failure'); resource = null; if (deleteResponseLost) throw new Error('response lost after deletion'); },
      async execute() { throw new Error('not used'); }, async read() { throw new Error('not used'); },
      async write() { throw new Error('not used'); }, async preview() { throw new Error('not used'); },
    };
    const lifecycle = new SandboxLifecycle(pool, store, () => connector);
    await expect(lifecycle.provision(tenant, session.id)).rejects.toMatchObject({ code: 'sandbox_creation_unconfirmed' });
    expect((await pool.query('SELECT state FROM resource_operations WHERE tenant_id=$1 AND session_id=$2', [tenant, session.id])).rows[0].state).toBe('unknown');
    for (const found of [[], [{ id: 'one', state: 'running' }, { id: 'two', state: 'running' }]]) {
      matches = found;
      await expect(lifecycle.provision(tenant, session.id)).rejects.toMatchObject({ code: 'sandbox_creation_unconfirmed' });
      expect(creates).toBe(1);
      expect((await sessions.fleet(tenant)).find(row => row.id === session.id).resource_operations[0].state).toBe('unknown');
    }
    matches = undefined;
    const recovered = await lifecycle.provision(tenant, session.id);
    expect(recovered.id).toBeTruthy();
    expect(creates).toBe(1);
    await connections.patch(tenant, sandbox.id, { enabled: false });
    await expect(lifecycle.close(tenant, session.id)).rejects.toMatchObject({ code: 'sandbox_deletion_unconfirmed' });
    expect((await sessions.get(tenant, session.id)).state).toBe('closing');
    await expect(connections.remove(tenant, sandbox.id)).rejects.toMatchObject({ code: 'connection_in_use' });
    const failed = (await sessions.fleet(tenant)).find(row => row.id === session.id);
    expect(failed.resource_operations.find((operation: any) => operation.kind === 'delete')).toMatchObject({ state: 'unknown', reason: 'deletion_unconfirmed' });
    failDelete = false;
    await expect(lifecycle.close(tenant, session.id)).rejects.toMatchObject({ code: 'sandbox_deletion_unconfirmed' });
    expect(resource).toBeNull();
    expect((await sessions.get(tenant, session.id)).state).toBe('closing');
    deleteResponseLost = false;
    expect(await lifecycle.close(tenant, session.id)).toEqual({ state: 'closed' });
    expect(resource).toBeNull();
    expect(deletes).toBe(2);
    const operations = (await sessions.fleet(tenant)).find(row => row.id === session.id).resource_operations;
    expect(operations).toHaveLength(2);
    expect(operations.every((operation: any) => operation.state === 'completed' && operation.reason === null)).toBe(true);
    expect(await sessions.fleet('other-tenant')).toEqual([]);
    await connections.remove(tenant, sandbox.id);
    await expect(lifecycle.close('other-tenant', session.id)).rejects.toMatchObject({ status: 404 });
  });
});
