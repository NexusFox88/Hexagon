# Connect Agent37

The Agent37 connector executes Harnesses in cloud instances with files, commands, private preview, and filesystem-level stop/start recovery. It declares neither OCI nor network allowlists. Check [Sandbox capabilities](../sandboxes.md) if either is required.

## Configuration and resources

Prepare an API key for the intended account. The only config field is region, accepting us / eu and defaulting to us. The connector fixes the template to agent37-base and sends `{cpu: 2, memory: 4, disk: 4}` to the provider. These fields cannot be overridden through config. Inspect actual allocated resources and quota rather than describing arbitrary machine sizes as selectable.

Creation disables provider auto_sleep and requests no public ports. Hexagon manages idle and expiry lifecycle. The submitted budget field is not a promise of free usage or a description of billing/account limits.

These management examples use a local workspace; see [self-hosting](../../operate/self-host.md) for hosted initialization. Read the key from private configuration, not Agent environment. Each execution creates a connection; save and reuse the ID.

```python
import os
from hexagon import Hexagon
client = Hexagon.local()
connection = client.create_connection(
    kind="sandbox", provider="agent37", name="Agent37 workspace",
    credential=os.environ["AGENT37_API_KEY"], config={"region": "us"},
)
checked = client.validate_connection(connection["id"])
if checked["status"] != "ready":
    raise RuntimeError("Inspect Agent37 connection diagnostics")
client.update_connection(connection["id"], enabled=True)
```

```typescript
import { Hexagon } from '@hexagon/agent-sdk';
const client = await Hexagon.local();
const credential = process.env.AGENT37_API_KEY;
if (!credential) throw new Error('Set AGENT37_API_KEY');
const connection = await client.createConnection({
  kind: 'sandbox', provider: 'agent37', name: 'Agent37 workspace',
  credential, config: { region: 'us' },
});
const checked = await client.validateConnection(connection.id);
if (checked.status !== 'ready') throw new Error('Inspect Agent37 connection diagnostics');
await client.updateConnection(connection.id, { enabled: true });
```

Validation performs list_instances and does not establish every allocation, execution, or cleanup permission. Enable explicitly after ready validation. Revalidate/enable after region or credential changes; existing Sessions remain pinned.

## First task and files

Use connection.id as sandbox_connection_id in the [first Session](../../start/first-session.md), with a compatible Harness/model. Independently verify execution, artifacts, and close through Python and TypeScript.

The connector transfers files in chunks. Its current reader accepts at most 64 MiB per file and checks each chunk length. This is not a universal product upload/artifact limit; higher layers can impose smaller limits. Provider-truncated command output fails instead of becoming an apparently complete result. Write larger deliverables to artifact files and verify downloaded bytes within supported limits.

## Private preview and health

Use [private preview](../../build/private-preview.md) for application services. The control plane sends X-Agent37-Key to the provider edge, which strips the account header before forwarding to the guest. Browsers must not receive that key. Historical probes cover header removal; URL appearance alone does not prove it.

The provider can reserve `/health`; it is not a substitute for Hexagon Runtime health. Distinguish reachable provider edge, initialized Runtime, listening application port, and authorized user preview. Execution and preview require a running instance.

## stop/start and persistent paths

The managed root is `/home/node/.hexagon`. Workspace, Harness cache, and conversation recovery data live under persistent home. `/tmp` clears across stop/start. Put cross-turn state in the task workspace; do not use `/tmp/result.json` as persistent storage.

After idle stop, submit to the original Session to trigger start and Runtime recovery. Retained files do not imply process, memory, or connection continuity; development servers may need restarting. Provider stopped maps to paused, not deleted. Authorization/approval waits are active Runs, not idle workspaces.

In recovery checks, write a known workspace file and conversation value in the first turn. Verify file contents, actual Tool output, and remembered conversation in the second; recheck preview services as needed. A temporary-path test can demonstrate the boundary, but do not depend on it surviving. Verify both SDKs independently following [idle and wake](../../build/idle-and-wake.md).

## Close and diagnose

The control plane owns durable deadlines. Stopping a local service does not establish cloud cleanup. Close deletes the instance and polls for confirmed absence. Stop, paused state, and accepted deletion are insufficient. Retain original resource/operation records when restoration or deletion is uncertain.

Creation reconciliation requires both the exact name and metadata.hexagon_operation. Similar names cannot be arbitrarily bound. Only provider 404 is treated as absence, never transport or authentication failure.

| Symptom | Check |
| --- | --- |
| agent37_http_401 / 403 | Key and account permissions |
| Allocation fails | Region, quota, availability of fixed resources |
| agent37_sandbox_not_running | Original instance state and normal Session wake |
| agent37_command_output_truncated | File-based deliverables and limits; reject incomplete output |
| agent37_file_size_unsupported | Connector read limit and higher-layer constraints |
| agent37_background_start_unknown | Original process, Runtime, port; avoid duplicate launch |
| agent37_deletion_unconfirmed | Original instance deletion state and reconciliation |

This page follows current implementation without new cloud tests. Historical [Agent37 evidence](../../../../../testing/evidence/2026-11-15-agent37.md) and the [serverless ledger](../../../../../testing/evidence/2026-11-19-harness-serverless-matrix.json) describe original journeys and recovery scope separately. Single-turn success does not prove every Harness recovery path.

Sources: [connector](../../../../../integrations/sandboxes/agent37.ts), [lifecycle strategies](../../../../serverless-sessions.md). Next: [persistence boundaries](../../concepts/persistence.md), [reconciliation](../../operate/reconciliation.md).
