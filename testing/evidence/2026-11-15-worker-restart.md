# Actual worker process crash during a cloud task

Command: `HEXAGON_WORKER_RESTART=1 HEXAGON_WEB_SMOKE=1 HEXAGON_BOTH_SDKS=1 npx tsx tooling/smoke-api.ts`.

Result: exit 0, verified, resource and template cleanup confirmed. Started 2026-11-15 03:05:03 UTC; finished 03:09:37 UTC. Private journal: `.local/evidence/api-smoke-250c49ca-43f4-4e33-b307-725a3d7f427b.json`.

The control-plane API and database stay running. ExecutionWorker runs in an actual isolated Node subprocess, using the same product components and its test schema/key. On the first report Tool authorization wait, the test sends SIGKILL to that subprocess and waits for its exit, then starts a fresh worker process. It does not update lease rows or shorten the lease: the replacement worker waits for normal persisted lease expiration. The cloud Runtime and OpenCode process remain alive.

| Invariant | Observed result |
| --- | --- |
| Original Run | `93d66076-5b9a-4c22-a818-35aadf29c74e` completes |
| Session | `64bebd95-31b9-42f9-be29-6fca875fbe25` retained |
| Worker identity | changes from `e71ebd3e-3f58-4c74-bd5c-f0204a5f1621` to `54fa61a0-9d8f-49e7-be66-94a4feefcb98` |
| Persisted lease generation | increases from 1 to 2 |
| Sandbox before/after crash | same ID, `ioxv99vudu21c6xcvwj1w` |
| Resource create operations for Session | exactly 1 |
| Harness invocation records for original Run | exactly 1 |
| Report writes | 0 before approval; 1 after approval |
| Fixed application tests | independently executed: 8 assertions passed |
| Durable events | 806, with replay and disconnected stream continuation verified |

The original task uses E2B, OpenCode 1.2.27 and MiniMax. After its successful recovery, the suite also verifies preview, retained artifacts, same-Session follow-up, the independent Python task (another 8 fixed assertions), bidirectional cross-language continuation, cancellation, Session close and provider-confirmed cleanup. All task-owned sandboxes and the temporary template are gone.

`tooling/worker-process.ts` and `tooling/worker-process-driver.ts` make this repeatable without killing unrelated development workers. Credentials are read from the existing private test key file/SecretStore; child stdout/stderr are not collected. `npm run check` passed. The PostgreSQL-backed regression suite passed 18 files / 40 tests.

Scope: a hard worker crash during authorization waiting, with live cloud Runtime/Harness and persistent control-plane storage. This is not evidence for simultaneous API/database failure, Runtime loss, every crash point around remote side effects, cancellation races, or GUI authorization in this particular run. The broader fault acceptance branch remains pending.
