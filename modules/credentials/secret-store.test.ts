import { describe, it, expect } from 'vitest';
import { randomBytes } from 'node:crypto';
import { SecretCipher } from './secret-store.js';

describe('credential encryption boundary', () => {
  it('roundtrips without exposing the plaintext in the stored envelope', () => {
    const cipher = new SecretCipher(randomBytes(32));
    const sealed = cipher.seal('test-token', 'tenant-a/secret/model');
    expect(JSON.stringify(sealed)).not.toContain('test-token');
    expect(cipher.open(sealed, 'tenant-a/secret/model')).toBe('test-token');
    expect(cipher.seal('test-token', 'tenant-a/secret/model')).not.toEqual(sealed);
  });
  it('rejects cross-tenant substitution, purpose substitution and ciphertext tampering', () => {
    const cipher = new SecretCipher(randomBytes(32));
    const sealed = cipher.seal('test-token', 'tenant-a/secret/model');
    expect(() => cipher.open(sealed, 'tenant-b/secret/model')).toThrow();
    expect(() => cipher.open(sealed, 'tenant-a/secret/provider')).toThrow();
    const data = Buffer.from(sealed.data, 'base64');
    data[0] = data[0]! ^ 1;
    expect(() => cipher.open({ ...sealed, data: data.toString('base64') }, 'tenant-a/secret/model')).toThrow();
  });
});
