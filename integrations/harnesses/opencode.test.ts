import { describe, it, expect } from 'vitest';
import { openCodeRequest, decodeOpenCode, installOpenCode, finalOpenCodeText } from './opencode.js';
import type { SandboxConnector } from '../../modules/sandboxes/connector.js';

describe('OpenCode adapter contract', () => {
  it('pins model endpoint, keeps credential out of arguments and reuses native sessions', () => {
    const request = openCodeRequest('run', 'change the project', { base_url: 'https://example.test/anthropic/', model: 'model-a', credential: 'test-secret' }, 'ses_previous');
    expect(request.command).toContain('ses_previous');
    expect(request.command[0]).toBe('/tmp/hexagon-harnesses/node_modules/opencode-ai/bin/.opencode');
    expect(request.command.join(' ')).not.toContain('test-secret');
    expect(JSON.parse(request.env.OPENCODE_CONFIG_CONTENT).provider.hexagon.options.baseURL).toBe('https://example.test/anthropic/v1');
    expect(request.env.HEXAGON_MODEL_KEY).toBe('test-secret');
  });
  it('rejects known insufficient memory before installing or running the harness', async () => {
    const connector = { inspect: async () => ({ id: 'sandbox', state: 'running', memory_mb: 512 }) } as unknown as SandboxConnector;
    await expect(installOpenCode(connector, 'sandbox')).rejects.toThrow('harness_requires_2048mb');
  });
  it('recognizes assistant text and errors without interpreting logs as successful output', () => {
    expect(decodeOpenCode('installation complete')).toBeNull();
    expect(decodeOpenCode('{"type":"text","sessionID":"ses_1","part":{"text":"Done"}}')).toEqual({ type: 'text', text: 'Done', session_id: 'ses_1' });
    expect(decodeOpenCode('{"type":"error","error":{"name":"APIError"}}')).toEqual({ type: 'error' });
    expect(decodeOpenCode('{"type":"tool_use","part":{"text":"Not a reply"}}')?.text).toBeUndefined();
  });
  it('returns the final assistant message rather than intermediate progress text', () => {
    expect(finalOpenCodeText([{ type: 'text', message_id: 'earlier', text: 'I will inspect files' }, { type: 'text', message_id: 'final', text: 'Implemented the feature' }, { type: 'text', message_id: 'final', text: 'Tests passed' }])).toBe('Implemented the feature\nTests passed');
  });
});
