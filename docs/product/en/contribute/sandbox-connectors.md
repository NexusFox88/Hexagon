# Add a Sandbox connector

A Sandbox connector translates cloud resource operations and guest primitives into the shared control-plane contract. The Sandbox Runtime continues to own Harness processes. Keep provider-specific authentication, transport, pagination and lifecycle details inside the connector; do not add provider branches to generic Run orchestration.

Read [architecture](../../../architecture.md), [acceptance](../../../../testing/acceptance.md), and the [codebase map](codebase.md) before changing behavior. This guide describes an extension workflow; its example is not a newly implemented or cloud-verified provider.

## Start with the actual contract

The authoritative interface is [SandboxConnector](../../../../modules/sandboxes/connector.ts). Use [Boat](../../../../integrations/sandboxes/boat.ts) as a compact reference for HTTP operations, exact operation lookup and asynchronous deletion. Its private-port and TTL behavior is provider-specific; do not copy it without checking the new provider's semantics.

| Contract | Required behavior |
| --- | --- |
| `create(request)` | Honor operation/session identity, requested timeout and network policy. Reject unsupported policy before remote allocation. Return validated resource identity and state. |
| `findByOperation(operation)` | Enumerate all exact matches, including pagination. Return zero, one or multiple results honestly; do not pick the first match. |
| `inspect(id)` | Return `null` only for confirmed absence. Authentication errors, timeouts and malformed responses remain errors. |
| `destroy(id)` | Confirm resource deletion according to provider semantics; a stop or accepted deletion request is insufficient. |
| `execute(id, command, options)` | Preserve stdout/stderr, foreground exit status and background startup uncertainty; enforce bounds and report truncation. |
| `write` / `read` | Preserve exact binary bytes and enforce explicit limits; verify transfer completeness. |
| `preview(id, port)` | Return a private internal target and server-side headers. Release request-scoped tunnels when the response body settles. |

`preview` is required by the interface, but an implementation must not advertise public preview capability unless the complete access path works. An unsupported path should fail explicitly. Provider account keys never enter the guest or browser. Private transport must reach Runtime independently of any user-facing preview capability.

## Separate adapter registration from resource implementation

A `ConnectionAdapter` supplies a strict configuration schema, capability list and `validate(config, credential)` method. Validation returns safe metadata such as the operations actually checked; it must not return upstream response bodies or tokens. A successful list request proves list access, not creation quota, image support or full execution permissions.

Use this **structural sketch**, not a runnable implementation. `ExampleConnector` must implement the full interface above; every placeholder capability needs evidence before use:

```ts
import { z } from 'zod';
import type { ConnectionAdapter } from '../../modules/connections/connections.js';

export const exampleConfig = z.object({
  region: z.string().min(1),
}).strict();

// ExampleConnector is the provider implementation you supply.
export const exampleConnection: ConnectionAdapter = {
  kind: 'sandbox',
  provider: 'example',
  config: exampleConfig,
  capabilities: ['files', 'commands'],
  validate: (config, credential) =>
    new ExampleConnector(config, credential).validate(),
};
```

Place the implementation in integrations/sandboxes and register its adapter/factory in [the shared registry](../../../../integrations/sandboxes/registry.ts). Add the provider's genuine setup URL. API and worker use that same registry.

**Current registration caveat:** the registry's exported adapters uniformly attach `contract_tests: true` and `live_resource: true`. Adding an entry would inherit those claims. Before exposing a new provider, obtain the matching evidence or change that mapping to provider-specific evidence metadata. Registration itself is never evidence. The retained Daytona factory is for historical cleanup, not a template for advertising an unverified candidate.

## Implement lifecycle receipts before the happy path

The shared [lifecycle](../../../../modules/sandboxes/lifecycle.ts), [operation ledger](../../../../modules/sandboxes/operations.ts) and [image preparation](../../../../modules/sandboxes/image-preparation.ts) own durable intent, ownership and fencing. The connector must supply enough exact identifiers for them to reconcile after a crash.

1. Carry the persisted `operation_id` into provider idempotency keys and/or exact names and labels. Never replace it after a timeout merely to obtain a successful create response.
2. If creation returns an asynchronous operation handle, invoke `request.record(resourceId, providerOperationId)` when supplied before polling. If persistence fails, preserve the uncertain outcome.
3. After response loss, reconstruct the connector and query exact operation matches. Zero matches does not universally prove non-allocation; eventual consistency and unresolved accepted operations can still require review. Multiple matches are ambiguous, not permission to adopt one arbitrarily.
4. For asynchronous deletion implement `reconcileDeletion(id, context)`. Persist the accepted handle with `context.record`, then resume polling that handle after restart. Boat demonstrates why early resource disappearance without the deletion receipt is insufficient to certify purge.
5. Implement `cleanupAssociatedResources` when endpoints or other owned objects outlive compute. Never delete shared projects, account credentials or another Session's resources.

