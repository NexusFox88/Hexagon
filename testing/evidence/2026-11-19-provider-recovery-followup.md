# Provider recovery follow-up — 2026-11-19

Scope: Fly Machines / OpenClaw recovery, E2B acceptance, and the three previously unresolved resource operations. Daytona remains excluded from cloud acceptance. Local/hosted describes the control plane; every provider result here used cloud compute.

## Changes retained

- Fly wake now obtains a native Machine lease, rereads the exact Machine, and starts only a suspended Machine. Started Machines are observed without restarting. Stopped/transitional Machines are not cold-started as a recovery shortcut. Lease release is attempted; the provider TTL bounds a lost release.
- Lifecycle recovery invokes this provider-specific fenced reconciliation. A busy lease or uncertain response remains `session_transition_pending`; it does not replay a Run or allocate replacement compute.
- Fly connection schema now accepts `memory_mb` (2048–16384), default 4096. Both initial 2048 MiB OpenClaw attempts exited with signal 9. This alone is **not proof of OOM**. The follow-up uses 4096 MiB and separately checks recovery/results.
- OpenClaw's native MCP `requestTimeoutMs` is 300000 instead of its upstream 60000 default. The control-plane tool call still has its own bounded deadline; tools are not blindly replayed after unknown outcomes.
- E2B acceptance selects an already configured non-base template for OpenCode, consistent with existing serverless acceptance. The base template failed the actual 2048 MiB requirement; that guard was retained.
- E2B and Modal persist accepted Sandbox IDs as soon as returned. E2B does so before `getInfo`, preserving the cleanup handle if that second request fails.
- Modal records a returned filesystem checkpoint receipt before control returns to lifecycle. Close refuses to delete the source while a checkpoint has no receipt. This prevents the earlier cleanup-order bug; it does not reconstruct already lost historical snapshot IDs.

## Real cloud evidence

Private resource IDs, exact SDK responses, initialization snapshots and tool-call receipts are in `.local/headless-cloud/` (not public test fixtures).

| Provider / harness | SDK | Result | Private report |
| --- | --- | --- | --- |
| E2B / Pi | Python | Passed; cleanup confirmed | `e2b-2a2339a4-8cfc-4942-ac61-f58ba298eb00/report.json` |
| E2B / Pi | TypeScript | Passed; cleanup confirmed | same report |
| E2B / OpenCode | TypeScript | Passed; cleanup confirmed | `e2b-63ef58eb-a45a-45d3-9962-231b1982d523/report.json` |
| E2B / OpenCode | Python | Passed on follow-up; cleanup confirmed | `e2b-59e15d48-1f37-436d-b758-2b5bf8994a61/report.json` |
| Fly Machines / OpenClaw | Python | Passed at 4096 MiB; cleanup confirmed | `fly-machines-4d10e755-3561-47f7-8b44-a7c03b866b44/report.json` |
| Fly Machines / OpenClaw | TypeScript | Passed at 4096 MiB; cleanup confirmed | same report |

These journeys include configured identity/background, persisted initialization, idempotent submission, physical Sandbox pause, automatic wake on a new task, original file preservation, native conversation continuation receipt, actual remote MCP call, result/artifact download, and retained artifacts after closing. Python uses MiniMax through OpenAI-compatible Chat; TypeScript uses MiniMax through Anthropic-compatible protocol.

The first E2B OpenCode Python follow-up restored correctly but remote MCP handshake failed. It is preserved as a failed attempt; the subsequent full Python rerun passed. Explicit trusted proxy configuration for `mcp.deepwiki.com` was restored for the acceptance processes; no DNS/SSRF protection was disabled.

## Historical cleanup limitations

Latest exact-operation lookups: E2B query succeeds both through proxy and directly with zero running/paused matches. Modal exact-name and App-scoped historical operation-tag queries find no matching create. Modal's known checkpoint source is confirmed terminated in Dashboard; source logs contain no snapshot image receipt.

The three operations remain unresolved. No SQL state rewrite, fresh create, unrelated image deletion, or invented resource ID was used to turn them into closed records. Current inventory absence does not identify an unknown snapshot or prove a timed-out operation's terminal outcome. Private support drafts and exact identifiers are in `.local/provider-support/`; nothing has been sent to providers.

A proposed Modal idempotency adapter was rejected by real testing and removed:

1. SDK generic gRPC middleware does not cover the separate task command-router snapshot channel. Two images were created, both IDs retained and both explicitly deleted afterward.
2. The older async filesystem snapshot RPC rejects the current V2 Sandbox. That adapter was removed rather than advertised as working.

All probe Sandbox resources were terminated. The known probe images were deleted. This evidence must not be confused with deletion of the one historical snapshot whose ID is still unknown.

## Deterministic verification

- `npm run check`: passed.
- `TEST_DATABASE_URL=postgres://hexagon@127.0.0.1:55432/hexagon npm test`: **102 files / 334 tests passed** (20:08 local run).
- Added/expanded checks cover exact-Machine lease behavior, already-running/stopped states, pending wake reconciliation, MCP timeout in generated native config, receipt persistence before a failed E2B metadata lookup, and preserving an unknown checkpoint's source on close.

Raw command logs: `.local/recovery-typecheck.log`, `.local/recovery-final-regression.log`, `.local/recovery-cleanup-tests.log`. Deterministic tests are separate from the real cloud rows above.

## Provider contracts consulted

- [Fly Machines API](https://docs.fly.io/machines/api/machines-resource): Machine lease and nonce semantics, suspend/start state distinction.
- [Modal Sandbox snapshots](https://modal.com/docs/guide/sandbox-snapshots): filesystem snapshot lifecycle and the need to retain image IDs.
- [Modal JavaScript Sandbox SDK](https://modal.com/docs/sdk/js/latest/Sandbox): snapshot and exit-snapshot APIs; exit snapshot must be enabled at creation and cannot recover this historical source retroactively.

Final real-cloud result: all six SDK/provider/harness rows above passed, including the previously failing Fly/OpenClaw TypeScript recovery. Both Fly rows verify artifact availability after Session closure. Three historical operations still require provider-side evidence; support submission authorization has been requested and no messages have been sent.

Final teardown: all **11 Sessions** created by the five follow-up report batches (including failed attempts) are closed; **0 active Runs** remain in the acceptance tenant. The original **3 historical Sessions remain closing**. Exact records are in `.local/recovery-final-audit.json`. Temporary acceptance workers stopped; restarting the control plane closed the temporary ingress. The local service is running at `http://127.0.0.1:8787/console/` with the final source. No git commit or publication was made.
