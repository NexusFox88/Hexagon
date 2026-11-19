# HTTP API reference

The management API is served under `/v1` at your control-plane origin. For a default local installation this is `http://127.0.0.1:8787/v1`. Use the configured HTTPS origin for hosted deployments. `/v1` is the route prefix, not proof that every development snapshot has an identical schema. Record the server build and read [upgrade notes](../changelog.md).

## Find an operation

Every literal management route in the current server has a draft operation-page assignment. The mapping checks route/page presence, not exhaustive schema accuracy or runtime acceptance. Use the contracts below for request/response behavior and the generated inventory for route permissions.

| Resource | Contract |
| --- | --- |
| Runs, events and cancellation | [Runs, events and cancellation](runs.md) |
| Session creation, files and lifecycle | [Session creation, files and lifecycle](sessions.md) |
| Session environment, authorization and grants | [Session environment, authorization and grants](session-access.md) |
| Artifact bytes and private previews | [Artifact bytes and private previews](artifacts-previews.md) |
| Approvals and Tool recovery | [Approvals and Tool recovery](approvals-tools.md) |
| Connections, validation and usage | [Connections, validation and usage](connections.md) |
| Applications and OAuth | [Applications and OAuth](oauth.md) |
| Managed Secrets | [Managed Secrets](secrets.md) |
| Application tokens | [Application tokens](tokens.md) |
| Agent templates and revisions | [Agent templates and revisions](agents.md) |
| Catalog and Harness registration | [Catalog and Harness registration](harness-registration.md) |
| Resource operation reconciliation | [Resource operation reconciliation](resource-operations.md) |
| Monitoring and collection queries | [Monitoring and collection queries](monitoring.md) |
| Local deployment configuration | [Local deployment configuration](deployment.md) |

## Authentication and common conventions

Trusted backend clients send `Authorization: Bearer <token>`. Local Console can use its separate workspace bootstrap. API identities resolve a tenant and role; every resource lookup/binding must remain tenant-scoped. Application tokens have an explicit route allowlist. A valid application token does not authorize approval decisions, account credential administration or arbitrary deployment changes. Missing/invalid identity returns 401; an application token on an owner route returns 403 `owner_token_required`.

Use `Content-Type: application/json` for JSON bodies. Parameter identifiers must satisfy the route schema, often UUID; URL-encode path values. Unknown fields are rejected where the schema is strict. Responses are JSON except artifact content, SSE and empty 204 responses. Do not assume every DELETE returns 204 or every creation returns 201: Run submission returns 202. See [errors](errors.md) and [limits](limits.md).

The following read-only request requires a real backend token already present in the environment. It does not create resources:

```sh
curl --fail-with-body --silent --show-error \
  -H "Authorization: Bearer $HEXAGON_API_TOKEN" \
  "$HEXAGON_API_URL/v1/catalog"
```

Keep Tokens out of terminal recordings and public evidence. `HEXAGON_API_URL` here is an example variable read by the shell, not a server bootstrap setting.

## Management route inventory

This table is generated from literal `api.get/post/put/patch/delete` registrations in [server.ts](../../../../apps/control-plane/server.ts). Application-token classification calls the actual [policy](../../../../modules/credentials/application-tokens.ts). Route presence is conditional on services supplied at startup; local deployment settings routes are not promised on hosted deployments. “Allowed” is the role check, not a waiver of ownership, state, capability or body validation.

<!-- http-routes:begin -->