A definitive provider refusal is different from an unknown transport outcome. `SandboxCreationRejected` currently encodes quota refusal; use it only when the provider proves that no resource or operation was accepted. Do not turn all 429 responses or timeouts into definitive rejection.

## Declare only supported policies

Optional methods and properties cover image preparation, pause/resume, snapshots, preflight, native delegated access and associated-resource cleanup. Implement a coherent lifecycle rather than stubbing methods to succeed:

- `resumeMode: 'memory'` and `'filesystem'` have different recovery semantics. Filesystem resume requires Runtime restart; preserve the workspace and Harness caches under a durable root when `/tmp` is cleared. `reconcileResume` must converge on the existing resource, not allocate replacement compute silently.
- Set control-plane expiry where required and test reconciliation after restart. A stopped control plane cannot enforce timely deletion. Provider standby, explicit pause, expiry and deletion are different states.
- If using snapshots, persist checkpoint handles before depending on them, restore with the new operation context, and remove owned snapshots during cleanup. Account for changed compute IDs.
- If using prepared images, implement the prepare/inspect/find/delete lifecycle and persist image/build receipts. Support public/private registry credentials only when the actual provider path supports them; credentials stay inside the control plane.
- Reject unsupported allowlists before allocation. A declared network policy needs real allowed/denied probes. Native credential access accepts delegated proxy grants, never original upstream secrets.

See [serverless lifecycle](../concepts/serverless-lifecycle.md) and [capabilities and evidence](../concepts/capabilities-and-evidence.md). Do not infer capabilities from a vendor marketing label.

## Wire the user-facing setup

The Console currently has provider-specific form rendering, configuration serialization and a provider-name list in [app.js](../../../../apps/console/app.js). Update all relevant paths alongside registration; catalog inclusion alone does not create a complete setup form. Provide useful field constraints, credential instructions and scoped validation feedback.

Follow the [Console design contract](../../../console-design.md): application-owned accessible controls, complete en/zh-CN catalogs, keyboard/focus behavior and actual browser review in both languages. Keep Sandbox platform configuration separate from model endpoints and Agent Tools. Add a product integration page with prerequisites, limits, failure recovery and exact verification scope.

## Verify before promoting support

Start with fake transports and the existing [Boat tests](../../../../integrations/sandboxes/boat.test.ts). Cover these outcomes explicitly:

| Scenario | Required observation |
| --- | --- |
| Unsupported policy | Zero allocation requests |
| Create response lost | Original operation retained; no blind second create |
| Lookup returns zero / one / multiple | No false absence claim; exact adoption only when unambiguous; ambiguity retained |
| Deletion accepted, blocked or response lost | Handle persisted before polling; restart resumes reconciliation; no premature closed state |
| Inspection auth/network failure | Error retained, never converted to absence |
| Binary files and command failures | Exact bytes; nonzero exit preserved; timeout/truncation not reported as success |
| Private access and tunnel close | No upstream key in guest/browser; local transport resources released |
| Pause/resume and expiry | Workspace preserved; Runtime recovered according to mode; cleanup reconciled |

For the existing reference implementation, the targeted command is:

```sh
npx vitest run integrations/sandboxes/boat.test.ts
```

For your new implementation, add its own suite and run it together with affected lifecycle, operation, expiry, checkpoint and image-preparation suites. Follow [testing](testing.md) for database configuration and full gates. These deterministic results do not certify a real account.

Then run both independent SDK journeys with a real provider and model, cross-language continuation, declared capabilities, failure/recovery and confirmed cleanup. Verify Console onboarding and authenticated preview where supported. Preserve private resource IDs and failed attempts; record the exact provider, Harness/version/digest, model protocol, SDK artifacts, scenario and date. Only that scoped evidence can promote the corresponding [verified combination](../integrations/verified-combinations.md). Do not label all Harnesses or protocols verified from one successful row.

Next: [testing and evidence](testing.md), [resource reconciliation](../operate/reconciliation.md), [verified combinations](../integrations/verified-combinations.md).
