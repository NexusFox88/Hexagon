import type { SandboxConnector } from '../modules/sandboxes/connector.js';

/** Fault injection only in the test-owned Sandbox already bound to this Run. */
export async function checkRuntimeLoss(connector: SandboxConnector, sandbox: string, session: string,
  api: (method: string, path: string, body?: unknown) => Promise<any>) {
  const control = async (signal: string) => {
    const source = `import os, signal\nfrom pathlib import Path\nfound=[]\nfor path in Path('/proc').glob('[0-9]*/cmdline'):\n try:\n  args=path.read_bytes().split(bytes([0]))\n  if b'/tmp/hexagon-runtime/launch.py' in args: found.append(int(path.parent.name))\n except (FileNotFoundError, PermissionError): pass\nassert len(found)==1, 'expected_one_test_runtime'\nos.kill(found[0], signal.${signal})\nprint(found[0])`;
    const result = await connector.execute(sandbox, `python3 -c '${source.replaceAll("'", "'\\''")}'`);
    if (result.exit_code !== 0) throw new Error('runtime_fault_injection_failed');
    return result.stdout.trim();
  };
  const pid = await control('SIGSTOP');
  const deadline = Date.now() + 150000;
  let unknown: any;
  while (Date.now() < deadline) {
    const fleet = await api('GET', '/fleet');
    const row = fleet.sessions.find((item: any) => item.id === session);
    if (row?.runtime_state === 'unreachable') { unknown = { runtime: row.runtime_state, run: row.latest_run.state, sandbox: row.sandbox.id }; break; }
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  if (!unknown) throw new Error('runtime_uncertainty_not_exposed');
  if (unknown.sandbox !== sandbox || ['failed', 'completed', 'cancelled'].includes(unknown.run)) throw new Error('runtime_loss_falsely_terminal');
  const killed = await control('SIGKILL');
  if (killed !== pid) throw new Error('runtime_pid_changed');
  await connector.execute(sandbox, 'python3 /tmp/hexagon-runtime/launch.py', { background: true, timeout_seconds: 3600 });
  return { pid, unknown, supervisor_restarted: true };
}
