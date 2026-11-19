# Connect Modal

Choose Modal for cloud Sandboxes, OCI images, domain egress restrictions, or filesystem snapshot recovery. Applications retain the same Session / Run API; the control plane manages image preparation, allocation, and restoration.

## Account and configuration

Prepare a Token ID and Token Secret from the intended Modal workspace. The account needs Sandbox listing, creation, execution, termination, and relevant image permissions. Validation only lists Sandboxes; it does not establish every build/allocation permission. Submit credentials as a JSON string retained in the control plane, never in Agent environment.

| Field | Default | Constraint |
| --- | --- | --- |
| app | hexagon | Nonempty; created during execution if absent |
| image | python:3.12-slim | Built-in Harness base; preparation requires apt-get |
| memory_mb | 2048 | Integer, at least 2048 MiB |
| cpu | 2 | Positive number |
| region | Unspecified | Optional; availability depends on provider/account |

Do not invent resource fields beyond this schema. Initial provisioning can trigger a cloud image build. These examples use a local management client; see [self-hosting](../../operate/self-host.md) for hosted initialization. Supply environment values privately. Rerunning creates additional connections, so save and reuse the ID.

```python
import json
import os
from hexagon import Hexagon

client = Hexagon.local()
connection = client.create_connection(
    kind="sandbox", provider="modal", name="Modal workspace",
    credential=json.dumps({"token_id": os.environ["MODAL_TOKEN_ID"],
                           "token_secret": os.environ["MODAL_TOKEN_SECRET"]}),
    config={"app": "hexagon", "image": "python:3.12-slim",
            "memory_mb": 2048, "cpu": 2},
)
checked = client.validate_connection(connection["id"])
if checked["status"] != "ready":
    raise RuntimeError("Inspect Modal connection diagnostics")
client.update_connection(connection["id"], enabled=True)
```

```typescript
import { Hexagon } from '@hexagon/agent-sdk';

const client = await Hexagon.local();
const tokenId = process.env.MODAL_TOKEN_ID;
const tokenSecret = process.env.MODAL_TOKEN_SECRET;
if (!tokenId || !tokenSecret) throw new Error('Set both Modal credential values');
const connection = await client.createConnection({
  kind: 'sandbox', provider: 'modal', name: 'Modal workspace',
  credential: JSON.stringify({ token_id: tokenId, token_secret: tokenSecret }),
  config: { app: 'hexagon', image: 'python:3.12-slim', memory_mb: 2048, cpu: 2 },
});
const checked = await client.validateConnection(connection.id);
if (checked.status !== 'ready') throw new Error('Inspect Modal connection diagnostics');
await client.updateConnection(connection.id, { enabled: true });
```

Revalidate and enable after configuration or credential edits. Tokens must belong to the intended account/workspace; the current browser login does not change the ownership of a saved Token.

## Built-in or OCI Harness

The built-in path derives an environment from connection.image and adds Node/npm, curl, git, and CA packages. Use the returned connection ID and model connection in the [first Session](../../start/first-session.md), checking actual output, artifacts, and close.

The OCI path uses a registered digest through [image registration](../harnesses/oci.md), rather than connection.image. One historical starting combination is:

- Image: `docker.io/nousresearch/hermes-agent@sha256:2fd023efbb8d3d2b0ce1a73d028b07370cff34f567cfe0e999553e8c327ea283`.
- protocol: `hermes-v1`; command: `["/opt/hermes/.venv/bin/hermes"]`.
- Combination: Modal, openai-compatible, `deepseek-ai/DeepSeek-V4-Flash`; independently verified Python and TypeScript continuation, remote Tool, environment, artifacts, and cleanup.
- Recorded on 2026-11-18 in [Harness delivery evidence](../../../../../testing/evidence/2026-11-18-harness-delivery.md). This does not cover all endpoints or later versions and is not a fresh run for this page.

Private images use a registry Secret with username/password associated during registration. Registry credentials and Modal Tokens serve different purposes and cannot replace each other.

OCI preparation installs Python, Node, Bash, and other Runtime prerequisites as root using Alpine/Debian-family package managers, then clears Entrypoint/Cmd. Runtime launches the registered command separately. Current code reapplies the recorded image USER to the derived image, while existing repository runtime notes report Modal execution as root. **Do not treat the USER declaration as a verified isolation boundary.** Verify actual uid for the exact combination if execution identity matters. The source digest does not describe an unchanged filesystem after preparation.

## Private access and network policy

The connector maps domain allowlists to Modal's native egress restrictions. Follow [network policy](../../build/sandbox-policy.md), include required task/credential paths, and probe both allowed and denied destinations. Control-plane model access and direct Sandbox internet traffic are different paths.

Preview uses a server-side Connect Token Cookie through the Hexagon proxy. Use [Hexagon preview authorization](../../build/private-preview.md); do not send Modal account Tokens or private connection Cookies to the browser. The user service must listen on the right port and remain alive.

## Idle snapshots and the next turn

Modal snapshots the filesystem, terminates the old Sandbox, and recreates from the snapshot. Session identity remains stable while the underlying resource ID can change. Persist Session IDs, not provider URLs as stable application entrypoints.

The next submit triggers restoration and Runtime preparation. Files and managed conversation data can continue; arbitrary processes, memory, and network connections are not preserved guarantees. Preview services may need restarting. A Run waiting for authorization or approval remains active rather than idle.

Snapshot and restore have independent durable operation records. Unknown snapshot outcomes or lost restore responses remain subject to reconciliation instead of duplicate allocation. Follow [idle and wake](../../build/idle-and-wake.md) to verify both turns, files, conversation, resource mapping, and cleanup. A successful single OCI turn does not prove recovery.

## Close and diagnose

Close terminates current Session compute and handles its tracked snapshots. Shared Modal Apps and general image caches are not all deleted with one Session. A closed Session also does not prove the provider account contains no other billable resources.

| Symptom | Investigate |
| --- | --- |
| Listing succeeds, build fails | Credential workspace, image access, package manager, build logs, account limits |
| Missing executable/interpreter | Image contents, registered command, prerequisites |
| Preview fails after idle | Check retained files separately from live service processes |
| Resource ID changes | Determine whether this is normal restoration of the same Session |
| Close/restore remains unknown | Retain original operation, snapshot, and resource IDs; reconcile |

This page was reviewed against the connector, registration evidence, and snapshot cleanup. No cloud task was rerun. Later success does not erase failed historical attempts. Consult the [Harness serverless matrix](../../../../../testing/evidence/2026-11-19-harness-serverless-matrix.json) for exact recovery scope.

Sources: [Modal connector](../../../../../integrations/sandboxes/modal.ts), [checkpoint operations](../../../../../modules/sandboxes/checkpoints.ts), [cleanup lifecycle](../../../../../modules/sandboxes/lifecycle.ts). Next: [OCI Harness](../harnesses/oci.md), [reconciliation](../../operate/reconciliation.md).
