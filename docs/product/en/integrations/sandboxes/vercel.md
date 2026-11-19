# Connect Vercel Sandbox

Use a persistent Vercel Sandbox to execute a Hexagon Harness. This page does not publish an application as a Vercel website. Sessions manage tasks/workspaces; private preview is not public deployment.

## Credentials and project binding

Prepare a Vercel Token authorized for the intended team/project and Sandbox operations. Supply real project_id and team_id values together. Project display names and the browser's current team do not replace these identifiers.

| Field | Constraint |
| --- | --- |
| project_id | `prj_` followed by letters or digits |
| team_id | `team_` followed by letters or digits |
| vcpus | Default 2; either 1 or an even integer from 2 through 32 |

Use vcpus. The schema does not accept invented image or memory_mb fields. The Token stays in the control plane, not ordinary Agent environment. These examples use a local management client; see [self-hosting](../../operate/self-host.md) for hosted initialization. Rerunning creates additional connections, so retain and reuse the ID.

```python
import os
from hexagon import Hexagon
client = Hexagon.local()
connection = client.create_connection(
    kind="sandbox", provider="vercel", name="Vercel workspace",
    credential=os.environ["VERCEL_TOKEN"],
    config={"project_id": os.environ["VERCEL_PROJECT_ID"],
            "team_id": os.environ["VERCEL_TEAM_ID"], "vcpus": 2},
)
checked = client.validate_connection(connection["id"])
if checked["status"] != "ready":
    raise RuntimeError("Inspect Vercel connection diagnostics")
client.update_connection(connection["id"], enabled=True)
```

```typescript
import { Hexagon } from '@hexagon/agent-sdk';
const client = await Hexagon.local();
const credential = process.env.VERCEL_TOKEN;
const projectId = process.env.VERCEL_PROJECT_ID;
const teamId = process.env.VERCEL_TEAM_ID;
if (!credential || !projectId || !teamId) throw new Error('Set Vercel account configuration');
const connection = await client.createConnection({
  kind: 'sandbox', provider: 'vercel', name: 'Vercel workspace', credential,
  config: { project_id: projectId, team_id: teamId, vcpus: 2 },
});
const checked = await client.validateConnection(connection.id);
if (checked.status !== 'ready') throw new Error('Inspect Vercel connection diagnostics');
await client.updateConnection(connection.id, { enabled: true });
```

Validation only lists Sandboxes in the specified team/project; it does not prove task execution or recovery. Enable explicitly after ready validation. Revalidate/enable after Token, project, or resource edits; existing Sessions remain pinned.

## Execution and private preview

Use connection.id as sandbox_connection_id in the [first Session](../../start/first-session.md), with a compatible Harness/model. Independently verify task execution, actual artifacts, and close through Python and TypeScript. The connector creates persistent=true Sandboxes without public ports. Nonpersistent resources or unexpected public routes violate its resource policy.

Preview reaches the internal port through an authenticated command channel, governed by [Hexagon preview authorization](../../build/private-preview.md). Browsers do not receive the Vercel Token. Do not create public routes to access the task's development server. Diagnose listening service, command transport, Runtime health, and user authorization separately.

## Networking and native credential injection

The native_credential_auth capability configures network-layer delegated Token injection for scoped control-plane access paths. Original model/Tool account keys remain in the control plane. The access proxy continues checking method, path, Run state, version, and revocation; provider injection does not bypass platform authorization.

This internal mechanism does not expose general network_allowlist to applications. The connector declares neither ordinary Sandbox allowlists nor OCI, and creation requires unrestricted networking. Choose a supporting provider for domain restrictions instead of adding unsupported Vercel fields.

## Idle, stop, and recovery

Platform suspension stops the persistent Sandbox. The next submit resumes it through the same Session. Filesystem and managed conversation data persist while Runtime is prepared again. Arbitrary processes, memory, and network connections have no continuity guarantee; preview services may need restarting.

Inspection uses resume=false so observing state does not itself wake compute. A stopped persistent Sandbox maps to paused, **not deleted**. Active Runs, including authorization/approval waits, are not idle workspaces to suspend arbitrarily.

Follow [idle and wake](../../build/idle-and-wake.md) to independently verify both turns, files, and conversation. Write known content before idle and read/check it afterward. Record exact Harness, model protocol, and both SDK results. One successful turn does not prove restoration.

## Close and unknown outcomes

Close deletes with deleteOrphanSnapshots and then checks resource absence. Accepted deletion, stopped state, or local control-plane exit is not confirmed cleanup. The control plane owns durable deadlines; downtime can delay the cleanup it enforces.

Creation derives an exact name from the persisted operation ID. Reconciliation lists by namePrefix and filters by the complete name; another prefix match cannot be bound to this Session. Transport/authentication errors do not mean absence; only explicit 404 is treated that way. Preserve original resource records for unknown restore/delete outcomes and [reconcile](../../operate/reconciliation.md).

| Symptom | Check |
| --- | --- |
| Validation fails | Token, team/project pairing, actual access permissions |
| Allocation fails | Quota, vcpus, resource policy mismatch |
| vercel_sandbox_not_running | Whether paused; restore through normal Session wake |
| vercel_unexpected_public_route | External route changes; do not bypass the check |
| Preview fails after restore | Retained files separately from running services |
| vercel_deletion_unconfirmed | Retain original name; inspect deletion and snapshot cleanup |

This page is source-reviewed for configuration, private access, and lifecycle, without new cloud execution. Historical combinations are in the [execution matrix](../../../../../testing/execution-matrix.md). Interpret current recovery against the exact scope in the [Harness serverless ledger](../../../../../testing/evidence/2026-11-19-harness-serverless-matrix.json).

Sources: [Vercel connector](../../../../../integrations/sandboxes/vercel.ts), [private transport](../../../../../integrations/sandboxes/vercel-transport.ts). Next: [Sandbox overview](../sandboxes.md), [credential boundaries](../../concepts/security-boundaries.md).
