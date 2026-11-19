// Persistent examples use one shared JSON journal across Python and TypeScript.
// It contains user input and identifiers, never the API token.
export function sessionCode({language,base,agentId,bindings,sessionId,prompt,sessionDefinition,localDirectory}){
 const literal=JSON.stringify;
 const definition=sessionDefinition??{agent_id:agentId,...bindings};
 if(language==='python')return `import atexit, json, os, sys, time, uuid
from pathlib import Path
from hexagon import Hexagon

base = os.environ.get("HEXAGON_API_URL", ${literal(base)})
${localDirectory?`client = Hexagon.local(data_directory=${literal(localDirectory)}, base_url=base)`:'token = os.environ["HEXAGON_API_TOKEN"]\nclient = Hexagon(base, token)'}
path = Path(os.environ.get("HEXAGON_JOURNAL", "hexagon-session.json"))
args = set(sys.argv[1:])
# Exclusive journal ownership prevents two clients from accidentally submitting two turns.
lock = Path(str(path) + ".lock")
try:
    descriptor = os.open(lock, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600)
except FileExistsError:
    raise RuntimeError("journal_in_use_check_recorded_process_before_removing_lock")
with os.fdopen(descriptor, "w") as stream:
    stream.write(str(os.getpid()))
atexit.register(lambda: lock.unlink(missing_ok=True))
def save(state):
    temporary = path.with_suffix(path.suffix + ".tmp")
    descriptor = os.open(temporary, os.O_WRONLY | os.O_CREAT | os.O_TRUNC, 0o600)
    os.fchmod(descriptor, 0o600)
    with os.fdopen(descriptor, "w") as stream:
        json.dump(state, stream, indent=2)
    os.replace(temporary, path)

state = json.loads(path.read_text()) if path.exists() else {"base": base, "session_id": ${sessionId?literal(sessionId):'None'}}
if state.get("base") != base:
    raise RuntimeError("journal_endpoint_mismatch")
if state.get("closed"):
    raise RuntimeError("session_closed_use_new_journal")
expected_session = ${literal(sessionId||'')}
expected_agent = ${literal(agentId||'')}
if expected_session and state.get("session_id") and state["session_id"] != expected_session:
    raise RuntimeError("journal_session_mismatch_choose_new_HEXAGON_JOURNAL")
if expected_agent and state.get("session_id"):
    actual_agent = state.get("agent_id") or client.session(state["session_id"])["agent_id"]
    if actual_agent != expected_agent:
        raise RuntimeError("journal_agent_mismatch_choose_new_HEXAGON_JOURNAL")
    state["agent_id"] = actual_agent
if not state.get("session_id"):
    if state.get("session_creation_pending"):
        raise RuntimeError("session_creation_unconfirmed_check_console")
    if "--resume" in args or "--close" in args:
        raise RuntimeError("no_saved_session")
    definition = json.loads(${literal(JSON.stringify(definition))})
    client.preflight_session(**definition)
    state["session_creation_pending"] = True
    save(state)
    session = client.create_session(**definition)
    state["session_id"] = session["id"]
    state["agent_id"] = expected_agent
    state.pop("session_creation_pending", None)
    save(state)
session_id = state["session_id"]
print(base + "/console/#sessions?id=" + session_id, flush=True)
if "--close" in args:
    if state.get("run_id"):
        run = client.run(state["run_id"])
        if run["state"] not in ("completed", "failed", "cancelled"):
            client.cancel(run["id"])
            deadline = time.monotonic() + 120
            while client.run(run["id"])["state"] not in ("completed", "failed", "cancelled"):
                if time.monotonic() >= deadline:
                    raise TimeoutError("cancellation_pending_resume_close")
                time.sleep(2)
    result = client.close(session_id)
    if result["state"] != "closed":
        raise RuntimeError("cleanup_pending_resume_close")
    state["closed"] = True
    save(state)
    sys.exit(0)
if "--new-turn" in args:
    if state.get("run_key") and not state.get("run_id"):
        raise RuntimeError("submission_unconfirmed_use_resume")
    if state.get("run_id") and client.run(state["run_id"])["state"] not in ("completed", "failed", "cancelled"):
        raise RuntimeError("active_run_use_resume")
    for key in ("run_id", "run_key", "input", "cursor"):
        state.pop(key, None)
if not state.get("run_key"):
    if "--resume" in args:
        raise RuntimeError("no_saved_run")
    state.update(run_key=str(uuid.uuid4()), input=${literal(prompt)}, cursor="0")
    save(state)
if not state.get("run_id"):
    # A lost submission response is recovered with the persisted original key and input.
    run = client.submit(session_id, state["input"], state["run_key"])
    state["run_id"] = run["id"]
    save(state)
print("Run:", base + "/console/#sessions?id=" + session_id + "&run=" + state["run_id"], flush=True)
if "--stream" in args:
    for event in client.stream(state["run_id"], state.get("cursor", "0")):
        if event.get("id"):
            state["cursor"] = event["id"]
            save(state)
        print(event["type"], flush=True)
deadline = time.monotonic() + 600
while True:
    run = client.run(state["run_id"])
    if run["state"] in ("completed", "failed", "cancelled"):
        break
    if time.monotonic() >= deadline:
        raise TimeoutError("run_continues_in_background_use_resume")
    print(run["state"], flush=True)
    time.sleep(2)
print(json.dumps(run.get("output") or run.get("error") or {"state": run["state"]}, ensure_ascii=False))
if run["state"] != "completed":
    sys.exit(1)
# Keep this Session for another turn. --resume reconnects; --new-turn submits new input;
# --close explicitly cancels any active Run, waits for termination and cleans cloud resources.
`;
 return `import { readFile, writeFile, rename, chmod } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { openSync, writeFileSync, closeSync, unlinkSync } from 'node:fs';
import { Hexagon } from '@hexagon/agent-sdk';

const base = process.env.HEXAGON_API_URL ?? ${literal(base)};
${localDirectory?`const client = await Hexagon.local({dataDirectory:${literal(localDirectory)},baseUrl:base});`:"const token = process.env.HEXAGON_API_TOKEN;\nif (!token) throw new Error('HEXAGON_API_TOKEN_required');\nconst client = new Hexagon(base, token);"}
const path = process.env.HEXAGON_JOURNAL ?? 'hexagon-session.json';
const args = new Set(process.argv.slice(2));
const lock = path + '.lock';
let descriptor;
try { descriptor = openSync(lock, 'wx', 0o600); }
catch (error) { if ((error as NodeJS.ErrnoException).code === 'EEXIST') throw new Error('journal_in_use_check_recorded_process_before_removing_lock'); throw error; }
writeFileSync(descriptor, String(process.pid)); closeSync(descriptor);
process.on('exit', () => { try { unlinkSync(lock); } catch {} });
async function save(state: Record<string, any>) {
  await writeFile(path + '.tmp', JSON.stringify(state, null, 2), {mode: 0o600});
  await chmod(path + '.tmp', 0o600);
  await rename(path + '.tmp', path);
}
let state: Record<string, any>;
try { state = JSON.parse(await readFile(path, 'utf8')); }
catch (error) { if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error; state = {base, session_id: ${literal(sessionId||null)}}; }
if (state.base !== base) throw new Error('journal_endpoint_mismatch');
if (state.closed) throw new Error('session_closed_use_new_journal');
const expectedSession = ${literal(sessionId||'')};
const expectedAgent = ${literal(agentId||'')};
if (expectedSession && state.session_id && state.session_id !== expectedSession) throw new Error('journal_session_mismatch_choose_new_HEXAGON_JOURNAL');
if (expectedAgent && state.session_id) {
  const actualAgent = state.agent_id ?? (await client.session(state.session_id)).agent_id;
  if (actualAgent !== expectedAgent) throw new Error('journal_agent_mismatch_choose_new_HEXAGON_JOURNAL');
  state.agent_id = actualAgent;
}
if (!state.session_id) {
  if (state.session_creation_pending) throw new Error('session_creation_unconfirmed_check_console');
  if (args.has('--resume') || args.has('--close')) throw new Error('no_saved_session');
  const definition = ${JSON.stringify(definition,null,2)};
  await client.preflightSession(definition);
  state.session_creation_pending = true; await save(state);
  const session = await client.createSession(definition);
  state.session_id = session.id; state.agent_id = expectedAgent; delete state.session_creation_pending; await save(state);
}
console.log(base + '/console/#sessions?id=' + state.session_id);
if (args.has('--close')) {
  if (state.run_id) {
    const run = await client.run(state.run_id);
    if (!['completed','failed','cancelled'].includes(run.state)) {
      await client.cancel(run.id);
      const deadline = Date.now() + 120_000;
      while (!['completed','failed','cancelled'].includes((await client.run(run.id)).state)) {
        if (Date.now() >= deadline) throw new Error('cancellation_pending_resume_close');
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }
  }
  const result = await client.close(state.session_id);
  if (result.state !== 'closed') throw new Error('cleanup_pending_resume_close');
  state.closed = true; await save(state); process.exit(0);
}
if (args.has('--new-turn')) {
  if (state.run_key && !state.run_id) throw new Error('submission_unconfirmed_use_resume');
  if (state.run_id && !['completed','failed','cancelled'].includes((await client.run(state.run_id)).state)) throw new Error('active_run_use_resume');
  for (const key of ['run_id','run_key','input','cursor']) delete state[key];
}
if (!state.run_key) {
  if (args.has('--resume')) throw new Error('no_saved_run');
  Object.assign(state, {run_key: randomUUID(), input: ${literal(prompt)}, cursor:'0'}); await save(state);
}
if (!state.run_id) {
  const run = await client.submit(state.session_id, state.input, state.run_key);
  state.run_id = run.id; await save(state);
}
console.log('Run:', base + '/console/#sessions?id=' + state.session_id + '&run=' + state.run_id);
if (args.has('--stream')) {
  for await (const event of client.stream(state.run_id, state.cursor ?? '0')) {
    if (event.id) {state.cursor = event.id; await save(state);}
    console.log(event.type);
  }
}
const deadline = Date.now() + 600_000;
let run;
while (true) {
  run = await client.run(state.run_id);
  if (['completed','failed','cancelled'].includes(run.state)) break;
  if (Date.now() >= deadline) throw new Error('run_continues_in_background_use_resume');
  console.log(run.state); await new Promise(resolve => setTimeout(resolve, 2000));
}
console.log(run.output ?? run.error ?? {state:run.state});
if (run.state !== 'completed') process.exitCode = 1;
// Session remains open. --resume reconnects, --new-turn submits new input,
// --close explicitly cancels, waits and cleans cloud resources.
`;
}
