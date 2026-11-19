import { z } from 'zod';
import type { ConnectionAdapter } from '../../modules/connections/connections.js';

export const anthropicModelConfig = z.object({
  base_url: z.string().url().refine(value => { const url = new URL(value); return url.protocol === 'https:' && !url.username && !url.password && !url.search && !url.hash; }, 'HTTPS endpoint without embedded credentials required'),
  model: z.string().min(1).max(200),
}).strict();

export const anthropicModelConnection: ConnectionAdapter = {
  kind: 'model', provider: 'anthropic-compatible', config: anthropicModelConfig, capabilities: [],
  async validate(config, credential) {
    const model = anthropicModelConfig.parse(config);
    const base = model.base_url.replace(/\/+$/, '');
    const url = `${base.endsWith('/v1') ? base : `${base}/v1`}/messages`;
    // This is an explicit bounded credential check, not a model-routing gateway.
    const response = await fetch(url, {
      method: 'POST', signal: AbortSignal.timeout(30000), redirect: 'error',
      headers: { 'x-api-key': credential, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
      body: JSON.stringify({ model: model.model, max_tokens: 16, messages: [{ role: 'user', content: 'Reply OK.' }] }),
    });
    if (!response.ok) { await response.body?.cancel(); throw new Error('model_validation_failed'); }
    const result = await response.json() as { type?: string; content?: unknown[] };
    if (result.type !== 'message' || !Array.isArray(result.content)) throw new Error('model_response_invalid');
    return { operations: ['bounded_messages_request'] };
  },
};
