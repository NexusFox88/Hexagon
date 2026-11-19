# Connect Boat

Boat provides files, commands, private preview, and snapshot-backed stop/resume. The connector currently declares neither OCI nor domain allowlists. Hexagon Runtime/Harness own execution; check provider quota, deadlines, and cleanup separately.

## Configure and run a first task

Prepare an API key for the intended account. The only config field is size, accepting small, default, or large, defaulting to small. Do not reuse another provider's medium value, image, or CPU fields. Actual resources and quota depend on the account.

These local management examples read a private key. See [self-hosting](../../operate/self-host.md) for hosted initialization. Retain the connection ID rather than rerunning creation.

```python
import os
from hexagon import Hexagon
client = Hexagon.local()
connection = client.create_connection(
    kind="sandbox", provider="boat", name="Boat workspace",
    credential=os.environ["BOAT_API_KEY"], config={"size": "small"},
)
checked = client.validate_connection(connection["id"])
if checked["status"] != "ready":
    raise RuntimeError("Inspect Boat connection diagnostics")
client.update_connection(connection["id"], enabled=True)
```

```typescript
import { Hexagon } from '@hexagon/agent-sdk';
const client = await Hexagon.local();
const credential = process.env.BOAT_API_KEY;
if (!credential) throw new Error('Set BOAT_API_KEY');
const connection = await client.createConnection({
  kind: 'sandbox', provider: 'boat', name: 'Boat workspace', credential,
  config: { size: 'small' },
});
const checked = await client.validateConnection(connection.id);
if (checked.status !== 'ready') throw new Error('Inspect Boat connection diagnostics');
await client.updateConnection(connection.id, { enabled: true });
```

Validation only lists Sandboxes. Ready does not establish allocation, execution, or complete deletion. Enable explicitly, then use connection.id as sandbox_connection_id in the [first Session](../../start/first-session.md) with a compatible model/Harness. Independently run task, artifacts, and close through both SDKs. Revalidate/enable after key or size edits; existing Sessions remain pinned.

Creation enables snapshots and noEnv=true to avoid inheriting provider account environment; resume also sets noEnv. Provider credentials remain in the control plane. User-configured Agent environment is still readable by task code; noEnv does not make every variable secret.

## Execution and file limits

Connector command deadlines are 1–590 seconds for foreground and 1–3600 for background, defaulting to 60. These are command limits, not total Run duration. A background pid still requires Runtime/application health checks. Truncated output fails instead of becoming an incomplete success.

A single file write accepts at most 5 MiB and checks reported bytes. Reads bound base64 content to 7 MiB and verify decoded length; encoded length is not raw file size. Higher API/artifact layers can impose separate constraints. Verify small-file integrity first and design large deliverables within supported limits.

## Private preview

Access task services through [Hexagon private preview](../../build/private-preview.md). The connector requests public=false hosting, extracts the provider token, and uses a server-side `_port_auth` Cookie. It does not hand the token-bearing URL to browsers.

The application must listen on the intended port. Diagnose process, provider ingress, Cookie, and platform authorization separately. Do not expose a public port to bypass checks. Preview is development access, not production website deployment.

## Snapshots, TTL, and recovery

Stop retains a recoverable snapshot. The next submit to the same Session resumes and refreshes runtime TTL. Managed files/conversation can continue, but process memory, connections, and service liveness are not guaranteed. Provider archived maps to paused; ready/idle/running map to running. These mappings do not establish precise billing state.

Runtime TTL is different from final deletion: stopped compute may retain snapshots. The control plane owns durable deadlines and cleanup; stopping a local service does not prove remote release. Historical trial accounts had concurrency/TTL restrictions. Verify current account limits instead of turning historical counts into universal promises.

Follow [idle and wake](../../build/idle-and-wake.md): first-turn file write, second-turn read/conversation continuation, and separate service checks. A successful single turn does not prove restoration.

## Confirm asynchronous deletion

Final deletion has a separate operation receipt. The platform saves its ID, polls it, confirms targetId matches the original Sandbox, waits for status=completed, and then confirms resource absence. Blocked operations and observation timeouts are not successful cleanup.

**If the deletion receipt is lost, a missing Sandbox alone does not prove completed purge.** Retain unknown state and original IDs, following [reconciliation](../../operate/reconciliation.md). Creating another resource or deleting a different object does not resolve uncertainty. Stop, snapshots, and accepted deletion do not establish completed Session cleanup.

Creation uses the original operation ID as Idempotency-Key. Exact names and labels support paginated reconciliation. Similar names or incomplete lists do not establish ownership.

| Symptom | Investigate |
| --- | --- |
| boat_http_401 / 403 | API key and account permissions |
| Allocation/concurrency failures | Size, current quota, retained resources; avoid create loops |
| boat_command_output_truncated | File-based output with integrity checks |
| boat_command_completion_unknown | Original command state before repeating side effects |
| boat_file_exceeds_5_mib | Write-byte limit and higher-layer constraints |
| boat_deletion_blocked | Original deletion operation and target |
| boat_deletion_operation_missing | Missing receipt; preserve uncertainty |

This page is implementation-reviewed without new cloud execution. Historical journeys are in the [expanded matrix](../../../../../testing/evidence/2026-11-15-expanded-harness-matrix.md), with recovery scope in the [serverless ledger](../../../../../testing/evidence/2026-11-19-harness-serverless-matrix.json). Completion requires actual execution, both SDKs, required recovery, and confirmed final deletion.

Source: [Boat connector](../../../../../integrations/sandboxes/boat.ts). Next: [Sandbox overview](../sandboxes.md), [artifacts](../../build/artifacts.md), [reconciliation](../../operate/reconciliation.md).
