import { anthropicModelConnection } from '../integrations/models/anthropic-compatible.js';
import { localTestCredential } from './local-test-credentials.js';

try {
  const result = await anthropicModelConnection.validate({
    base_url: await localTestCredential('MINIMAX_ANTHROPIC_BASE_URL', 'shell'),
    model: await localTestCredential('MINIMAX_ANTHROPIC_MODEL', 'shell'),
  }, await localTestCredential('MINIMAX_ANTHROPIC_API_KEY', 'shell'));
  console.log(JSON.stringify({ state: 'verified', ...result }));
} catch (error) {
  console.log(JSON.stringify({ state: 'failed', type: error instanceof Error ? error.name : 'unknown' }));
  process.exitCode = 1;
}
