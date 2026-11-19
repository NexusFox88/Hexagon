import { createHash, randomUUID } from 'node:crypto';
import { spawn } from 'node:child_process';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { Artifacts } from './artifacts.js';
import { openDatabase } from '../storage/database.js';
import { tokenDigest } from '../credentials/api-auth.js';
import { createServer } from '../../apps/control-plane/server.js';
import { Hexagon } from '../../sdk/typescript/index.js';

describe.skipIf(!process.env.TEST_DATABASE_URL)('Durable artifacts through both SDKs', () => {
  it('verifies bytes, deduplicates exports, denies other tenants, and retains bytes after Session closure', async () => {
    const pool = openDatabase(process.env.TEST_DATABASE_URL!);
    const tenant = `artifacts-${randomUUID()}`, other = `other-${tenant}`;
    const token = randomUUID(), otherToken = randomUUID(), session = randomUUID(), run = randomUUID();
    const lease = { tenant_id: tenant, id: run, generation: 1, lease_owner: 'artifact-test' };
    const store = new Artifacts(pool);
    const app = createServer(pool);
    const bytes = Buffer.from([0, 255, 10, 13, 65]);
    const exported = { name: 'reports/result.bin', content_base64: bytes.toString('base64'), sha256: createHash('sha256').update(bytes).digest('hex') };
    try {
      await pool.query('INSERT INTO tenants(id,name) VALUES($1,$1),($2,$2)', [tenant, other]);
      await pool.query("INSERT INTO api_keys(digest,tenant_id,label) VALUES($1,$2,'test'),($3,$4,'test')", [tokenDigest(token), tenant, tokenDigest(otherToken), other]);
      await pool.query("INSERT INTO connections(tenant_id,id,kind,provider,name) VALUES($1,'s','sandbox','fixture','fixture'),($1,'m','model','fixture','fixture')", [tenant]);
      await pool.query("INSERT INTO agents(tenant_id,id,name,definition) VALUES($1,'a','fixture','{}')", [tenant]);
      await pool.query("INSERT INTO sessions(tenant_id,id,agent_id,sandbox_connection_id,model_connection_id,definition) VALUES($1,$2,'a','s','m','{}')", [tenant, session]);
      await pool.query("INSERT INTO runs(tenant_id,id,session_id,idempotency_key,request_hash,input,state,lease_owner,lease_until,generation) VALUES($1,$2,$3,'fixture','fixture','fixture','running','artifact-test',now()+interval '1 minute',1)", [tenant, run, session]);
      await expect(store.capture(lease, { files: [{ ...exported, sha256: '0'.repeat(64) }] })).rejects.toMatchObject({ code: 'artifact_integrity_failed' });
      await expect(store.capture(lease, { files: [{ ...exported, name: '../secret' }] })).rejects.toThrow();
      const first = await store.capture(lease, { files: [exported] });
      expect(await store.capture(lease, { files: [exported] })).toEqual(first);
      expect((await pool.query("SELECT 1 FROM events WHERE tenant_id=$1 AND type='artifact.created'", [tenant])).rowCount).toBe(1);
      await expect(store.capture({ ...lease, generation: 2 }, { files: [exported] })).rejects.toMatchObject({ code: 'lease_lost' });
      const base = await app.listen({ host: '127.0.0.1', port: 0 });
      const sdk = new Hexagon(base, token), outsider = new Hexagon(base, otherToken);
      const listed = await sdk.artifacts(run);
      expect(listed.artifacts).toHaveLength(1);
      const id = listed.artifacts[0]!.id;
      expect(Buffer.from(await sdk.downloadArtifact(id))).toEqual(bytes);
      await expect(outsider.downloadArtifact(id)).rejects.toMatchObject({ status: 404 });
      await expect(outsider.artifacts(run)).rejects.toMatchObject({ status: 404 });
      await pool.query("UPDATE runs SET state='completed' WHERE tenant_id=$1 AND id=$2", [tenant, run]);
      await pool.query("UPDATE sessions SET state='closed',sandbox=NULL WHERE tenant_id=$1 AND id=$2", [tenant, session]);
      expect(Buffer.from(await sdk.downloadArtifact(id))).toEqual(bytes);
      const python = await new Promise<string>((done, reject) => {
        const child = spawn('python3', ['-c', 'import json,sys,hashlib; from hexagon import Hexagon; c=json.load(sys.stdin); sdk=Hexagon(c["base"],c["token"]); items=sdk.artifacts(c["run"])["artifacts"]; assert len(items)==1; print(hashlib.sha256(sdk.download_artifact(items[0]["id"])).hexdigest())'], { env: { ...process.env, PYTHONPATH: resolve('sdk/python') }, stdio: ['pipe', 'pipe', 'pipe'] });
        let stdout = ''; child.stdout.on('data', chunk => { stdout += chunk; }); child.stderr.resume();
        child.on('error', reject); child.on('close', code => code === 0 ? done(stdout.trim()) : reject(new Error(`python_exit_${code}`)));
        child.stdin.end(JSON.stringify({ base, token, run }));
      });
      expect(python).toBe(exported.sha256);
    } finally {
      await app.close();
      for (const table of ['artifacts','events','runs','sessions','agents','connections','api_keys','tenants']) await pool.query(`DELETE FROM ${table} WHERE ${table === 'tenants' ? 'id' : 'tenant_id'} IN ($1,$2)`, [tenant, other]);
      await pool.end();
    }
  });
});
