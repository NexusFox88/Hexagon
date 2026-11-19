# Python and TypeScript SDK verification

Implemented public clients in `sdk/typescript` and `sdk/python/hexagon`. Both support connection setup, Agent/Session APIs, uploads, idempotent Run submission, query/cancel, paginated events, SSE cursor resumption, approval decisions and Session close. The clients do not implement the server-side broker or approval continuation simply by exposing those endpoints.

## Real cloud evidence

Command: `HEXAGON_BOTH_SDKS=1 npx tsx tooling/smoke-api.ts`.

Journal: `.local/evidence/api-smoke-3f1df6c7-3053-44c5-97f8-fdfac1045c30.json`.

- TypeScript SDK drove configuration, Session/project setup and actual OpenCode/MiniMax execution.
- Python independently created a second Session, uploaded the project and submitted a real task.
- Both primary tasks and follow-ups completed.
- Python continued the TS-created Session, then TS continued the Python-created Session; both completed with real model replies.
- Python disconnected its live SSE generator after the first event, reconnected using its id and received 456 subsequent events including stream.end without replaying that first event.
- Both projects' fixed test files were compared to the original bytes; independent command execution passed the two assertions.
- Session close and connection deletion were driven by the TS orchestrator after cross-language checks. Python close/cancel methods have not had a real executing-cloud-Run acceptance test yet.
- Cloud sandbox and test-owned template cleanup confirmed.

This remains the arithmetic fixture, not the original Web project + requirements/report Tool + GUI acceptance scenario. Real TS live-stream reconnection, actual approval handling through both SDKs, artifacts and cancellation races remain pending.

## Local protocol and build verification

- PostgreSQL/localhost test runs Python as a separate process against the actual HTTP listener; checks cross-language operations, uploads, idempotency, cancellation, stream closure without cancellation, and cursor replay.
- TS SSE tests cover UTF-8 split across byte boundaries and abrupt EOF before a terminal event. Such EOF now raises a reconnectable transport error instead of silently implying completion.
- `npm run check`: passed.
- PostgreSQL-backed `npm test`: 7 files / 18 tests passed.
- `npm --prefix sdk/typescript run build`: emitted JS and declarations.
- `python3 -m pip wheel --no-deps --no-build-isolation -w .local/sdk sdk/python`: built a local wheel.

Packages were not published. No commits were created. The final EOF-handling refinement was made while the cloud test was running and was verified locally; it does not affect the observed successful terminal cloud stream.
