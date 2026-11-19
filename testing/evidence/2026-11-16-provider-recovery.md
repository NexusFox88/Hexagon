# Boat/OpenCode, E2B/OpenCode and Modal/Pi recovery acceptance

Date: 2026-11-16. Daytona remains explicitly deferred. Real tests use SiliconFlow international via the credential proxy and temporary acceptance tunnels. Each attempt owns an isolated database schema and preserves its private journal/key under `.local/evidence`.

## Findings and changes

1. Earlier Boat/OpenCode failed while creating the independent Python Session; earlier E2B/OpenCode had a completed Sandbox create but Runtime `starting`; earlier Modal/Pi had an unknown create operation and no Runtime. The old records contain only generic reconciliation errors. The original provider/transport causes cannot be reconstructed honestly. Fresh attempts successfully crossed all three previously blocked stages. Historical failures remain failures.
2. A deterministic recovery defect was identified: the worker marked Runtime `starting` before directory preparation and file uploads. A failed upload therefore stranded a not-yet-launched Runtime in a state that only performs health reconciliation. Provisioning now separates repeatable `preparing` from persisted launch intent `starting`, checks preparation command status, and resumes partial preparation. It never blindly relaunches an uncertain or initialized Runtime. A crash between recording launch intent and sending the launch remains intentionally uncertain.
3. Run recovery now retains execution stage and sanitized error category/status/allowlisted transport code; create operations retain sanitized failure details. No error message, URL, upstream body, or arbitrary provider code is persisted by this diagnostic path.
4. Final-code Boat attempt `2ac4fd17-66d7-47fb-8e14-9f079661d160` exposed a separate artifact delivery omission: the implementation passed the immutable 8-assertion test, but OpenCode left `test-report.txt` in the workspace root and exported only `filter.mjs`. The strict download assertion correctly failed. OpenCode now uses the same explicit artifact delivery contract as Pi, including copying requested reports into the exact per-Run export directory and verifying their presence. The failed attempt's cloud resource was confirmed cleaned. Acceptance checks were not weakened.

## Verification already observed

- TypeScript typecheck passed.
- Full deterministic regression after preparation/diagnostic changes: 45 test files / 123 tests passed. Follow-up regression verifies that a persisted uncertain launch is health-probed without re-running preparation or launch.
- Local Python Runtime suite: 9 tests run, 1 Linux-specific test skipped on macOS; remaining tests passed. This is not a claim that the skipped Linux case ran here.
- Initial full dual-SDK journeys passed: Boat/OpenCode `f54352cb-6d6d-482a-bee6-7ceb87a8eafb`; E2B/OpenCode `e30e984d-f970-440f-aa28-337d0c8c01fc`; Modal/Pi `d9611d7b-ed5c-4fc2-8516-9697e1a5540b`.
- E2B final preparation-code journey `d3018de5-589f-4f93-a409-95d4643d8c35` passed. An independent retained-record audit verified the above four journeys / eight primary SDK Runs, including nonempty results, artifact bytes/hashes, terminal events, closed Sessions and completed resource operations.
- Read-only reconciliation of the three historical failed attempts found no resources matching their exact create operation IDs and no surviving previously known resource IDs. Evidence: `.local/evidence/failed-resource-recheck-20261116.json`. Historical unknown-operation rows are preserved rather than rewritten to assert a cause.

## Final artifact-contract verification

| Provider / Harness | Private journal suffix | TypeScript | Python | Cleanup |
| --- | --- | --- | --- | --- |
| Boat / OpenCode | `64c99214-bcac-4f71-8799-29c7480a7d63` | Passed | Passed | Both asynchronous purge operations completed; resources absent |
| E2B / OpenCode | `112a7aeb-6810-48fa-97df-4e7e9c86112e` | Passed | Passed | Both Sandboxes and test template confirmed removed |
| Modal / Pi | `7f0b9bcd-1e1f-40f6-8040-3f73d131b7cd` | Passed | Passed | Both Sessions closed and resources absent |

Boat and E2B used the final shared artifact-delivery implementation. Modal used the final preparation implementation and the identical Pi artifact instruction text, subsequently extracted without semantic change into the shared helper.

Each journey verified independent TypeScript and Python Agent/Session tasks, uploaded immutable input fixtures, idempotent submission, SSE disconnect/replay, real model execution, Tool authorization and approval, the unmodified 8-assertion test, downloadable report and implementation hashes, preview authentication/revocation, follow-up Runs, cross-language continuation in both directions, cancellation and Session cleanup. Authorization/approval was exercised through SDK/API automation in these runs; this record does not claim fresh GUI clicks. Each final journal has six completed Runs and two cancelled Runs. Cancelled Runs here test the normal cancellation path; they do not replace the separate historical active-process cancellation evidence.

Independent retained-record audit passed for all three final journeys / six primary SDK Runs, checking nonempty retained results, exact artifact bytes/hashes, terminal events, closed Sessions and zero unresolved resource operations. Private audit: `.local/evidence/retained-journey-audit.json`.

The primary Session credential scans inspected 3,663 sources for Boat, 364 for E2B and 457 for Modal, found no original upstream key, and verified it was absent from the persisted invocation. These use the common external credential proxy; this is not a claim of provider-native secret isolation or an exhaustive security proof.

Final full deterministic regression: **45 files / 123 tests passed** (`.local/evidence/recovery-regression-final.log`); final TypeScript typecheck passed. Both old unknown-resource history and the intermediate artifact failure remain preserved alongside the successful reruns. No commits or publishing were performed. Acceptance-only tunnels were closed by their successfully exited test processes.

The user's main local control plane was restarted to load the final changes, preserving its Secrets, Connections and manual SDK configuration. Its ongoing development credential tunnel is intentionally retained for the user's walkthrough, separately from acceptance-only tunnels.
