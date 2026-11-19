import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import path from 'node:path';
import { expect, it, vi } from 'vitest';
const source = readFileSync(new URL('./install-opencode.cjs', import.meta.url), 'utf8');
it.each([
  ['x64', false, 'avx2', 'opencode-linux-x64'],
  ['x64', false, '', 'opencode-linux-x64-baseline'],
  ['x64', true, 'avx2', 'opencode-linux-x64-musl'],
  ['x64', true, '', 'opencode-linux-x64-baseline-musl'],
  ['arm64', true, '', 'opencode-linux-arm64-musl'],
])('selects a native binary compatible with %s, musl=%s, CPU flags=%s', (arch, musl, flags, name) => {
  const copy = vi.fn(), chmod = vi.fn();
  runInNewContext(source, { process: {platform:'linux', arch}, require: (module: string) => {
    if (module === 'node:path') return path;
    if (module === 'node:child_process') return {spawnSync: () => ({stdout:musl?'musl libc':'GNU libc'})};
    return {existsSync:()=>musl,readFileSync:()=>flags,copyFileSync:copy,chmodSync:chmod};
  }});
  expect(copy).toHaveBeenCalledWith(`/tmp/hexagon-harnesses/node_modules/${name}/bin/opencode`, '/tmp/hexagon-harnesses/node_modules/opencode-ai/bin/.opencode');
  expect(chmod).toHaveBeenCalledWith('/tmp/hexagon-harnesses/node_modules/opencode-ai/bin/.opencode',0o755);
});
