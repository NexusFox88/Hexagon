import { readFile } from 'node:fs/promises';
import { homedir } from 'node:os';

/** Test tooling only: read specifically authorized literal assignments without executing shell code. */
export async function localTestCredential(name: string, source: 'sandbox' | 'shell') {
  if (process.env[name]) return process.env[name]!;
  const allowed = source === 'sandbox' ? ['insta_api_key', 'e2b_api_key', 'daytona_api_key', 'daytona_endpoint', 'blaxel_personal_api_secret', 'blaxel_workspace', 'fly_sprites_token', 'upstash', 'VERCEL_API_KEY', 'agent37_api_key', 'boat_api_key', 'freestyle_api_key', 'fly_token'] : ['MINIMAX_ANTHROPIC_API_KEY', 'MINIMAX_ANTHROPIC_BASE_URL', 'MINIMAX_ANTHROPIC_MODEL', 'TAVILY_API_KEY', 'DEEPL_API_KEY', 'EXA_API', 'siliconflow_api_key_polygala'];
  if (!allowed.includes(name)) throw new Error('Credential name outside test scope');
  const path = source === 'sandbox' ? `${homedir()}/Desktop/sandbox_credential.txt` : `${homedir()}/.zshrc`;
  const contents = await readFile(path, 'utf8');
  const raw = contents.match(new RegExp(`^\\s*(?:export\\s+)?${name}\\s*=\\s*(.+)$`, 'm'))?.[1]?.trim();
  if (!raw) throw new Error(`Missing test configuration: ${name}`);
  if (name === 'fly_token' && /^FlyV1 [A-Za-z0-9_.,=+\/-]+$/.test(raw)) return raw;
  const value = raw.match(/^"([^"\n]*)"\s*(?:#.*)?$/)?.[1] ?? raw.match(/^'([^'\n]*)'\s*(?:#.*)?$/)?.[1] ?? raw.match(/^([^\s#]+)\s*(?:#.*)?$/)?.[1];
  if (!value || /[$`]/.test(value)) throw new Error(`Test configuration requires explicit literal: ${name}`);
  return value;
}
