import { createCipheriv, createDecipheriv, randomBytes, randomUUID } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import type pg from 'pg';

export interface Envelope { version: 1; iv: string; tag: string; data: string }
export class SecretCipher {
  constructor(private readonly key: Buffer) {
    if (key.length !== 32) throw new Error('Secret encryption key must contain 32 bytes');
  }
  seal(value: string, context: string): Envelope {
    const iv = randomBytes(12);
    const cipher = createCipheriv('aes-256-gcm', this.key, iv);
    cipher.setAAD(Buffer.from(context));
    const data = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()]);
    return { version: 1, iv: iv.toString('base64'), tag: cipher.getAuthTag().toString('base64'), data: data.toString('base64') };
  }
  open(envelope: Envelope, context: string): string {
    if (envelope.version !== 1) throw new Error('Unsupported secret envelope');
    const cipher = createDecipheriv('aes-256-gcm', this.key, Buffer.from(envelope.iv, 'base64'));
    cipher.setAAD(Buffer.from(context));
    cipher.setAuthTag(Buffer.from(envelope.tag, 'base64'));
    return Buffer.concat([cipher.update(Buffer.from(envelope.data, 'base64')), cipher.final()]).toString('utf8');
  }
}
export async function loadLocalCipher(path: string): Promise<SecretCipher> {
  await mkdir(dirname(path), { recursive: true, mode: 0o700 });
  try { await writeFile(path, randomBytes(32), { flag: 'wx', mode: 0o600 }); }
  catch (error) { if ((error as NodeJS.ErrnoException).code !== 'EEXIST') throw error; }
  return new SecretCipher(await readFile(path));
}
export class SecretStore {
  constructor(private readonly db: pg.Pool, private readonly cipher: SecretCipher) {}
  async health(tenant: string) {
    try {
      const context = JSON.stringify([tenant, 'health']);
      if (this.cipher.open(this.cipher.seal('credential-backend-check', context), context) !== 'credential-backend-check') throw new Error('cipher_check_failed');
      const sample = (await this.db.query('SELECT id,purpose,envelope FROM secrets WHERE tenant_id=$1 ORDER BY id DESC LIMIT 1', [tenant])).rows[0];
      if (sample) this.cipher.open(sample.envelope, JSON.stringify([tenant, sample.id, sample.purpose]));
      return { state: 'ready', check: sample ? 'roundtrip_and_stored_record' : 'roundtrip' };
    } catch { return { state: 'unavailable' }; }
  }
  async save(tenant: string, purpose: string, value: string, db: Pick<pg.PoolClient, 'query'> = this.db): Promise<string> {
    const id = randomUUID();
    const envelope = this.cipher.seal(value, JSON.stringify([tenant, id, purpose]));
    await db.query('INSERT INTO secrets(tenant_id,id,purpose,envelope) VALUES($1,$2,$3,$4)', [tenant,id,purpose,envelope]);
    return id;
  }
  async read(tenant: string, id: string, purpose: string, db: Pick<pg.PoolClient, 'query'> = this.db): Promise<string> {
    const result = await db.query('SELECT envelope FROM secrets WHERE tenant_id=$1 AND id=$2 AND purpose=$3', [tenant,id,purpose]);
    if (!result.rows[0]) throw new Error('Secret not found for this scope and purpose');
    return this.cipher.open(result.rows[0].envelope, JSON.stringify([tenant,id,purpose]));
  }
}
