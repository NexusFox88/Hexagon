import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { mkdtemp, readFile, rm, stat, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { expect, it } from 'vitest';
import type { SandboxConnector } from './connector.js';
import { withSandboxEnvironment } from './environment.js';

it('injects literal env into installation and children without putting values in command arguments', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'hexagon-env-'));
  const file = join(dir, 'env.json');
  const env = { APP_VALUE: 'line1\n$HOME "quotes" $(exit 99)', APP_EMPTY: '' };
  const commands: string[] = [];
  const connector = {
    async write(_id: string, _path: string, bytes: Uint8Array) { await writeFile(file, bytes); },
    async execute(_id: string, command: string) {
      commands.push(command);
      const { stdout, stderr } = await promisify(execFile)('/bin/sh', ['-c', command.replaceAll('/tmp/hexagon-runtime/agent-environment.json', file)]);
      return { stdout, stderr, exit_code: 0 };
    },
  } as SandboxConnector;
  try {
    const wrapped = await withSandboxEnvironment(connector, 'sandbox', env);
    const result = await wrapped.execute('sandbox', `python3 -c 'import os,json; print(json.dumps({k:os.environ[k] for k in ["APP_VALUE","APP_EMPTY"]}))'`);
    expect(JSON.parse(result.stdout)).toEqual(env);
    expect(commands.join('\n')).not.toContain(env.APP_VALUE);
    expect((await stat(file)).mode & 0o777).toBe(0o600);
    expect(JSON.parse(await readFile(file, 'utf8'))).toEqual(env);
    await expect(wrapped.execute('other-sandbox', 'true')).rejects.toThrow('environment_sandbox_mismatch');
    expect(process.env.APP_VALUE).toBeUndefined();
  } finally { await rm(dir, { recursive: true, force: true }); }
});
