import { execFileSync } from 'node:child_process';
import { mkdtemp, mkdir, readdir, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { createHash } from 'node:crypto';

if (!process.env.TEST_DATABASE_URL) throw new Error('TEST_DATABASE_URL is required: package verification must run database/API tests');
const root = await mkdtemp(join(tmpdir(), 'hexagon-sdk-packages-'));
const artifacts = join(root, 'artifacts'), consumer = join(root, 'consumer'), python = join(root, 'python');
await Promise.all([artifacts, consumer, python].map(path => mkdir(path)));
function run(command: string, args: string[], cwd = process.cwd(), env = process.env) {
  execFileSync(command, args, { cwd, env, stdio: 'inherit', timeout: 180000 });
}
const evidence: Record<string, unknown> = { root, state: 'building', started_at: new Date().toISOString() };
try {
  run('npm', ['pack', '--pack-destination', artifacts], resolve('sdk/typescript'));
  run('python3', ['-m', 'pip', 'wheel', '--no-deps', '--no-build-isolation', '--wheel-dir', artifacts, resolve('sdk/python')]);
  const names = await readdir(artifacts);
  const tarball = names.find(name => name.endsWith('.tgz'))!, wheel = names.find(name => name.endsWith('.whl'))!;
  if (!tarball || !wheel) throw new Error('SDK artifact missing');
  await writeFile(join(consumer, 'package.json'), JSON.stringify({ private: true, type: 'module' }));
  run('npm', ['install', '--offline', '--ignore-scripts', '--no-audit', '--no-fund', join(artifacts, tarball)], consumer);
  run('python3', ['-m', 'pip', 'install', '--no-index', '--no-deps', '--target', python, join(artifacts, wheel)]);
  run('node', ['--input-type=module', '-e', 'import {Hexagon} from "@hexagon/agent-sdk"; if(typeof Hexagon.prototype.denyToolAuthorization!=="function" || typeof Hexagon.prototype.registerHarness!=="function" || typeof Hexagon.prototype.discoverMcpTools!=="function" || typeof Hexagon.prototype.listConnections!=="function" || typeof Hexagon.prototype.sessionInitialization!=="function") throw new Error("incomplete SDK");'], consumer);
  const environment = { ...process.env, HEXAGON_TEST_TS_MODULE: pathToFileURL(join(consumer, 'node_modules/@hexagon/agent-sdk/dist/index.js')).href, HEXAGON_TEST_PYTHON_PATH: python };
  run('python3', ['-c', 'import os,hexagon; assert hexagon.__file__.startswith(os.environ["HEXAGON_TEST_PYTHON_PATH"]); assert callable(hexagon.Hexagon.deny_tool_authorization); assert callable(hexagon.Hexagon.discover_mcp_tools); assert callable(hexagon.Hexagon.list_connections); assert callable(hexagon.Hexagon.session_initialization)'], consumer, { ...environment, PYTHONPATH: python });
  run('npx', ['vitest', 'run', 'modules/harnesses/api.test.ts', 'testing/sdk-interoperability.test.ts', 'testing/local-sdk.test.ts', 'modules/tools/authorization-denial.test.ts'], process.cwd(), environment);
  evidence.state = 'verified'; evidence.artifacts = await Promise.all([tarball, wheel].map(async name => ({ name, sha256: createHash('sha256').update(await readFile(join(artifacts, name))).digest('hex') })));
} catch (error) { evidence.state = 'failed'; evidence.error = error instanceof Error ? error.message : 'unknown'; process.exitCode = 1; }
finally {
  evidence.finished_at = new Date().toISOString();
  await mkdir('.local/evidence', { recursive: true });
  await writeFile('.local/evidence/sdk-packages.json', JSON.stringify(evidence, null, 2), { mode: 0o600 });
  console.log(JSON.stringify(evidence));
}
