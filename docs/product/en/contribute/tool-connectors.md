# Add a Tool or application connector

Application connectors run upstream requests in the control plane using tenant-owned Connections. The shared Tool broker owns authorization, approval, request identity and uncertain outcomes. Sandbox and Harness integrations consume the existing Tool contract; they do not need application-specific code or account credentials.

Read [application architecture](../../../application-connectors.md), [the broker](../../../../modules/tools/broker.ts), and [acceptance](../../../../testing/acceptance.md) before changing behavior.

## Choose the integration surface

| Need | Implementation path |
| --- | --- |
| Named application with a fixed operation catalog | AppDefinition in integrations/apps; shared application registry and broker |
| Your service with fixed JSON operations | Existing [HTTP Tools](../integrations/http-tools.md) configuration; add a new adapter only if the contract cannot express it |
| An existing remote MCP server | Existing [Remote MCP](../integrations/mcp.md) discovery and binding workflow |
| Protected HTTP access from guest code | HTTP Connection access policy; this is distinct from broker-mediated Tool approval |

Do not build a second credential store or bypass approval by moving application requests into the guest. Keep source attribution and licenses when adapting existing request mappings; current reused mappings retain their provenance under third_party/activepieces.

## Define a bounded read and write operation

[types.ts](../../../../integrations/apps/types.ts) defines AppDefinition, AppOperation and RequestSpec. Each operation supplies a strict object input schema, a semantic `write` flag and a fixed request mapping. Encode path identifiers, bound strings and pagination, reject unknown properties, and keep host/method selection outside model arguments. A POST can be a read, as in Notion search; classify side effects by semantics rather than HTTP verb.

This illustrative excerpt belongs in an integrations/apps module. The `.invalid` service is deliberately unavailable; implement and test against your own controlled service before registration:

