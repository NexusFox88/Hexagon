import { describe, expect, it, vi } from 'vitest';
import type { SandboxConnector } from '../../modules/sandboxes/connector.js';
import { piAdapter } from './pi.js';

describe('Pi adapter', () => {
  it('pins an isolated CLI session and passes the model key only through the environment', () => {
    const invocation = piAdapter.invocation('new-run', 'Implement a feature', { base_url: 'https://example.test/anthropic/v1/', model: 'custom-model', credential: 'private-key' }, 'previous-session');
    expect(invocation.command).toContain('previous-session');
    expect(invocation.command.join(' ')).not.toContain('private-key');
    expect(invocation.env.HEXAGON_MODEL_KEY).toBe('private-key');
    expect(JSON.parse(invocation.env.HEXAGON_MODEL_CONFIG!).base_url).toBe('https://example.test/anthropic');
    expect(invocation.command).toContain('--no-extensions');
    expect(invocation.command).toContain('--extension');
    // The supervisor masks complete environment values. Public Run metadata
    // must not mask the native session header required by the next Run.
    expect(Object.values(invocation.env)).not.toContain('new-run');
    expect(() => piAdapter.invocation('run', '', { base_url: '', model: '', credential: '' }, '../../other')).toThrow('invalid_native_session');
  });
  it.each([true, false])('selects a compatible native runtime; host compatible=%s', async compatible => {
    const commands: string[] = [];
    let versionChecks = 0;
    const write = vi.fn();
    const connector = {
      write,
      execute: async (_sandbox:string, command:string) => {
        commands.push(command);
        if (command.endsWith('--version')) return {exit_code:versionChecks++ === 0 ? 127 : 0, stdout:versionChecks === 1 ? '' : '1.5.2',stderr:''};
        if (command.startsWith('node -p')) return {exit_code:0,stdout:String(compatible),stderr:''};
        return {exit_code:0,stdout:'',stderr:''};
      },
    } as unknown as SandboxConnector;
    await piAdapter.install(connector, 'sandbox');
    const install = commands.find(command => command.startsWith('npm install'))!;
    expect(install.includes('node@22.19.0')).toBe(!compatible);
    expect(commands.some(command => command.endsWith('/select-node.cjs'))).toBe(compatible);
    expect(write.mock.calls.some(call => call[1].endsWith('/hexagon-extension.mjs'))).toBe(true);
  });
  it('uses only the last completed assistant message and rejects truncation or model errors', () => {
    const event = (text: string, stopReason: string) => JSON.stringify({ type: 'message_end', message: { role: 'assistant', content: [{ type: 'text', text }], stopReason } });
    const result = piAdapter.result(['install log', '{"type":"session","id":"native"}', event('Thinking', 'toolUse'), event('Delivered', 'stop')].join('\n'));
    expect(result).toEqual({ text: 'Delivered', native_session: 'native', failed: false });
    for (const reason of ['length', 'error', 'aborted', 'toolUse']) expect(piAdapter.result(event('Incomplete', reason)).failed).toBe(true);
    expect(piAdapter.result('non-json log').failed).toBe(true);
  });
});
