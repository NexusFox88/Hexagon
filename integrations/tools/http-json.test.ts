import { afterEach, describe, expect, it, vi } from 'vitest';
import { httpToolConfig, httpToolConnection, validToolArguments } from './http-json.js';
afterEach(() => vi.unstubAllGlobals());

describe('HTTP tool input contract', () => {
  it('validates nested input without coercion or stripping extra fields', () => {
    const schema = { type: 'object', properties: { report: { type: 'object', properties: { passed: { type: 'boolean' }, count: { type: 'integer', minimum: 0 } }, required: ['passed', 'count'], additionalProperties: false } }, required: ['report'], additionalProperties: false };
    expect(validToolArguments(schema, { report: { passed: true, count: 2 } })).toBe(true);
    const invalid = { report: { passed: 'true', count: 2, extra: 'must not disappear' } };
    expect(validToolArguments(schema, invalid)).toBe(false);
    expect(invalid.report.extra).toBe('must not disappear');
    expect(validToolArguments(schema, { report: { passed: true, count: -1 } })).toBe(false);
    expect(validToolArguments(schema, {})).toBe(false);
  });
  it('rejects invalid schemas and unresolved remote refs during registration', () => {
    const config = (input_schema: unknown) => ({ base_url: 'https://tools.example.test', operations: { read: { path: '/read', method: 'GET', description: 'Read', input_schema } } });
    expect(httpToolConfig.safeParse(config({ type: 'object', properties: { x: { type: 'invented' } } })).success).toBe(false);
    expect(httpToolConfig.safeParse(config({ type: 'object', $ref: 'https://schema.example.test/input' })).success).toBe(false);
    expect(httpToolConfig.safeParse(config({ type: 'object', $async: true })).success).toBe(false);
    expect(httpToolConfig.safeParse(config({ type: 'object', properties: {}, additionalProperties: false })).success).toBe(true);
  });
});

describe('Tool verification identity', () => {
  const config = { base_url: 'https://tools.example.test', operations: {} };
  it('returns only bounded identity and scope, discarding unrelated response fields', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(Response.json({ account: 'local-account', scope: ['requirements:read', 'reports:write'], token: 'private-token', raw: { secret: 'hidden' } })));
    expect(await httpToolConnection.validate(config, 'private-token')).toEqual({ account: 'local-account', scope: ['requirements:read', 'reports:write'], operations: ['authenticated_verification_endpoint'] });
  });
  it('does not expose echoed credentials or control characters as metadata', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(Response.json({ account: 'Bearer private-token', scope: ['read', 'private-token', 'line\nbreak'] })));
    expect(await httpToolConnection.validate(config, 'private-token')).toEqual({ operations: ['authenticated_verification_endpoint'] });
  });
  it('retains authentication-only compatibility while bounding oversized metadata', async () => {
    const fetch = vi.fn().mockResolvedValueOnce(new Response(null, { status: 204 }))
      .mockResolvedValueOnce(Response.json({ account: 'a'.repeat(17000) })); vi.stubGlobal('fetch', fetch);
    for (let i = 0; i < 2; i++) expect(await httpToolConnection.validate(config, 'private-token')).toEqual({ operations: ['authenticated_verification_endpoint'] });
  });
});
