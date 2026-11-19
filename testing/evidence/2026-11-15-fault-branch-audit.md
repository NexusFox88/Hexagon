# Fault branch coverage audit

The source journey requires SDK disconnect, worker restart, Runtime loss, task cancellation, create timeout and delete failure, with distinct states, no blind replay and recoverable cleanup. The following combined evidence covers these requirements; no single test is claimed to cover every failure point.

| Requirement | Direct evidence |
| --- | --- |
| SDK disconnect/cursor recovery without duplicate Run | Python and TypeScript cloud journeys, exact durable-event replay |
| Worker process crash/restart | `2026-11-15-worker-restart.md`: actual SIGKILL, normal lease expiry, same cloud resource, one invocation and one approved write |
| Runtime unavailable versus interrupted | `2026-11-15-runtime-cloud-loss.md`: actual SIGSTOP then SIGKILL/reconstruction, unreachable before confirmed interruption, no replacement invocation/write |
| Actual running-task cancellation | `2026-11-15-active-cloud-cancellation.md`: started Harness plus detached child, API cancellation and independently verified process termination |
| Cancellation response races and stale approvals | `2026-11-15-cancellation-races.md`: controlled HTTP 200/401/503 barriers, persisted outcomes, no resumed execution, stale decisions rejected; full local suite subsequently passed 53 tests |
| Create result uncertainty | `2026-11-15-resource-cloud-faults.md`: actual provider create with lost response, operation reconciliation, one resource |
| Delete failure/response uncertainty | Same cloud lifecycle evidence: failed delete and lost response, unknown visibility, absence-confirmed recovery without duplicate destroy |
| End-user fault visibility/retry | `2026-11-15-fleet-fault-browser.md`: Console state separation and actual retry route with controlled faults |

The three private cloud journals for worker restart, Runtime loss and resource reconciliation were reread in this audit: all are verified with provider/template cleanup confirmed. Active cancellation initially contradicted completion and was fixed and rerun before closing this row. The fault requirement is therefore complete for the specified scenarios, not an assertion of exhaustive failure combinations, all provider variants, rollback of external side effects, or automatic recovery from an interrupted workspace.
