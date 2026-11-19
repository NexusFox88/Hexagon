# GUI authorization during a real cloud Run

Command: `HEXAGON_WEB_SMOKE=1 HEXAGON_GUI_AUTH=1 HEXAGON_BROWSER_REVIEW=1 npx tsx tooling/smoke-api.ts`.

The first attempt (`api-smoke-90d3d3e4-0f0a-4475-968c-dcd1f1b44931.json`) reached GUI credential verification/enablement and API approval, but exceeded the 420-second task deadline. It is a failed acceptance attempt, with provider resource and template cleanup confirmed.

The second attempt is recorded in `.local/evidence/api-smoke-ca739c1d-815c-445c-beb9-4efc368eb341.json`:

- Actual OpenCode 1.2.27 and MiniMax ran in E2B.
- Fleet showed Run `9feac03d-cd0d-4378-a47b-f5498b6f5fb5` waiting for authorization, separately from running Sandbox and ready Runtime.
- Browser operated Fleet's bound Tool credential button, entered the report credential, saved it, verified it and enabled it. No API automation performed these credential mutations in this mode.
- The same Run returned to running, then completed. GUI receipt: `.local/evidence/gui-authorization-ca739c1d.json`.
- Approval was answered through the API. Report service had zero writes before approval and exactly one afterward, despite duplicate approval submission.
- Fixed `acceptance.mjs` was unchanged; independently executing it produced `8 assertions passed`. Final API response contained the actual assistant reply and two exported artifacts.
- Browser created a new preview grant from Fleet and opened it. Query `  API  ` with done status showed Launch API; a nonexistent query showed the empty state; clearing the query with open status showed Write SDK guide and Review API tests. Ticket was removed from the address and `document.cookie` was empty. Screenshot inspected: `.local/evidence/gui-authorized-preview.png`.
- SDK disconnected and replayed all 717 durable events; same-Session follow-up completed; cancellation and Session close completed. Exported artifacts remained downloadable and preview access was denied after close.
- Provider resource deletion and template deletion were confirmed.

## Shutdown defect found and fixed

The second script completed the product journey and closed its Session but stalled during preview-server shutdown. A browser preconnection had sent no HTTP headers and remained established after the tab was closed. The test process held only this preview connection and its test Tool listener; database records already showed Session closed and create/delete operations completed.

The existing test process's specific socket (local port 51972, remote port 52753) was released through its Node inspector, allowing its original cleanup block to finish and the process to exit 0. **Its journal says verified, but this shutdown required manual intervention and is not evidence of unattended shutdown.**

Preview server now uses Fastify `forceCloseConnections: true`. A real TCP regression in `apps/control-plane/preview-server.test.ts` opens a connection without HTTP headers and verifies both server shutdown and client socket closure within the test deadline. This check passes.

## Verification and remaining scope

`npm run check` passed. Full PostgreSQL suite passed: 27 tests in 13 files. An initial suite run exposed a stale cloud-test Run being claimed by transaction tests; regression tests now create, migrate and drop an isolated schema, preserving development/acceptance data. Cloud smoke tests likewise use a distinct retained schema named in their journal.

This verifies GUI runtime report authorization and Fleet preview interaction for the OpenCode/E2B combination. Initial Sandbox/model/requirements Tool registration in this attempt was API-driven; a complete GUI initialization journey, alternate harness/provider/custom-package coverage and the remaining failure matrix are still outstanding.

## Subsequent real cloud regression

After extracting `HarnessAdapter` / `HarnessRegistry` and fixing shutdown, `HEXAGON_WEB_SMOKE=1 npx tsx tooling/smoke-api.ts` exited 0 without intervention. Journal: `.local/evidence/api-smoke-3d58871d-9a73-42f1-87a5-78db95eda488.json`; retained isolated schema is recorded there. This real OpenCode/MiniMax/E2B run verified the Web task, unchanged fixed tests, authorization/approval, artifacts, event replay, follow-up, cancellation, Session close and provider/template cleanup through the refactored worker. Authorization was automated in this regression; browser preconnection shutdown is covered by the separate TCP regression, not by this browser-free run.

The first timed-out Run was separately reconciled to failed with code `acceptance_timeout_resource_removed`, after fresh provider inspection confirmed its resource was absent. Its original failed journal and events remain available. No test records were deleted to obtain the passing regression suite.