```ts
import { operation, id, string, encode } from './types.js';

export const reportOperations = {
  read_report: operation(
    'Read one report.', false, { report_id: id }, ['report_id'],
    a => ({ url: `https://reports.example.invalid/reports/${encode(a.report_id)}`,
            method: 'GET' }),
  ),
  create_report: operation(
    'Create a report after approval.', true,
    { title: string, text: string }, ['title', 'text'],
    a => ({ url: 'https://reports.example.invalid/reports', method: 'POST',
            body: { title: a.title, text: a.text } }),
  ),
};
```

Wrap these operations in an AppDefinition with id, name, category, credential_url and a read-only `verify` request. Add it to the applications list in [registry.ts](../../../../integrations/apps/registry.ts). A working reference is Todoist's `get_task` / `create_task` in [productivity.ts](../../../../integrations/apps/productivity.ts).

The current registry defaults to non-write operations. Explicitly selected writes receive approval and `replay: 'never'`. Its broker-facing method is derived from `write`; the actual upstream HTTP method comes from RequestSpec. Do not assume those are identical when auditing dispatch. Each Session binding still limits which connection and operation the Harness may use.

## Add authentication and scoped verification

Default authentication is Bearer. Use AppDefinition's auth hooks only where the provider requires a different header, compound credential or token exchange. Keep secrets out of operation arguments, schemas, result text, URLs and diagnostic output. The shared request path rejects redirects, bounds results, and redacts known credential values; that is not a substitute for reviewing provider response content and preventing secret leakage at the source.

API keys use managed credential storage. OAuth uses the existing [OAuth module](../../../../modules/apps/oauth.ts), encrypted token envelopes and tenant/deployment app configuration. Declare actual endpoints, scopes and client authentication rules. Reuse the expiring one-use transaction bound to tenant, connection version, provider and redirect URI; do not implement an ad hoc callback or return tokens to the browser. Account/permission changes invalidate previous approvals. Token refresh has separate concurrency and version semantics.

A successful identity request does not prove every selected operation is permitted. Add operation scopes, safe permission probes or metadata checks where available; otherwise leave the result unknown. Never validate write permissions by silently sending a message or creating a real object. Real acceptance writes need an explicitly authorized disposable target. Local disconnection does not establish provider-side grant revocation.

Check tenant ownership at connection, Secret, OAuth transaction, Session binding and Tool-call lookup boundaries. An upstream object ID is not proof that a caller owns the Hexagon resource referring to it.

## Preserve approval and unknown-outcome semantics

The broker persists a call and request hash before dispatch, rejects the same call ID with different arguments, and pins dispatched connection/version and execution policy. Authorization establishes usable account access; approval permits a particular side effect. Neither replaces the other.

Use the shared error classification. In the current application transport, 401 requests reauthentication; most other 4xx responses except 408 become rejected results; 5xx, transport failures and ambiguous response processing can leave the outcome unknown. Application-level error envelopes also need interpretation: a Linear mutation with GraphQL errors can have taken effect even with `data: null`. Do not classify every HTTP 200 as success or every error body as proof of no write.

For a lost write response, stop and retain the original call. Query remote records using safe read operations or the provider UI. Then follow [Tool reconciliation](../../../tool-reconciliation.md): resolve with the exact `request_hash`, observed outcome, result text and evidence. Resolution records an operator conclusion and does not send another upstream request. Repeating an identical resolution is idempotent; conflicting or stale decisions fail. If the remote result cannot be established, keep it unknown or cancel the Run; do not fabricate success or issue another create.

## Test the concrete read/write pair

Use fake transport plus database-backed broker tests. For the example above, maintain an in-memory report store and a request counter in the test fixture. Return a known report for reads; let the write fixture store a report and deliberately lose its response to exercise uncertainty.

| Case | Required assertions |
| --- | --- |
| Read mapping | Fixed host/path/method, encoded ID, no unexpected body, schema rejects extra fields |
| Write before approval | No upstream request and zero new reports |
| Denied authorization or approval | Zero writes; original invocation does not bypass the denial |
| Approved write | Exactly one report; result is delivered to the original call |
| Repeated identical decision/call | No duplicate report; changed arguments under the same ID conflict |
| Lost response after storing | Call remains unknown; broker reconstruction does not repeat the write |
| Verified resolution | Exact request hash required; one stored outcome and no extra upstream dispatch |
| Credential rotation or cancellation | Stale approval/resolution rejected as applicable; late response cannot restart a cancelled Run |
| Tenant mismatch | Foreign connection, Secret and call inaccessible; zero provider requests |
| Authentication and payload limits | Reauthentication, permission rejection, oversized/malformed results and redaction tested separately |

Existing regression entry points are:

```sh
npx vitest run integrations/apps/registry.test.ts modules/tools/applications.test.ts modules/tools/authorization-denial.test.ts modules/tools/cancellation.test.ts
```

Use an isolated `TEST_DATABASE_URL` as described in [testing](testing.md). Add assertions for the new provider rather than treating existing suite success as its coverage. OAuth changes also require state replay/expiry, refresh concurrency and permission-change tests.

## Finish the user journey and evidence

Update application discovery, operation descriptions, credential instructions and Console forms as needed. Follow the [Console contract](../../../console-design.md): complete en/zh-CN catalogs, accessible application-owned controls, keyboard support, account selection and credential clearing. Review both languages and OAuth cancel/return behavior. Keep Agent Tools separate from platform Sandbox settings.

Run both SDKs against the public API and a real cloud Agent using the actual read operation. Exercise an authorized disposable write, approval, response-loss recovery where controllable, and confirmed cleanup. Record exact account permission scope without publishing account secrets or private content. External messages require explicit authorization; this guide does not authorize sending them. If no account is available, report contract coverage and real-account verification as separate statuses.

Add the provider/operation guidance to [application integrations](../integrations/apps.md), update scoped evidence, and preserve failed attempts. A connector test pass cannot justify a blanket real-account badge.

Next: [application integrations](../integrations/apps.md), [reconciliation](../operate/reconciliation.md), [testing and evidence](testing.md).
