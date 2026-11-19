# Connect Upstash Box

Hexagon currently uses persistent Box: disk is retained while pause/resume manages idle compute. Hexagon Runtime and the selected Harness execute tasks; the provider's built-in Agent runner is unused. Historical Ephemeral Box, native TTL, and early transport probes are not current onboarding steps.

## Configure a connection

Prepare an API key authorized to access, create, and delete Boxes. The only config field is `size`: `small`, `medium`, or `large`, defaulting to `small`. Do not add another provider's CPU, memory, or image fields. Check current account specifications, quota, and availability separately; this page makes no fixed pricing claim.

These local management-client examples read a private API key without passing it into the Sandbox. See [self-hosting](../../operate/self-host.md) for hosted initialization. Save the connection ID; rerunning creation produces additional connections.

```python
import os
from hexagon import Hexagon
client = Hexagon.local()
connection = client.create_connection(
    kind="sandbox", provider="upstash", name="Upstash workspace",
    credential=os.environ["UPSTASH_BOX_API_KEY"], config={"size": "small"},
)
checked = client.validate_connection(connection["id"])
if checked["status"] != "ready":
    raise RuntimeError("Inspect Upstash connection diagnostics")
client.update_connection(connection["id"], enabled=True)
```

```typescript
import { Hexagon } from '@hexagon/agent-sdk';
const client = await Hexagon.local();
const credential = process.env.UPSTASH_BOX_API_KEY;
if (!credential) throw new Error('Set UPSTASH_BOX_API_KEY');
const connection = await client.createConnection({
  kind: 'sandbox', provider: 'upstash', name: 'Upstash workspace',
  credential, config: { size: 'small' },
});
const checked = await client.validateConnection(connection.id);
if (checked.status !== 'ready') throw new Error('Inspect Upstash connection diagnostics');
await client.updateConnection(connection.id, { enabled: true });
```

Validation performs list_boxes, reports control_plane expiry enforcement, and requests no provider TTL. Listing does not establish allocation or Harness execution. Explicitly enable after validation. Revalidate/enable after key or size changes; existing Sessions retain pinned configuration.

## Execute the first task

Use the connection ID as sandbox_connection_id in the [first Session](../../start/first-session.md), selecting a compatible model/Harness. The connector creates a persistent runtime=node Box with keepAlive=false, while Hexagon still selects and installs the Harness. Independently verify Run completion, file bytes, artifact export, and close through Python and TypeScript.

Declared capabilities are files, commands, preview, pause_resume, and filesystem_resume. OCI and network_allowlist are absent. Choose a supporting provider when egress restrictions are required; do not silently downgrade to allow-all.

Commands have a remote deadline. Accepted background startup still requires Runtime health or application-port checks. Submission is not task completion, and unknown completion is not permission to repeat external side effects.

## Private HTTP and transport limits

[Private preview](../../build/private-preview.md) relays an authenticated exec session's stdin/stdout to the Sandbox port without a public port URL. The API key stays in the control plane, with separate Runtime and preview authorization. The application must actually listen on that port.

Current Upstash relay limits are:

| Limit | Meaning |
| --- | --- |
| 8 MiB queued output | Separate stdout/stderr pending-consumption checks; slow consumers can trigger upstash_tunnel_buffer_limit |
| 16 MiB cumulative input | Bytes sent to the remote process per transport session, including HTTP encoding; not pure upload file size |

**8 MiB is not a total response-body size limit.** Continuously consumed streams may pass in chunks, but that does not promise arbitrary transfer sizes. Higher API, artifact, or proxy layers can impose independent limits. Verify integrity, total size, slow consumption, and interruption separately. A limit failure is not a successful truncated result.

## Pause and the next turn

Idle handling calls pause; the next submit automatically resumes and prepares Runtime. Managed files and conversation data use filesystem preservation. Process memory, open connections, and arbitrary services are not preserved guarantees. Do not read normalized running state as proof of active CPU: the connector maps provider idle to running to represent an existing resource.

Write a known file and record a conversation test value in the first turn. After the intended idle condition, submit another turn to the same Session and inspect real file reads and conversation continuation. Verify independently in Python and TypeScript; recheck preview services where needed. See [idle and wake](../../build/idle-and-wake.md).

## Expiry and close

The control plane owns durable deadlines and final deletion. Pause retains the Box and does not release every resource. Stopping the local control plane does not guarantee provider expiry deletion. Confirm Box absence after close; pause, idle, or accepted deletion requests are insufficient.

Creation derives a name from the durable operation ID with a hexagon label. Find that original name after a lost response. A resource still visible after deletion produces upstash_deletion_unconfirmed. Only provider 404 is treated as absence; authentication or transport failures remain uncertain. [Reconcile](../../operate/reconciliation.md) the original resource rather than allocating another to test whether the first succeeded.

## Diagnose and verify

For authentication failures, check key/account permissions. For allocation failures, check size/quota. For unknown background startup, inspect the original process and Runtime. For tunnel disconnects, check service, exec channel, and output consumption. buffer_limit means queued output; request_limit means cumulative input. Do not include raw API keys or unsanitized task content in reports.

Completion includes real execution, binary integrity, private access, two-turn file/conversation continuity, confirmed absence after close, and readable retained artifacts. The historical [expanded matrix](../../../../../testing/evidence/2026-11-15-expanded-harness-matrix.md) can include earlier paths. Check current recovery scope against the [serverless ledger](../../../../../testing/evidence/2026-11-19-harness-serverless-matrix.json). This page is source-reviewed with no new live-cloud execution.

Sources: [Box connector](../../../../../integrations/sandboxes/upstash.ts), [transport](../../../../../integrations/sandboxes/upstash-transport.ts). Next: [Sandbox overview](../sandboxes.md), [artifacts](../../build/artifacts.md).
