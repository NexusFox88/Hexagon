import { randomUUID } from 'node:crypto';
import { setTimeout as delay } from 'node:timers/promises';

// Loaded only inside the sandbox. Provider account credentials never enter it.
export default function hexagon(pi) {
  const model = JSON.parse(process.env.HEXAGON_MODEL_CONFIG);
  pi.registerProvider('hexagon', {
    name: 'User model endpoint', baseUrl: model.base_url, apiKey: '$HEXAGON_MODEL_KEY', api: model.provider==='openai-responses'?'openai-responses':model.provider==='openai-compatible'?'openai-completions':'anthropic-messages',
    models: [{ id: model.model, name: model.model, reasoning: false, input: ['text'],
      cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 }, contextWindow: 196608, maxTokens: 8192 }],
  });
  for (const tool of JSON.parse(process.env.HEXAGON_TOOLS || '[]')) {
    pi.registerTool({
      name: tool.name, label: tool.name, description: tool.description, parameters: tool.inputSchema,
      async execute(_nativeId, arguments_, signal) {
        const body = JSON.stringify({ id: randomUUID(), name: tool.name, arguments: arguments_ });
        const url = `http://127.0.0.1:8765/tools/${model.run_id}/call`;
        while (true) {
          signal?.throwIfAborted();
          let response;
          try {
            response = await fetch(url, { method: 'POST', headers: { Authorization: `Bearer ${process.env.HEXAGON_TOOL_TOKEN}`, 'Content-Type': 'application/json' }, body,
              signal: signal ? AbortSignal.any([signal, AbortSignal.timeout(15000)]) : AbortSignal.timeout(15000) });
          } catch {
            signal?.throwIfAborted();
            await delay(500, undefined, { signal });
            continue; // Retry exactly the same immutable mailbox call.
          }
          if (!response.ok) throw new Error('Tool call rejected or Run no longer active.');
          const row = await response.json();
          if (row.state === 'completed') {
            if (row.result.isError) throw new Error(row.result.content?.filter(item => item.type === 'text').map(item => item.text).join('\n') || 'Tool operation failed.');
            return { ...row.result, details: {} };
          }
          await delay(500, undefined, { signal });
        }
      },
    });
  }
}
