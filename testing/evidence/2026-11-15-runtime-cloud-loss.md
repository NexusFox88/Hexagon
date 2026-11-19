# Real cloud Runtime loss and restart

Date: 2026-11-15. Status: real E2B / OpenCode / user MiniMax task with Runtime process fault injection passed. This is a fault branch, not a successful full Web-task journey or browser inspection.

Command:

```
HEXAGON_RUNTIME_LOSS=1 HEXAGON_TOOL_SMOKE=1 npx tsx tooling/smoke-api.ts
```

Exit 0. Private journal: `.local/evidence/api-smoke-834faa31-1c1f-4c96-945e-5174046359fc.json`. Started 03:53:22 UTC; finished 03:56:39 UTC.

- Session: `b17cf41f-b80a-45c0-9c14-d78acd020d4a`.
- Run: `aa5188c8-0876-4fd7-97df-7063dbb05bab`.
- Sandbox: `i66getg8zeqropoilri6n`.
- Test-owned Runtime supervisor PID: 1542.

The real Harness read the authenticated requirement once, worked on the uploaded calculation project, and requested the report Tool. The test withheld report authorization. At that waiting point it located exactly one `/tmp/hexagon-runtime/launch.py` process within this test's Sandbox and sent SIGSTOP. No scheduler leases or Run states were changed by the test.

After actual Runtime request failure, `/v1/fleet` reported Runtime `unreachable`, Run `waiting_authorization`, and the same Sandbox. It did not claim task death or completion. The test then sent SIGKILL to the same PID and explicitly relaunched the existing supervisor for the recovery test. Product code did not restart it automatically.

The reconstructed supervisor quarantined the original invocation. Normal worker recovery, using the existing invocation, produced Run `failed` with `runtime_interrupted` and Fleet Runtime `interrupted`. There was exactly one cloud create operation and one persisted Harness invocation. The report service observed zero writes. The original Sandbox remained bound throughout.

The public Session close endpoint completed, provider inspection confirmed absence, and the Sandbox connection could be deleted. Fallback inspection confirmed no remaining test resource; the test-created E2B template was also deleted and absence confirmed. `product_cleanup`, `resource_cleanup`, and `template_cleanup` are all `confirmed`.

Implementation and deterministic checks:

- `RuntimeUnavailableError` distinguishes missing transport/private endpoint response and upstream 5xx from semantic Runtime conflicts.
- Lease-fenced unreachable/reconnected transitions preserve an initialized workspace and never trigger bootstrap, Harness reinstallation or input upload.
- Console has a distinct unknown-process-status label for `unreachable`.
- `npm run check` passed.
- Full isolated database suite: 20 files / 48 tests passed after the worker change.
- Subsequent additional lease/reconnection and 5xx classification checks: 2 files / 9 tests passed. These extend the preceding full suite; no product changes followed that suite.

Remaining limits: Console browser rendering was not exercised in this run; healthy resume after a temporary pause is covered by state regressions but not this cloud scenario, which intentionally restarts the supervisor. A Runtime can still die after a healthy response while an external call is in flight; that separate uncertainty uses Tool reconciliation. The full cancellation/create/delete-failure matrix remains open. No commits or secret values were produced.
