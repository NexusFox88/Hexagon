// Browser-test bridge: decrypt only a scoped local checkpoint in memory.
// Never log the returned object or persist its credential fields.
import { readFile } from 'node:fs/promises';
import { createDecipheriv } from 'node:crypto';
import pg from 'pg';
export async function readGuiCheckpoint(path) {
  const ref = JSON.parse(await readFile(path, 'utf8'));
  if (!/^hexagon_smoke_[a-f0-9]+$/.test(ref.schema) || !ref.purpose.startsWith('gui-checkpoint:')) throw new Error('Invalid checkpoint scope');
  const url = new URL('postgres://hexagon@127.0.0.1:55432/hexagon');
  url.searchParams.set('options', `-c search_path=${ref.schema}`);
  const pool = new pg.Pool({ connectionString: url.toString() });
  try {
    const row = (await pool.query('SELECT envelope FROM secrets WHERE tenant_id=$1 AND id=$2 AND purpose=$3', [ref.tenant, ref.secret_id, ref.purpose])).rows[0];
    if (!row) throw new Error('Checkpoint unavailable');
    const key = await readFile(path.replace(/\.json\.(setup|authorization|browser)\.json$/, '.key'));
    const cipher = createDecipheriv('aes-256-gcm', key, Buffer.from(row.envelope.iv, 'base64'));
    cipher.setAAD(Buffer.from(JSON.stringify([ref.tenant, ref.secret_id, ref.purpose])));
    cipher.setAuthTag(Buffer.from(row.envelope.tag, 'base64'));
    return JSON.parse(Buffer.concat([cipher.update(Buffer.from(row.envelope.data, 'base64')), cipher.final()]).toString('utf8'));
  } finally { await pool.end(); }
}
