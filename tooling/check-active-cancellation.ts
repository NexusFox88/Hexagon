import { randomUUID } from 'node:crypto';
import { Hexagon } from '../sdk/typescript/index.js';
import type { SandboxConnector } from '../modules/sandboxes/connector.js';

/** Waits for an actual model-started foreground child before cancelling via SDK. */
export async function checkActiveCancellation(client: Hexagon, connector: SandboxConnector, sandbox: string, session: string) {
  const marker = `cancel-probe-${randomUUID()}.json`;
  const source = `import json,os,time; from pathlib import Path; Path("${marker}").write_text(json.dumps({"pid":os.getpid(),"pgid":os.getpgrp()})); time.sleep(120); Path("${marker}.finished").write_text("finished")`;
  const run = await client.submit(session, `这是取消验收任务。请用终端工具立即以前台方式运行以下命令并等待命令结束，不要放到后台，不要修改命令，不需要调用外部工具：python3 -c '${source}'`, `active-cancel-${marker}`);
  const command = (code: string) => connector.execute(sandbox, `python3 -c '${code.replaceAll("'", "'\\''")}'`);
  const read = async () => {
    const result = await command(`from pathlib import Path; p=Path("/tmp/hexagon-runtime/workspace/${marker}"); print(p.read_text() if p.exists() else "null")`);
    if (result.exit_code !== 0) throw new Error('cancel_probe_read_failed');
    return JSON.parse(result.stdout);
  };
  const deadline = Date.now() + 150000; let child;
  while (Date.now() < deadline) {
    child = await read(); if (child) break;
    const state = (await client.run(run.id)).state;
    if (['completed', 'failed', 'cancelled'].includes(state)) throw new Error('cancel_probe_exited_before_start');
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  if (!child || !Number.isInteger(child.pid) || !Number.isInteger(child.pgid)) throw new Error('cancel_probe_not_started');
  const statePath = `/tmp/hexagon-runtime/runs/${run.id}/state.json`;
  const runtime = JSON.parse(Buffer.from(await connector.read(sandbox, statePath)).toString());
  if (runtime.state !== 'running' || !Number.isInteger(runtime.pid)) throw new Error('cancel_runtime_not_running');
  await client.cancel(run.id); await client.cancel(run.id);
  const terminalDeadline = Date.now() + 45000; let final;
  while (Date.now() < terminalDeadline) {
    final = await client.run(run.id);
    if (['completed', 'failed', 'cancelled'].includes(final.state)) break;
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  const probe = await command(`import json; from pathlib import Path\npids=${JSON.stringify([runtime.pid, child.pid])}\nlive=[]\nfor pid in pids:\n p=Path("/proc")/str(pid)/"stat"\n try:\n  state=p.read_text().rsplit(")",1)[1].split()[0]\n  if state!="Z": live.append(pid)\n except FileNotFoundError: pass\nprint(json.dumps({"live_pids":live,"finished":Path("/tmp/hexagon-runtime/workspace/${marker}.finished").exists()}))`);
  if (probe.exit_code !== 0) throw new Error('cancel_process_inspection_failed');
  const processes = JSON.parse(probe.stdout);
  if (final?.state !== 'cancelled' || processes.live_pids.length || processes.finished) throw new Error(`active_cancellation_unconfirmed:${JSON.stringify({ state: final?.state, ...processes })}`);
  const remote = JSON.parse(Buffer.from(await connector.read(sandbox, statePath)).toString());
  if (remote.state !== 'cancelled') throw new Error('runtime_cancel_not_confirmed');
  return { run: run.id, child, harness_pid: runtime.pid, before: runtime.state, after: remote.state, api_state: final.state, ...processes };
}
