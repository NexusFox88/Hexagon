# Execution foundation verification

This is deterministic local integration evidence, not cloud or full journey acceptance.

Verified against the isolated local PostgreSQL database on 127.0.0.1:55432:

- `npm run db:migrate` succeeded.
- `npm run check` succeeded after API and execution changes.
- `TEST_DATABASE_URL=postgres://hexagon@127.0.0.1:55432/hexagon npm test` succeeded: 2 test files, 5 tests.

Coverage: encrypted credential round-trip, authenticated-data binding and tampering; concurrent idempotent submission; conflicting key payload; single active Run; tenant-scoped reads/events; expired lease fencing; approval invalidation on cancellation; event cursor replay; persisted final output; idempotent approval decision; authenticated HTTP route operations using Fastify injection.

The execution tests insert their own tenant and fixtures, then delete those rows. No model, provider, or external tool calls were made. No cloud resources were created. No credentials are included in this evidence.

Implemented: schema and migration, local encrypted secret storage, API-key authentication, initial-owner provisioning, Run repository, leases, approval decisions, cancellation, event pagination and partial HTTP API.

Still pending: Session/Agent and connection APIs; real adapters, worker coordination, runtime and harnesses; GUI; Python/TS SDKs; SSE; artifacts and preview; network policy; cloud E2E and cleanup validation. The acceptance ledger remains unchecked because these narrow tests do not prove complete product scenarios.
