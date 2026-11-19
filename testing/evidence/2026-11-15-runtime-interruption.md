# Runtime interruption dispatch safety

Date: 2026-11-15. Scope: deterministic Runtime and PostgreSQL worker recovery regressions. Real cloud Runtime termination and browser rendering remain pending.

A restarted Runtime already quarantined persisted active invocations as `interrupted`, but its pending-tools endpoint still returned their persisted mailboxes. The worker previously fetched and processed tools before reading invocation state. An interrupted invocation could therefore offer an old pending external write for dispatch.

Changes:

- Runtime only offers pending tools while the invocation is `running`. Existing mailbox data remains unchanged for inspection.
- Worker checks remote invocation state before requesting tools. Terminal/interrupted invocations do not dispatch tools.
- Interrupted invocations fail with `runtime_interrupted`, including when the control-plane Run was cancelling. An unconfirmed process stop is not reported as successful cancellation.
- The Run failure and Session Runtime `interrupted` state persist in one lease-fenced transaction. Fleet already reads the Runtime binding; Console has an explicit interruption label.
- Later execution on a known interrupted binding fails with `workspace_requires_recovery`; it does not reinstall or restart the uncertain workspace.

Verification:

- `npm run check`: passed.
- Full `TEST_DATABASE_URL=postgres://hexagon@127.0.0.1:55432/hexagon npm test`: 20 files, 47 tests passed.
- `TEST_DATABASE_URL=postgres://hexagon@127.0.0.1:55432/hexagon npm test -- modules/execution/worker.test.ts modules/execution/runs.test.ts`: 2 files, 11 tests passed.
- `python3 -m unittest discover -s runtime -p 'test_*.py'`: 8 tests passed. The interruption regression seeds an active invocation and pending write, reconstructs the supervisor, and verifies the write is withheld while the persisted mailbox remains intact.
- Worker tests cover both running and cancelling recovery against a simulated interrupted Runtime, actual isolated PostgreSQL state, zero ToolBroker dispatch, no artifact request, no replacement sandbox, no Harness installation/new invocation, and persisted interruption state.

Limits: a remote state check cannot atomically prevent a Runtime from dying after its last healthy response and before an external operation. This change prevents dispatch of already observed interrupted work; uncertain in-flight external writes still require the existing Tool reconciliation protocol. Network-only Runtime loss, actual cloud supervisor termination, and Fleet browser inspection are not proven by these tests. No credentials were printed, no cloud resources created, and no commits made.