| Method | Path | Application token |
| --- | --- | --- |
| GET | `/v1/tokens` | Owner required / 要求 owner |
| POST | `/v1/tokens` | Owner required / 要求 owner |
| POST | `/v1/tokens/:id/rotate` | Owner required / 要求 owner |
| DELETE | `/v1/tokens/:id` | Owner required / 要求 owner |
| GET | `/v1/health` | Allowed / 允许 |
| GET | `/v1/deployment` | Owner required / 要求 owner |
| PUT | `/v1/deployment` | Owner required / 要求 owner |
| POST | `/v1/deployment/ingress/retry` | Owner required / 要求 owner |
| POST | `/v1/deployment/ingress/stop` | Owner required / 要求 owner |
| GET | `/v1/secrets` | Owner required / 要求 owner |
| POST | `/v1/secrets` | Owner required / 要求 owner |
| GET | `/v1/secrets/:id` | Owner required / 要求 owner |
| PATCH | `/v1/secrets/:id` | Owner required / 要求 owner |
| DELETE | `/v1/secrets/:id` | Owner required / 要求 owner |
| GET | `/v1/applications` | Owner required / 要求 owner |
| PUT | `/v1/applications/:provider/oauth-client` | Owner required / 要求 owner |
| POST | `/v1/connections/:id/authorize` | Owner required / 要求 owner |
| GET | `/v1/authorization-flows/:id` | Owner required / 要求 owner |
| DELETE | `/v1/authorization-flows/:id` | Owner required / 要求 owner |
| GET | `/v1/catalog` | Allowed / 允许 |
| POST | `/v1/harnesses` | Owner required / 要求 owner |
| POST | `/v1/harness-packages` | Owner required / 要求 owner |
| GET | `/v1/connections` | Allowed / 允许 |
| POST | `/v1/connections` | Owner required / 要求 owner |
| GET | `/v1/connections/:id/usage` | Owner required / 要求 owner |
| GET | `/v1/connections/:id/dependencies` | Owner required / 要求 owner |
| GET | `/v1/connections/:id` | Allowed / 允许 |
| PATCH | `/v1/connections/:id` | Owner required / 要求 owner |
| POST | `/v1/connections/:id/discover-mcp` | Owner required / 要求 owner |
| GET | `/v1/connections/:id/authorization` | Owner required / 要求 owner |
| POST | `/v1/connections/:id/disconnect` | Owner required / 要求 owner |
| POST | `/v1/connections/:id/validate` | Owner required / 要求 owner |
| DELETE | `/v1/connections/:id` | Owner required / 要求 owner |
| GET | `/v1/agents` | Allowed / 允许 |
| POST | `/v1/agents` | Allowed / 允许 |
| GET | `/v1/agents/:id` | Allowed / 允许 |
| PUT | `/v1/agents/:id` | Owner required / 要求 owner |
| POST | `/v1/agents/:id/archive` | Owner required / 要求 owner |
| POST | `/v1/agents/:id/copy` | Owner required / 要求 owner |
| POST | `/v1/agents/preflight` | Allowed / 允许 |
| GET | `/v1/overview` | Owner required / 要求 owner |
| GET | `/v1/pending` | Owner required / 要求 owner |
| GET | `/v1/runs` | Allowed / 允许 |
| GET | `/v1/sessions` | Allowed / 允许 |
| GET | `/v1/sessions/activity` | Allowed / 允许 |
| GET | `/v1/fleet` | Owner required / 要求 owner |
| POST | `/v1/sessions/preflight` | Allowed / 允许 |
| POST | `/v1/sessions` | Allowed / 允许 |
| GET | `/v1/sessions/:id/access` | Allowed / 允许 |
| POST | `/v1/sessions/:id/access` | Allowed / 允许 |
| DELETE | `/v1/access/:id` | Allowed / 允许 |
| GET | `/v1/sessions/:id/environment` | Owner required / 要求 owner |
| GET | `/v1/sessions/:id/authorization` | Owner required / 要求 owner |
| DELETE | `/v1/sessions/:id/connections/:connection` | Owner required / 要求 owner |
| GET | `/v1/sessions/:id/initialization` | Allowed / 允许 |
| GET | `/v1/sessions/:id` | Allowed / 允许 |
| GET | `/v1/sessions/:id/files` | Allowed / 允许 |
| POST | `/v1/sessions/:id/files` | Allowed / 允许 |
| GET | `/v1/resource-operations` | Owner required / 要求 owner |
| GET | `/v1/resource-operations/:id` | Owner required / 要求 owner |
| POST | `/v1/resource-operations/:id/review` | Owner required / 要求 owner |
| POST | `/v1/sessions/:id/pause` | Owner required / 要求 owner |
| POST | `/v1/sessions/:id/resume` | Owner required / 要求 owner |
| POST | `/v1/sessions/:id/close` | Allowed / 允许 |
| POST | `/v1/sessions/:id/previews` | Allowed / 允许 |
| DELETE | `/v1/previews/:id` | Allowed / 允许 |
| POST | `/v1/sessions/:id/runs` | Allowed / 允许 |
| GET | `/v1/sessions/:id/runs` | Allowed / 允许 |
| GET | `/v1/runs/:id` | Allowed / 允许 |
| GET | `/v1/runs/:id/artifacts` | Allowed / 允许 |
| GET | `/v1/artifacts/:id/content` | Allowed / 允许 |
| GET | `/v1/runs/:id/events` | Allowed / 允许 |
| GET | `/v1/runs/:id/stream` | Allowed / 允许 |
| GET | `/v1/runs/:id/tool-calls` | Allowed / 允许 |
| POST | `/v1/runs/:id/tool-calls/:call/resolve` | Owner required / 要求 owner |
| POST | `/v1/runs/:id/tool-calls/:call/deny-authorization` | Owner required / 要求 owner |
| POST | `/v1/runs/:id/cancel` | Allowed / 允许 |
| GET | `/v1/runs/:id/approvals` | Allowed / 允许 |
| POST | `/v1/approvals/:id/decision` | Owner required / 要求 owner |

