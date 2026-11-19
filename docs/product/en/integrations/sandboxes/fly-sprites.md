# Connect Fly Sprites

Sprites provides persistent workspaces, commands, and private access with provider-managed automatic standby. It is distinct from Fly Machines: the API provider is `sprites`, the resource is a Sprite, and Machines App/image/network configuration does not apply. This connector does not declare OCI or domain allowlists.

## Configure and validate

Prepare a Token authorized for the intended Sprite account and submit it as the connection credential. It stays in the control plane. The examples use a local management client; see [self-hosting](../../operate/self-host.md) for hosted initialization. SPRITES_TOKEN is this example's private configuration variable, not an environment value injected into the Agent.

| config field | Default | Constraint |
| --- | --- | --- |
| memory_mb | 2048 | Integer, at least 2048 MiB |
| cpus | 2 | Integer, 1–8 |

Use cpus, not another provider's cpu field. Extra fields are rejected. Check account allocation quota separately.

```python
import os
from hexagon import Hexagon

client = Hexagon.local()
connection = client.create_connection(
    kind="sandbox", provider="sprites", name="Sprite workspace",
    credential=os.environ["SPRITES_TOKEN"],
    config={"memory_mb": 2048, "cpus": 2},
)
checked = client.validate_connection(connection["id"])
if checked["status"] != "ready":
    raise RuntimeError("Inspect Sprites connection diagnostics")
client.update_connection(connection["id"], enabled=True)
```

```typescript
import { Hexagon } from '@hexagon/agent-sdk';
const client = await Hexagon.local();
const credential = process.env.SPRITES_TOKEN;
if (!credential) throw new Error('Set SPRITES_TOKEN');
const connection = await client.createConnection({
  kind: 'sandbox', provider: 'sprites', name: 'Sprite workspace', credential,
  config: { memory_mb: 2048, cpus: 2 },
});
const checked = await client.validateConnection(connection.id);
if (checked.status !== 'ready') throw new Error('Inspect Sprites connection diagnostics');
await client.updateConnection(connection.id, { enabled: true });
```

Each execution creates a connection; retain and reuse its ID. Validation performs list_sprites, without allocation or Harness execution. Explicitly enable after ready validation. Revalidate and enable after configuration/Token changes. Listing success does not prove sufficient allocation quota.

## First task and private access

Use connection.id as sandbox_connection_id in the [first Session](../../start/first-session.md), with a compatible model/Harness. Complete task, artifacts, and close independently in Python and TypeScript.

Sprites are created with `auth: sprite`. Hexagon's private transport reaches the remote port through an authenticated execution channel; the provider Token never goes to the browser. Use the [platform-authorized preview](../../build/private-preview.md). The connector rejects a resource whose URL configuration is no longer private. A raw provider URL is not a stable application sharing entrypoint.

Diagnose user service/port, Sprite privacy configuration, transport, and Runtime health separately. Creating another Sprite does not repair an exited application process.

## Persistent workspace and standby

The managed root is currently `/home/sprite/.hexagon`; the platform manages Runtime/Harness workspace and recovery data. Persistent files do not imply permanent processes or connections. Do not extend managed-workspace preservation assumptions to temporary paths elsewhere.

Provider standby can occur before platform idle_timeout. Submit the next Run to the same Session; the platform prepares Runtime before a new invocation starts. Persisted active invocations cannot be replayed merely because of wake. Authorization or approval waits are also not safely replayable tasks.

Background commands use bounded detached executions, not services automatically replayed on wake. A preview service may need explicit restart; inspect the old instance first to avoid duplicated side effects. Provider-managed standby is not platform-confirmed suspension, and elapsed waiting is not evidence of compute or billing state.

## Independently check the next turn

Have the first turn write a known file and record a conversation test value. After the intended idle condition, submit a second turn to the same Session, asking it to read the file and recall the value. Inspect actual Tool output, terminal state, and continuation. Recheck preview services when required.

Record wait conditions, Harness version, model protocol, and independent results for both SDKs. A retained file does not prove conversation continuity. Successful continuation does not establish that the provider entered a billing-defined standby state. See [idle and wake](../../build/idle-and-wake.md).

## Expiry, close, and reconciliation

The control plane enforces durable lifecycle deadlines. A sleeping Sprite is not deleted. Control-plane downtime can delay cleanup; stopping a local service does not release cloud resources. After close, confirm Sprite absence and verify historical artifacts remain readable.

Creation derives its exact name from a persisted operation ID. Find that original name after a lost response. Only provider 404 establishes absence in the connector; transport or authentication failures remain uncertain. If the resource remains queryable after deletion, cleanup is unconfirmed.

For 401/403, check Token permissions. For allocation failures, check resource settings and quota. For nonzero command exits, inspect original output. For unknown background startup, inspect startup markers and Runtime health. For unconfirmed deletion, retain original resource IDs and [reconcile](../../operate/reconciliation.md).

This page is implementation-reviewed with no new cloud verification. Historical task/full-journey scope is in the [expanded matrix](../../../../../testing/evidence/2026-11-15-expanded-harness-matrix.md); recovery scope is in the [Harness serverless ledger](../../../../../testing/evidence/2026-11-19-harness-serverless-matrix.json). Neither historical unverified status nor historical success should be extended without checking current evidence.

Sources: [Sprites connector](../../../../../integrations/sandboxes/sprites.ts), [private transport](../../../../../integrations/sandboxes/sprites-transport.ts). Next: [Sandbox comparison](../sandboxes.md), [persistence boundaries](../../concepts/persistence.md).
