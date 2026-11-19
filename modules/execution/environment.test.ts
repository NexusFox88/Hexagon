import { expect, it } from 'vitest';
import { environmentInput } from './environment.js';
it('accepts literal multiline and empty values while rejecting reserved names, invalid names and oversized maps', () => {
  expect(environmentInput.parse({ APP_CONFIG: 'a\nb="quoted"', EMPTY: '' })).toEqual({ APP_CONFIG: 'a\nb="quoted"', EMPTY: '' });
  for (const env of [{ HEXAGON_MODEL_KEY: 'x' }, { OPENCODE_CONFIG_CONTENT: 'x' }, { PI_CODING_AGENT_DIR: 'x' }, { 'BAD=KEY': 'x' }, { APP: 'a\0b' }, { NODE_OPTIONS: 'x' }, Object.fromEntries(Array.from({length:65},(_,i)=>[`VAR_${i}`,'x']))]) expect(environmentInput.safeParse(env).success).toBe(false);
});
