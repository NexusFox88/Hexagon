import { beforeEach, describe, expect, it, vi } from 'vitest';

const { api } = vi.hoisted(() => ({ api: { create: vi.fn(), get: vi.fn(), delete: vi.fn(), list: vi.fn() } }));
vi.mock('@daytona/sdk', () => ({ Daytona: class { constructor() { return api; } }, DaytonaNotFoundError: class extends Error {}, DaytonaGoneError: class extends Error {} }));
import { DaytonaNotFoundError } from '@daytona/sdk';
import { DaytonaConnector } from './daytona.js';

beforeEach(() => vi.resetAllMocks());
describe('Daytona provider boundary', () => {
  it('creates a private, bounded-lifetime resource with reconciliation labels', async () => {
    api.create.mockResolvedValue({ id: 'resource', state: 'started', memory: 4 });
    const connector = new DaytonaConnector({}, 'private-account-key');
    const request = { operation_id: 'op', session_id: 'session', timeout_seconds: 121, network: { mode: 'unrestricted' as const, allowed_hosts: [] } };
    expect(await connector.create(request)).toEqual({ id: 'resource', state: 'running', memory_mb: 4096 });
    expect(api.create.mock.calls[0]![0]).toMatchObject({ name: 'hexagon-op', public: false, ttlMinutes: 3, autoDeleteInterval: 0, labels: { hexagon_operation: 'op', hexagon_session: 'session' } });
    await expect(connector.create({ ...request, network: { mode: 'allowlist', allowed_hosts: ['example.com'] } })).rejects.toThrow('network_policy_unsupported');
    expect(api.create).toHaveBeenCalledTimes(1);
  });
  it('distinguishes an absent resource from an unknown lookup failure', async () => {
    const connector = new DaytonaConnector({}, 'key');
    api.get.mockRejectedValueOnce(new DaytonaNotFoundError('gone'));
    expect(await connector.inspect('resource')).toBeNull();
    api.get.mockRejectedValueOnce(new Error('network failure'));
    await expect(connector.inspect('resource')).rejects.toThrow('network failure');
  });
  it('selects the configured snapshot and reports its actual resources', async () => {
    api.create.mockResolvedValue({ id: 'medium', state: 'started', memory: 4, autoDestroyAt: '2026-11-15T03:00:00.000Z' });
    const connector = new DaytonaConnector({ snapshot: 'daytona-medium' }, 'key');
    const result = await connector.create({ operation_id: 'op', session_id: 'session', timeout_seconds: 600, network: { mode: 'unrestricted', allowed_hosts: [] } });
    expect(api.create.mock.calls[0]![0].snapshot).toBe('daytona-medium');
    expect(result.memory_mb).toBe(4096);
    expect(result.expires_at).toBe('2026-11-15T03:00:00.000Z');
  });
  it('retains background sessions and returns private preview headers only internally', async () => {
    const process = { createSession: vi.fn(), executeSessionCommand: vi.fn().mockResolvedValue({ stdout: 'out', stderr: 'err', exitCode: 7 }), deleteSession: vi.fn() };
    const getPreviewLink = vi.fn().mockResolvedValue({ url: 'https://private.example', token: 'private-preview' });
    api.get.mockResolvedValue({ process, getPreviewLink });
    const connector = new DaytonaConnector({}, 'account-key');
    expect(await connector.execute('resource', 'command')).toMatchObject({ stdout: 'out', stderr: 'err', exit_code: 7 });
    expect(process.deleteSession).toHaveBeenCalledTimes(1);
    expect(await connector.execute('resource', 'server', { background: true })).toMatchObject({ exit_code: null });
    expect(process.deleteSession).toHaveBeenCalledTimes(1);
    expect(await connector.preview('resource', 3000)).toEqual({ url: 'https://private.example', headers: { 'X-Daytona-Preview-Token': 'private-preview' } });
    getPreviewLink.mockResolvedValueOnce({ url: 'https://public.example', token: '' });
    await expect(connector.preview('resource', 3000)).rejects.toThrow('private_preview_token_missing');
  });
});
