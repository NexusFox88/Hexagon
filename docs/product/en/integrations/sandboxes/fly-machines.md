# Connect Fly Machines

Fly Machines and Fly Sprites are independent providers. Use `fly-machines` here: each Session owns a dedicated App, private network, and Machine. The durable resource ID is the App ID. An App created before a lost Machine response must still be retained and reconciled.

## Configuration and permissions

Use a Token authorized for the target organization, App/Machine creation/deletion, and private proxy access. Access to an unrelated App alone is insufficient. The control-plane host also needs `fly` on PATH and functioning private transport. Listing validation does not prove that transport works.

| Field | Default | Constraint |
| --- | --- | --- |
| organization | personal | Lowercase letters, digits, hyphens |
| region | iad | Lowercase letters or digits |
| memory_mb | 4096 | Integer, 2048–16384 |

Machines currently use shared CPU with 2 vCPU; undefined config fields cannot override it. Configuration does not accept an existing App name, avoiding accidental ownership of shared resources.

These examples use local management clients; see [self-hosting](../../operate/self-host.md) for hosted initialization. The private key stays in the control plane. Retain the created connection ID rather than recreating it.

```python
import os
from hexagon import Hexagon
client = Hexagon.local()
connection = client.create_connection(
    kind="sandbox", provider="fly-machines", name="Fly workspace",
    credential=os.environ["FLY_API_TOKEN"],
    config={"organization": os.environ["FLY_ORGANIZATION"],
            "region": "iad", "memory_mb": 4096},
)
checked = client.validate_connection(connection["id"])
if checked["status"] != "ready":
    raise RuntimeError("Inspect Fly connection diagnostics")
client.update_connection(connection["id"], enabled=True)
```

```typescript
import { Hexagon } from '@hexagon/agent-sdk';
const client = await Hexagon.local();
const credential = process.env.FLY_API_TOKEN;
const organization = process.env.FLY_ORGANIZATION;
if (!credential || !organization) throw new Error('Set Fly account configuration');
const connection = await client.createConnection({
  kind: 'sandbox', provider: 'fly-machines', name: 'Fly workspace', credential,
  config: { organization, region: 'iad', memory_mb: 4096 },
});
const checked = await client.validateConnection(connection.id);
if (checked.status !== 'ready') throw new Error('Inspect Fly connection diagnostics');
await client.updateConnection(connection.id, { enabled: true });
```

Validation only lists organization Apps. Explicitly enable after ready validation; revalidate/enable after configuration or key changes. Existing Sessions remain pinned.

## Built-in and public OCI execution

Built-in Harnesses use `node:24-bookworm`. Follow the [first Session](../../start/first-session.md) with connection.id and a compatible model/Harness, verifying execution and artifacts.

For public OCI, follow [image registration](../harnesses/oci.md) and pin a digest. An OpenCode image in current scoped records is:

`ghcr.io/anomalyco/opencode@sha256:763ea3bce6bdaee6d6092775c83c03a90b11b2a74dcfb89942a4cb82a99f974e`

Use matching opencode-v1 protocol/command and inspect [exact combination records](../../../../../modules/harnesses/verification.ts) for models, SDKs, and scenarios. Registration is not a fresh execution pass. Independently verify both SDKs, task, files, required Tools, and cleanup.

Private images are unsupported; registry credentials are rejected. The VM may install Python, Bash, timeout, and other prerequisites using Alpine/Debian-family package managers. Unsupported preparation fails. Commands execute as root; image USER is not a verified isolation boundary. The source digest does not describe an unchanged prepared filesystem. The default image entrypoint is not automatically run; Runtime launches the registered command.

## Private access and limits

No public services are configured; existing App secrets or volumes are not inherited. Each App has its own private network. The control plane launches `fly proxy` on loopback to reach the specific Machine privately. Browsers use [Hexagon preview authorization](../../build/private-preview.md), never account Tokens or raw provider URLs.

A listening local proxy does not establish WireGuard, DNS, or guest readiness. Diagnose each layer. The connector does not declare network_allowlist; choose another provider when domain restrictions are required.

File reads are capped at 64 MiB with chunk checks; higher layers may impose smaller limits. Foreground commands allow at most 590 seconds and background commands 3600 seconds. These are not total Run duration limits.

## suspend/start and cold boot

Idle uses suspend; the next submit starts the Machine automatically. Fly can cold-boot without a usable memory snapshot, so the dependable boundary is filesystem state rather than process memory. Check Runtime, conversation, and preview services separately; arbitrary background processes are not guaranteed to continue.

Restore operates on the exact Machine under a lease to fence stale requests. It accepts an already started or suspended original Machine, not stopped/replacement compute or multiple Machines. Empty/ambiguous means the App exists with an unexpected resource structure requiring investigation.

Use [idle and wake](../../build/idle-and-wake.md) to verify two-turn files/conversation with exact image/model records. Do not manually replace compute to hide recovery failures.

## Cleanup and reconciliation

Close releases local proxies, deletes the Session-owned App, and confirms App absence. This applies only to that dedicated resource group, not every App in the organization. Do not add unrelated resources to it or reuse this deletion flow on shared Apps.

Partial creation can leave an empty App; absent compute does not establish App cleanup. Transport failure is not absence; explicit provider 404 is. Preserve original App/operation IDs and [reconcile](../../operate/reconciliation.md) without blindly creating another App after uncertainty.

For fly_machine_not_ready, inspect unique Machine/state/ownership. For fly_resume_state_pending, inspect the original state. For harness_runtime_prerequisites_unavailable, inspect image preparation. For fly_app_deletion_unconfirmed, inspect original App deletion.

This page is source-reviewed without new cloud execution. Historical scope is in the [execution matrix](../../../../../testing/execution-matrix.md) and [serverless ledger](../../../../../testing/evidence/2026-11-19-harness-serverless-matrix.json).

Sources: [connector](../../../../../integrations/sandboxes/fly-machines.ts), [private proxy](../../../../../integrations/sandboxes/fly-machines-proxy.ts). Next: [Sandbox overview](../sandboxes.md), [OCI Harness](../harnesses/oci.md).
