# Local startup, health and restart persistence

Date: 2026-11-15. Real control-plane subprocesses, real PostgreSQL and a local authenticated HTTP fixture. No cloud resources or model calls in this test.

Command: `npx tsx tooling/smoke-startup.ts`.

Final run exited 0 with verified state. Private evidence: `.local/startup/hexagon_startup_22552a4c3f3049b981b1e23649a65a2c/evidence.json`. An earlier successful run was retained under `hexagon_startup_04a0faec953c459dbfde54ce210beda2`; the final run adds whole-process-group shutdown verification and the current health response.

## Verified workflow

- New database schema and empty private data directory, isolated from development and cloud-acceptance state.
- Invoked the documented `npm run db:migrate` twice, then `npm run dev` with separate API/preview ports.
- Public liveness and Console HTML served; anonymous authenticated-health request returned 401.
- Initial owner access and encryption key were generated with mode 0600. Values were never printed.
- Authenticated health reported API/database ready, execution worker running and credential cipher roundtrip ready.
- Created a credential-bearing HTTP Tool connection, validated it against a real authenticated local endpoint, and enabled it. Created an AgentDefinition.
- Stopped the whole test process group, restarted through `npm run dev` against the same data/schema, and used the original token.
- Owner file and key bytes remained unchanged. Connection, enabled flag and AgentDefinition persisted. Revalidation succeeded using the retained encrypted credential, proving actual decryption after process restart.
- Health after restart also checked a stored encrypted record.
- Changed only this disposable deployment's key, restarted, and verified `/v1/health` returned 503 with credential backend unavailable. Restored the original key afterward.
- Each stop confirmed the entire child process group disappeared without forced termination. Fixture and database clients closed.

## Product changes

The authenticated health endpoint now includes credential-backend status. Its check covers an encryption/decryption roundtrip and one tenant-scoped stored record when available; it is not a full historical secret-integrity scan. Failure returns 503 without secret values or crypto exception text.

Worker health exposes a busy flag instead of the global active Run id, avoiding another tenant's resource identifier in a health response. Database and worker state remain explicit.

## Verification and limits

`npm run check` passed. The full PostgreSQL regression suite passed 40 tests in 18 files. The final startup smoke passed after the process-group check was added.

Test environment: Node v24.8.0, already installed project dependencies and a running local PostgreSQL service. This proves application initialization and process restart on the provided machine, not installation of OS prerequisites or hosted deployment. Console rendering and user interaction are covered separately by the GUI initialization evidence; this smoke verifies the Console is served by the documented startup command.

This completes the initial startup/restart requirement in combination with the GUI record. It does not prove recovery of an in-flight cloud Run after worker failure; that remains a separate fault-acceptance item.
