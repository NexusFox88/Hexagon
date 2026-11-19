import { describe, expect, it } from 'vitest';
import { HarnessRegistry, type HarnessAdapter } from './harness.js';
import { openCodeAdapter } from '../../integrations/harnesses/opencode.js';

describe('Harness registry boundary', () => {
  it('resolves exact pinned versions and rejects unknown versions without fallback', () => {
    const alternate: HarnessAdapter = { ...openCodeAdapter, definition: { ...openCodeAdapter.definition, id: 'custom', version: '2' }, result: () => ({ text: 'custom result', failed: false }) };
    const registry = new HarnessRegistry([openCodeAdapter, alternate]);
    expect(registry.resolve({ id: 'custom', version: '2' }).result('different wire format').text).toBe('custom result');
    expect(() => registry.resolve({ id: 'custom', version: '1' })).toThrow('unsupported_harness');
    expect(() => new HarnessRegistry([alternate, alternate])).toThrow('duplicate_harness_version');
    const catalog = registry.catalog();
    catalog[0]!.capabilities.push('unverified');
    expect(registry.catalog()[0]!.capabilities).not.toContain('unverified');
  });
  it('lets the adapter interpret native output without promoting logs or errors to success', () => {
    const result = openCodeAdapter.result([
      'not a response',
      JSON.stringify({ type: 'text', sessionID: 'native-1', part: { messageID: 'early', text: 'Starting' } }),
      JSON.stringify({ type: 'text', sessionID: 'native-1', part: { messageID: 'final', text: 'Delivered' } }),
    ].join('\n'));
    expect(result).toEqual({ text: 'Delivered', native_session: 'native-1', failed: false });
    expect(openCodeAdapter.result('{"type":"error"}').failed).toBe(true);
    expect(openCodeAdapter.result('installation complete').text).toBe('');
  });
});