<!-- http-routes:end -->

Regenerate with `npx tsx tooling/generate-http-doc-index.ts`. No server, provider or model request is made by the generator. Operation-specific schemas, effects and curl workflows live in the linked reference pages. Provider-specific config details and executable end-to-end examples still require their own review. The generator also writes the [route coverage ledger](../../http-operation-coverage.json); assignment is not completion.

## Resource contracts and effects

| Resource | Request/response essentials | Side-effect boundary |
| --- | --- | --- |
| Catalog/applications | Capability and operation catalogs, not execution receipts | Readiness/registration does not certify real combinations |
| Connections | kind, provider, name, config and credential/Secret reference; selected operations and validation metadata | Creation, validation, enabling and authorization are distinct; validation can contact a provider |
| Harnesses | OCI image registration versus compatibility source package | Resolves/pins definition and digest; identical version conflicts if changed; not a cloud execution |
| Agents | Definition, bindings and optimistic expected_revision for updates | Saved configuration is optional; revisions do not rewrite existing Sessions |
| Session preflight/create | Exactly one of harness or agent_id plus connection IDs; optional resources/network/tools/initialization | Preflight is structural; creation pins config and can require credential-ingress readiness |
| Session files | `{files:[{path,content_base64}]}`; returns files metadata | Binary bytes represented by canonical Base64; paths relative, content limits apply |
| Run submit | `{input,origin?}` and `Idempotency-Key` | Accepted Run is durable; persist ID, query final state rather than treating 202 as completion |
| Tools/approvals | Original call/hash or approval ID; `approved` boolean for decisions | Account authorization, approval and caller-verified resolution are different operations |
| Artifact content | Binary response with SHA-256 header and attachment metadata | Exported bytes are separate from cloud workspace lifetime |
| Preview/access | Port/TTL or connection ID produces a scoped grant | URLs/grants are sensitive; revocation and Session close affect availability |
| Resource review | action acknowledge/reopen/reconcile, optional note | Acknowledgement is not confirmation of resource absence |
| Deployment | config plus expected_revision | Local owner-only, restart may be required; it is not a hosted provisioning API |

Exact field restrictions and examples are in [configuration](configuration.md), [Python](python.md), [TypeScript](typescript.md), [connection lifecycle](../build/connection-lifecycle.md), [OCI](../integrations/harnesses/oci.md), [approvals](../build/approvals.md) and [reconciliation](../operate/reconciliation.md). These links supplement, rather than replace, the outstanding per-operation reference audit.

## Idempotency, pagination and observation

For Run submission, persist the exact Session, input, origin and key before sending. The same request/key recovers the original Run; changed content conflicts. Session creation and other arbitrary POST operations do not inherit that guarantee. A transport timeout can follow a successful remote side effect. Investigate the original object/operation before repeating it.

Session and Run collection routes accept their implemented query filters; resource operations use limit/offset. A Session's Run list uses a `before` timestamp and a bounded page, rather than the global list's offset contract. Event queries use numeric-string `after` cursors with at most 500 entries. Do not apply one pagination strategy to every endpoint.

SSE `/runs/:id/stream` accepts `after` or Last-Event-ID, with explicit after taking precedence. Events are persisted first. Deduplicate and commit events/cursor together; `stream.end` is an unnumbered transport marker. Query the Run afterward. Disconnecting does not cancel execution. See [events and states](events-and-states.md).

## Other HTTP surfaces

`GET /health/live` is a non-authenticated liveness probe, not readiness. `/local/connect` is a conditional local bootstrap with its own protections, not hosted login. OAuth callbacks, preview grants and credential-access traffic have separate handlers and authentication; they are not anonymous alternatives to `/v1` management routes. Runtime endpoints inside the Sandbox are internal execution protocol and must not be used with owner tokens.

This reference does not advertise a nonexistent OpenAPI download or a generic deployment API. Until the operation-by-operation schema/examples are complete, inspect the linked route and domain implementation for exact behavior. This pass validates route inventory only, not HTTP execution or cloud acceptance.
