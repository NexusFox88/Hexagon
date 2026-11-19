# Public HTTP API / worker / real model integration

Command: `npx tsx tooling/smoke-api.ts`.

Successful journal: `.local/evidence/api-smoke-d0b0403a-37ca-46c4-87c6-82273701970e.json`.

This test started a real Fastify HTTP listener and production service classes, seeded only a test tenant/API key, and drove configuration and execution via authenticated HTTP requests. It used E2B, OpenCode 1.2.27 and the user's MiniMax-M3 credentials. Credentials and the test encryption key were not printed.

Verified:
- Create, validate and enable sandbox/model connections over HTTP.
- Create AgentDefinition and Session; upload the actual project through the files API.
- Repeat the same idempotent Run submission and get the same Run id.
- Worker provisions the real sandbox, bootstraps runtime/harness, verifies input hashes and executes the model task.
- GET Run returns completed state and a real assistant reply, persisted in PostgreSQL.
- Test file bytes match the originally uploaded fixed test; independent execution returns `2 assertions passed` and exit 0.
- Paginated event replay from a saved cursor equals the corresponding suffix.
- A follow-up Run in the same Session succeeds and describes the prior edit.
- Session close API completes provider deletion; provider lookup confirms absence.
- Completed Run output remains available after Session close.
- Sandbox connection can be deleted after Session close.
- Test-owned sandbox and 2 GiB template cleanup both confirmed.

Initial attempt `api-smoke-83ad4f2f-6e89-4e20-ac23-e7dc4085c2a0` failed before creating a Session because the client sent JSON Content-Type with no body. Fixed the request helper and preserved Fastify 4xx input errors instead of converting them to 500. Added HTTP regression coverage. Its template cleanup also succeeded.

Current local verification: `npm run check` passed; PostgreSQL-backed Vitest run passed 5 files / 15 tests; Python runtime suite passed 5 tests. SSE terminal event delivery was added and tested locally. The successful cloud test used paginated events, not a live SSE disconnect/reconnect. Final assistant extraction was subsequently improved to exclude intermediate progress messages and verified with a unit test; that extraction refinement has not had another cloud run yet.

Still unverified/incomplete: actual worker-process restart recovery, broker authorization/approval continuation, GUI, public Python/TS SDKs, Web project preview, exported artifacts, alternate/custom harnesses and cloud providers, enforced network controls, and the original full acceptance task. Worker dispatch currently supports OpenCode; it needs a general adapter dispatch before additional harness support. Do not equate this arithmetic integration fixture with full product acceptance.
