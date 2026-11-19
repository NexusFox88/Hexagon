// Pure generation: only public connection IDs and user-authored prompt enter source.
export function quickstartCode({ language, base, harness, sandbox, model, tools = [], http = [], prompt, messages }) {
    const agent = { name: messages.agentName, harness: { id: harness.id, version: harness.version }, resources: { timeout_seconds: 900 }, tools: tools.map((id, i) => ({ name: `tool_${i + 1}`, required_at_start: true })) };
    const bindings = { sandbox_connection_id: sandbox, model_connection_id: model, tools: Object.fromEntries(tools.map((id, i) => [`tool_${i + 1}`, id])), connections: Object.fromEntries(http.map((id, i) => [`api_${i + 1}`, id])) };
    const json = value => JSON.stringify(value, null, 2);
    const py = (value, depth = 0) => {
        if (value === null) return 'None';
        if (typeof value === 'boolean') return value ? 'True' : 'False';
        if (Array.isArray(value)) return `[${value.map(item => py(item, depth)).join(', ')}]`;
        if (typeof value !== 'object') return JSON.stringify(value);
        const entries = Object.entries(value);
        if (!entries.length) return '{}';
        const pad = '    '.repeat(depth + 1);
        return `{\n${entries.map(([key, item]) => `${pad}${JSON.stringify(key)}: ${py(item, depth + 1)}`).join(',\n')}\n${'    '.repeat(depth)}}`;
    };
    if (language === 'python') return `import json, os, time, uuid
from pathlib import Path
from hexagon import Hexagon

base = os.environ.get("HEXAGON_API_URL", ${JSON.stringify(base)})
token = os.environ.get("HEXAGON_API_TOKEN")
if not token:
    token = json.loads(Path(".local/control-plane/owner.json").read_text())["token"]
client = Hexagon(base, token)
agent = client.create_agent(**${py(agent)})
definition = ${py(bindings)}
definition["agent_id"] = agent["id"]
client.preflight_session(**definition)
session = client.create_session(**definition)
print("Session:", session["id"], flush=True)
run = None
try:
    run = client.submit(session["id"], ${py(prompt)}, str(uuid.uuid4()))
    print("Run:", run["id"], flush=True)
    deadline = time.monotonic() + 600
    previous = None
    previous_error = None
    while True:
        run = client.run(run["id"])
        state = run["state"]
        error = run.get("error")
        if error and error != previous_error:
            print(error.get("code"), error.get("stage", ""), flush=True)
            previous_error = error
        if state != previous:
            print(state, flush=True)
            if state in ("waiting_authorization", "waiting_approval"):
                print(${py(messages.waiting)}, base + "/console/#fleet", flush=True)
            previous = state
        if state in ("completed", "failed", "cancelled"):
            break
        if time.monotonic() >= deadline:
            raise TimeoutError(${py(messages.timeout)})
        time.sleep(2)
    if run["state"] != "completed":
        raise RuntimeError((run.get("error") or {}).get("code", run["state"]))
    print(run["output"]["text"])
finally:
    try:
        if run and run["state"] not in ("completed", "failed", "cancelled"):
            run = client.cancel(run["id"])
            cleanup_deadline = time.monotonic() + 120
            while run["state"] not in ("completed", "failed", "cancelled"):
                if time.monotonic() >= cleanup_deadline:
                    raise TimeoutError("cancellation_pending")
                time.sleep(2)
                run = client.run(run["id"])
        closed = client.close(session["id"])
        if closed["state"] != "closed":
            raise RuntimeError("cleanup_pending")
    except Exception:
        print(${py(messages.cleanup)}, session["id"], base + "/console/#fleet", flush=True)
        raise
`;
    return `import { readFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { Hexagon } from '@hexagon/agent-sdk';

const base = process.env.HEXAGON_API_URL ?? ${JSON.stringify(base)};
const token = process.env.HEXAGON_API_TOKEN ??
  JSON.parse(await readFile('.local/control-plane/owner.json', 'utf8')).token;
const client = new Hexagon(base, token);
const agent = await client.createAgent(${json(agent)});
const definition = { agent_id: agent.id, ...${json(bindings)} };
await client.preflightSession(definition);
const session = await client.createSession(definition);
console.log('Session:', session.id);
let run;
try {
  run = await client.submit(session.id, ${JSON.stringify(prompt)}, randomUUID());
  console.log('Run:', run.id);
  const deadline = Date.now() + 600_000;
  let previous, previousError;
  while (true) {
    run = await client.run(run.id);
    const diagnostic = JSON.stringify(run.error);
    if (run.error && diagnostic !== previousError) {
      console.log(run.error.code, 'stage' in run.error ? run.error.stage : '');
      previousError = diagnostic;
    }
    if (run.state !== previous) {
      console.log(run.state);
      if (['waiting_authorization', 'waiting_approval'].includes(run.state))
        console.log(${JSON.stringify(messages.waiting)}, base + '/console/#fleet');
      previous = run.state;
    }
    if (['completed', 'failed', 'cancelled'].includes(run.state)) break;
    if (Date.now() >= deadline) throw new Error(${JSON.stringify(messages.timeout)});
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
  if (run.state !== 'completed') throw new Error(run.error?.code ?? run.state);
  console.log(run.output?.text);
} finally {
  try {
    if (run && !['completed', 'failed', 'cancelled'].includes(run.state)) {
      run = await client.cancel(run.id);
      const cleanupDeadline = Date.now() + 120_000;
      while (!['completed', 'failed', 'cancelled'].includes(run.state)) {
        if (Date.now() >= cleanupDeadline) throw new Error('cancellation_pending');
        await new Promise(resolve => setTimeout(resolve, 2000));
        run = await client.run(run.id);
      }
    }
    const closed = await client.close(session.id);
    if (closed.state !== 'closed') throw new Error('cleanup_pending');
  } catch (error) {
    console.error(${JSON.stringify(messages.cleanup)}, session.id, base + '/console/#fleet');
    throw error;
  }
}
`;
}
