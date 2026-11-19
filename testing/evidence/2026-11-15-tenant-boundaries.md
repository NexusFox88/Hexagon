# Tenant isolation through public HTTP routes

Command: `TEST_DATABASE_URL=postgres://hexagon@127.0.0.1:55432/hexagon npx vitest run testing/tenant-boundaries.test.ts`.

Result: one integration test passed on 2026-11-15. `npm run check` passed. The test starts an actual loopback HTTP server backed by an isolated PostgreSQL schema and authenticates two separate tenants with independently hashed API tokens. Both tenants create their own connections, Agent and Session through the public TypeScript SDK. The owner uploads private input, submits a Run, and the controlled execution fixture persists an artifact and pending approval. No cloud/model execution is claimed for this permissions test.

## Denial matrix

For each of 21 HTTP operations below, another authenticated tenant receives 404 and an unauthenticated caller receives 401. Response bodies do not contain the fixture's private artifact content or credential. Event-stream denial returns an ordinary error response, not an SSE stream.

| Surface | Checked operations |
| --- | --- |
| Connections | read, credential replacement, validation, deletion |
| Sessions | read, input-file listing/upload, Run listing/submission, close, preview creation |
| Preview grants | revoke another tenant's grant |
| Runs | read, cancel, event history, SSE subscription, artifact listing, Tool call listing |
| Artifacts | download content |
| Approvals | approve another tenant's pending operation |
| Tool outcomes | resolve a call through another tenant's Run |

Four additional Session creation requests try to use another tenant's Agent, Sandbox connection, model connection or Tool connection. Each is rejected with 404. The outsider's connection, Session, Fleet and Agent lists contain exactly its own IDs.

The owner registers a custom Harness package. It appears in the owner's catalog and not the outsider's; the outsider cannot create an Agent referencing it.

## No mutation or remote side effects

After all rejected calls, the owner's Run remains waiting_approval, its approval is still pending, its connection version is unchanged, its preview ticket remains valid and the owner can download the original artifact bytes. The outsider still has only its original Session, so rejected cross-resource bindings do not leave partial Sessions.

The provider factory is instrumented to fail on access, and its call count stays zero. Connection-validation counters do not increase during the rejected requests. Thus unauthorized validation/close requests are rejected before remote effects, rather than merely failing at a provider.

The first test attempt sent JSON Content-Type on empty POST requests, which Fastify correctly rejected as malformed with 400. The final test omits that header for empty bodies, ensuring the 404 assertions exercise authorization/resource lookup rather than malformed-request handling.

Scope: control-plane tenant isolation at real HTTP boundaries with persisted entities, plus tenant-scoped custom-package discovery. Provider resources and Harness execution are controlled fixtures; separate cloud journeys establish those paths. Preview tickets are bearer grants by design; this test checks who can create/revoke them and does not claim that a deliberately shared valid ticket is bound to the recipient's API identity.
