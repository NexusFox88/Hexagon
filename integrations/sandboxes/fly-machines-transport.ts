import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { openCommandTunnel, type TunnelCommand } from './command-tunnel.js';

const quote = (value: string) => `'${value.replaceAll("'", "'\\''")}'`;

/** Requires flyctl >= 0.4.109 (isolated agent and token-mode WireGuard).
 * The CLI owns SSH authentication; no account token enters the guest.
 */
export async function openFlyMachinesTunnel(app: string, machine: string, credential: string, port: number) {
  if (!/^[a-z0-9-]+$/.test(app) || !/^[a-f0-9]+$/.test(machine)) throw new Error('invalid_fly_resource');
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('invalid_preview_port');
  const source = await readFile(new URL('./stdio-tcp-relay.py', import.meta.url), 'utf8');
  return openCommandTunnel(async () => {
    const directory = await mkdtemp(join(tmpdir(), 'hexagon-fly-'));
    await writeFile(join(directory, 'config.yml'), '{}\n', { mode: 0o600 });
    const environment: NodeJS.ProcessEnv = { ...process.env, FLY_CONFIG_DIR: directory, FLY_API_TOKEN: credential,
      FLY_AGENT_ISOLATED: '1', FLY_WIREGUARD_TOKEN_MODE: '1' };
    // An inherited socket override must not attach this credential to a shared agent.
    delete environment.FLY_AGENT_SOCKET_PATH; delete environment.FLY_AGENT_SOCKET_DIR;
    const child = spawn('fly', ['ssh', 'console', '--app', app, '--machine', machine, '--quiet', '--command',
      `timeout --kill-after=5s 45s python3 -u -c ${quote(source)} ${port}`], { env: environment, stdio: 'pipe' });
    let force: ReturnType<typeof setTimeout> | undefined;
    const stop = () => {
      if (child.exitCode !== null || child.signalCode !== null) return;
      child.kill('SIGTERM');
      force ??= setTimeout(() => child.kill('SIGKILL'), 5000); force.unref();
    };
    const deadline = setTimeout(stop, 45000); deadline.unref();
    child.once('close', () => {
      clearTimeout(deadline); if (force) clearTimeout(force);
      void rm(directory, { recursive: true, force: true }).catch(() => {});
    });
    try { await once(child, 'spawn'); }
    catch { clearTimeout(deadline); await rm(directory, { recursive: true, force: true }); throw new Error('fly_cli_spawn_failed'); }
    // Child stdin buffers until SSH is ready; Node streams preserve backpressure.
    return { stdin: child.stdin, stdout: child.stdout, stderr: child.stderr,
      on: child.on.bind(child), kill: stop, close: stop } satisfies TunnelCommand;
  });
}
