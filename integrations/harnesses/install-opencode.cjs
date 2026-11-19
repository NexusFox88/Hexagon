// Pin the native executable used by the supervisor. The upstream JS launcher
// masks signal exits; its postinstall also selects glibc on Alpine in 1.2.27.
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
if (process.platform !== 'linux' || !['x64', 'arm64'].includes(process.arch)) throw new Error('unsupported_harness_platform');
const ldd = spawnSync('ldd', ['--version'], { encoding: 'utf8' });
const musl = fs.existsSync('/etc/alpine-release') || `${ldd.stdout ?? ''}${ldd.stderr ?? ''}`.toLowerCase().includes('musl');
let avx2 = false;
try { avx2 = /(^|\s)avx2(\s|$)/i.test(fs.readFileSync('/proc/cpuinfo', 'utf8')); } catch {}
const name = `opencode-linux-${process.arch}${process.arch === 'x64' && !avx2 ? '-baseline' : ''}${musl ? '-musl' : ''}`;
const root = '/tmp/hexagon-harnesses/node_modules';
const source = path.join(root, name, 'bin', 'opencode');
const target = path.join(root, 'opencode-ai', 'bin', '.opencode');
fs.copyFileSync(source, target);
fs.chmodSync(target, 0o755);
