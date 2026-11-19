import { afterEach, expect, it, vi } from 'vitest';
import { ExecError, SpritesClient } from '@fly/sprites';
import { SpritesConnector } from './sprites.js';

afterEach(()=>vi.restoreAllMocks());
it('returns observed nonzero exits so Harness installation can probe for a missing executable', async()=>{
  const execFile=vi.fn().mockRejectedValue(new ExecError('command failed',{stdout:'',stderr:'not found',exitCode:127}));
  vi.spyOn(SpritesClient.prototype,'sprite').mockReturnValue({execFile} as any);
  expect(await new SpritesConnector({},'fixture').execute('sandbox','missing --version')).toEqual({stdout:'',stderr:'not found',exit_code:127});
});
it('keeps a transport failure distinct from an observed command exit', async()=>{
  const failure=new TypeError('connection lost');
  vi.spyOn(SpritesClient.prototype,'sprite').mockReturnValue({execFile:vi.fn().mockRejectedValue(failure)} as any);
  await expect(new SpritesConnector({},'fixture').execute('sandbox','anything')).rejects.toBe(failure);
});
