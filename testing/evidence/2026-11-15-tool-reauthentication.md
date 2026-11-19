# Expired Tool credential, GUI reauthentication and original-Run recovery

Command: `HEXAGON_TOOL_EXPIRY=1 HEXAGON_GUI_AUTH=1 HEXAGON_WEB_SMOKE=1 npx tsx tooling/smoke-api.ts`.

Result: exit 0, verified, product resource cleanup and provider resource/template cleanup confirmed. Finished 2026-11-15 03:24:12 UTC. Private journal: `.local/evidence/api-smoke-6c6651bf-8c30-4b75-8014-a089c26195bf.json`.

This uses a real E2B Sandbox, OpenCode 1.2.27 and MiniMax. The local authenticated report fixture simulates credential expiration by replacing its accepted credential after initial validation and immediately before the first approved report request. This does not revoke any user's external SaaS credential.

## Observed behavior

1. The report connection starts validated and enabled. The agent reaches report approval during its real Web task.
2. The service rejects the old credential with HTTP 401 before writing. The connection becomes invalid/disabled and original Run enters waiting_authorization. Exactly one report dispatch fails authentication; polling does not repeatedly resend the known-bad credential.
3. Ego-browser TaskSpace 9 opens the Console. Reports displays “验证失败”, “未启用” and a masked saved-credential indicator.
4. In the connection editor, a deliberately invalid test credential is saved. GUI validation fails with “验证失败，请检查凭证、端点及访问权限。” The enable button is disabled. The task remains waiting.
5. The new valid test credential is entered through the same GUI and saved. The connection is draft/disabled. GUI validation succeeds but leaves it disabled; clicking Enable changes it to ready/enabled. Credential values are passed from an encrypted checkpoint in memory and are not included in evidence output.
6. The original Run continues, requesting a new approval for the changed connection revision. Approval before expiry: `220f888c-b833-408c-8c8d-ff898a8a64a5`; approval after reauthentication: `96f2b660-eabc-4e8c-9727-8cc6faa3328f`. The acceptance client answers via API.
7. The report fixture records zero writes before approval and exactly one successful report write. The original Run completes, returns its final assistant output/artifacts and exposes the running preview. Independent execution of the unchanged fixed tests reports 8 assertions passed.
8. Follow-up, cancellation, Session close, retained artifacts and conversation, preview denial after close and cloud cleanup all pass. Browser TaskSpace 9 is finished and closed.

Session: `d2a6fc9b-774f-4649-a64e-50a2301502a8`. Original Run: `910a0558-d130-49c5-ba95-b2660c1f0a97`. Durable original-Run event count: 904.

## Deterministic rejection coverage

`TEST_DATABASE_URL=postgres://hexagon@127.0.0.1:55432/hexagon npx vitest run modules/tools/broker.test.ts` passed. Its real local HTTP fixture now exercises remote revocation after approval, invalid replacement validation, no repeated bad dispatch, successful credential rotation, stale approval rejection, fresh approval and a single write. It also denies a separate approval and verifies the cached error result produces no write. Existing uncertain-write reconciliation assertions still pass. `npm run check` passed.

Scope: API-key Tool expiry simulated by an actual HTTP 401, GUI invalid/valid reauthentication, real cloud Harness continuation, and deterministic approval refusal. This does not establish OAuth consent denial/refresh flows or the separate Python GUI authorization journey. Approval refusal is not claimed as a dedicated user-facing “deny credential authorization” feature.
