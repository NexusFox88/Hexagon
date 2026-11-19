# Connection lifecycle and first real provider verification

## Local integration

`npm run db:migrate` and `npm run check` passed. The PostgreSQL-backed suite completed with 3 files and 7 tests passing via `TEST_DATABASE_URL=postgres://hexagon@127.0.0.1:55432/hexagon npm test`.

Added verified coverage: connection validation before enablement; credential replacement invalidates old validation; invalid credentials do not enable a connection; late validation cannot bless a newer credential revision; Session pins configuration versions; required connection state and tenant scope; dependency-aware soft deletion; historical Session and encrypted credential retention.

The deletion test explicitly sets the fixture Session to closed in the database. It does not prove the product's resource teardown or close API, which remains to be implemented.

## Real E2B cloud smoke

Command: `npx tsx tooling/smoke-e2b.ts`.

Result: exit 0, verified, cleanup confirmed. Runtime was approximately 7 seconds. E2B SDK 2.64.0 was used with the user-provided Desktop credential, read without printing its value. One sandbox with a 180-second lifetime was created.

Verified operations:
- Authenticated sandbox listing.
- Sandbox creation with an operation idempotency key and ownership metadata.
- Real command execution returning `hexagon-cloud-ok` with exit code 0.
- Exact-byte file write/read roundtrip.
- Resource lookup by operation metadata.
- Resource deletion, followed by provider lookup confirming absence.

Private operation/resource record: `.local/evidence/e2b-9fd53db5-2573-4b9f-84fa-bbc71319d4b7.json`. It contains no credentials.

Not verified: E2B preview authentication, egress policy enforcement, full control-plane provisioning coordination, runtime/harness, model, GUI, or SDK journey. The adapter exposes implemented capability names, but those are not an acceptance claim. Daytona SDK 0.231.1 is installed; its adapter and actual verification remain pending.

Provider API research used the official [E2B SDK source](https://github.com/e2b-dev/E2B/blob/main/packages/js-sdk/src/sandbox/sandboxApi.ts) and installed type declarations. Daytona API reference: https://www.daytona.io/docs/en/typescript-sdk/.
