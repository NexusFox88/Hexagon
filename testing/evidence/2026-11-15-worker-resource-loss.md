# Worker recovery after resource loss — 2026-11-15

The worker previously left a Run indefinitely eligible for recovery even after the provider definitively reported its already-bound Sandbox missing. It now terminates that Run with `sandbox_lost`. A transport error remains `execution_reconciliation_required` and does not imply destruction.

`modules/execution/worker.test.ts` uses the real PostgreSQL Run/lease/event services and SandboxLifecycle with a controlled provider connector. It starts a real worker against a persisted running Run with an expired prior lease and existing resource binding.

Verified both cases:

- Provider inspect returns null: durable Run is failed with `sandbox_lost` and a `run.failed` event.
- Provider inspect throws a transport error: Run stays running with reconciliation required and a `run.recovery_needed` event.
- Neither case creates a new resource or installs a replacement Harness. Recovery claims are recorded.

Command: `TEST_DATABASE_URL=postgres://hexagon@127.0.0.1:55432/hexagon npx vitest run modules/execution/worker.test.ts` — 2 tests passed.

This is deterministic fault evidence, not an actual cloud resource-loss E2E or proof of the entire interruption/cancellation branch.

After these changes and Daytona expiry reporting: `npm run check` passed; `TEST_DATABASE_URL=postgres://hexagon@127.0.0.1:55432/hexagon npm test` passed all 37 tests across 17 files. Each database suite ran in an isolated test schema, separate from the concurrent real cloud journey.
