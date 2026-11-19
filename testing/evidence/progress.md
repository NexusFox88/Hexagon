# Development progress

## 2026-11-15
- Read complete user attachment; exact copy is testing/journey-source.md.
- Repository initially empty; created architecture, agent instructions and requirement-by-requirement acceptance ledger.
- Available tools: Node/npm/pnpm, Python/uv, PostgreSQL, Docker CLI. Docker daemon is not running.
- Provider credential file exists on Desktop; only provider names were inspected, not printed values. Mentions E2B, Daytona, Modal, Vercel, Blaxel, Sprites. Credentials unvalidated.
- Current inherited environment exposes EXA_API and MiniMax model/base URL names; other keys require controlled discovery, without dumping environment or shell files.
- Dependencies installed; TypeScript compilation succeeds. The original stalled install was terminated after process verification and replaced with an authorized install.
- Isolated PostgreSQL cluster is running on loopback port 55432; schema migration succeeded.
- Implemented encrypted secrets, tenant API authentication, initial-owner provisioning, transactional Run operations, leases/fencing, approvals, cancellation and partial HTTP API.
- Seven deterministic tests pass, including actual PostgreSQL transactions, connection lifecycle races and Fastify API injection. See dated evidence files for exact scope. Full product acceptance has not passed. No commits created.
- Connection CRUD/validation and Agent/Session APIs implemented. E2B adapter implemented; actual create/command/files/reconciliation/delete smoke passed with cleanup confirmed. Preview/network controls remain unverified. Daytona SDK installed, adapter pending.
- Persisted lifecycle coordinator and Session close implemented; 8 TypeScript/PostgreSQL tests and 3 Python supervisor tests pass. Runtime bootstrap/real subprocess/idempotency/events/workspace/auth rejection passed in E2B with cleanup confirmed. One prior cloud attempt had an unreproduced TypeError; see runtime-lifecycle evidence. No real model-driven Agent executed yet.

## Next work
Both public SDKs implemented and built locally. Real SDK tasks and bidirectional Session continuation passed with OpenCode/MiniMax/E2B. Python live SSE disconnect/reconnect passed; fixed tests unchanged and cleanup confirmed. Current local suite: 18 Vitest tests. See 2026-11-15-python-typescript-sdks.md. Next prioritize tool broker with credential wait/approval continuation, Console, artifacts/Web preview, then alternate adapters and failure branches.

Public HTTP API -> durable worker -> E2B -> OpenCode/MiniMax task and same-Session follow-up now passed, including unchanged fixed tests, event cursor replay, close API cleanup and retained output. See 2026-11-15-public-api-worker.md. SSE implemented and locally tested; actual worker restart and full original journey remain pending. Current checks: 15 Vitest tests, 5 Python tests, TypeScript compilation pass.

Latest integration: real OpenCode 1.2.27 + MiniMax-M3 task passed in an E2B 2 GiB template, including independent test execution; sandbox and template cleanup confirmed. Native binary invocation exposed the prior masked SIGKILL. Default E2B base has insufficient memory for this harness; select a >=2 GiB template. See 2026-11-15-real-opencode-success.md for scope and remaining assertions. Project upload APIs and DB migration added and tested.

Integrate the lifecycle/runtime into a durable execution worker and add actual model-driven harnesses, tool authorization/approval continuation, artifacts and input uploads. Verify preview/network controls and add Daytona adapter. Build GUI and both SDKs, then execute the complete acceptance journey. All unchecked acceptance requirements remain active.
