# Choose a Sandbox Provider

A Sandbox supplies the cloud execution environment; a Harness runs Agent tasks inside it. Local and hosted describe the control plane location. Both can use these cloud providers. Select required capabilities first, then check evidence for the exact Harness, model protocol, and SDK combination.

## Registered capabilities

Every target below declares files, commands, and private preview. “No” means the current Hexagon connector does not expose that capability; it does not describe all vendor products. This table follows the registry and connectors, not live acceptance results.

| Provider | API provider | Domain allowlist | OCI | Idle strategy |
| --- | --- | --- | --- | --- |
| [E2B](sandboxes/e2b.md) | `e2b` | Yes | Public image build | pause / connect |
| [Modal](sandboxes/modal.md) | `modal` | Yes | Public and private | snapshot / recreate |
| [Blaxel](sandboxes/blaxel.md) | `blaxel` | No | No | automatic standby |
| [Fly Sprites](sandboxes/fly-sprites.md) | `sprites` | No | No | automatic standby |
| [Upstash Box](sandboxes/upstash-box.md) | `upstash` | No | No | persistent pause / resume |
| [Vercel Sandbox](sandboxes/vercel.md) | `vercel` | No | No | persistent stop / resume |
| [Agent37](sandboxes/agent37.md) | `agent37` | No | No | stop / start |
| [Boat](sandboxes/boat.md) | `boat` | No | No | snapshot stop / resume |
| [Freestyle VMs](sandboxes/freestyle.md) | `freestyle` | No | No | VM pause / start |
| [Fly Machines](sandboxes/fly-machines.md) | `fly-machines` | No | Public | suspend / start |
| [Instabox](sandboxes/instabox.md) | `instabox` | No | No | suspend / resume |

## Interpret the conditions

- **Networking:** only E2B and Modal declare network_allowlist. Unsupported restrictions fail before allocation instead of silently allowing open networking. Account for the actual credential ingress, model, and Tool request paths.
- **OCI:** Modal supports native OCI including private images; Fly Machines uses public images; E2B prepares public images in a Session-owned Template. Resolution, build, and executable Harness compatibility are separate checks. See [OCI integration](harnesses/oci.md).
- **Pause:** E2B, Freestyle, and Instabox use memory-preserving strategies. Filesystem strategies do not guarantee arbitrary process or memory continuity. Fly Machines allows cold-boot fallback. Modal snapshot/recreate changes the cloud resource ID while preserving Session identity.
- **Automatic standby:** Blaxel and Sprites control standby timing. It is not confirmed explicit suspension by Hexagon. Unobservable compute or billing state is unknown, not inferred from an idle timer.
- **Deletion:** pause, stop, and snapshots are not cleanup. Closing must reconcile compute, associated endpoints, and image-preparation resources as applicable.

Fly Sprites and Fly Machines have different APIs and lifecycles; their configuration is not interchangeable. Daytona is absent from the current public registry. A historical prototype is not support for new connections.

## Configure and validate

1. Select a provider in Console Sandbox configuration, or create a kind=sandbox connection with management-client create_connection / createConnection. Read that provider's schema and setup_url; do not reuse another provider's fields.
2. Submit the provider credential as the connection credential, retained in the control plane. Do not put it in Agent environment, project files, or frontend code.
3. Validate, then explicitly enable. Validation scope varies by provider; listing resources does not establish every allocation, image-build, or deletion permission.
4. Preflight with a compatible Harness/model, then verify a real task, files, required preview, and cleanup. Start with [E2B](sandboxes/e2b.md) or the [first Session](../start/first-session.md).
5. Independently verify next-turn auto-wake, retained files, and conversation when using idle transitions. Single-turn success is insufficient.

Template, image, region, CPU, and memory fields depend on the provider schema. Session timeout/idle settings are not a universal machine specification. Editing a connection invalidates validation and disables it; existing Sessions retain pinned configuration. See [connection changes](../build/connection-lifecycle.md).

## Evidence and diagnostics

Inspect dates, SDKs, Harness versions, model protocols, and branches in the [execution matrix](../../../../testing/execution-matrix.md) and [Harness serverless ledger](../../../../testing/evidence/2026-11-19-harness-serverless-matrix.json). Historical success does not cover every current combination or prove current account quota. This page is source-reviewed; no new cloud verification was performed.

Locate failures in authentication, quota, image preparation, allocation, Runtime, model, preview, or cleanup. Preserve the original operation and resource records after a lost create response; allocating another resource does not establish what happened to the first.

Sources: [registry](../../../../integrations/sandboxes/registry.ts), [lifecycle strategies](../../../serverless-sessions.md). Next: [choose a combination](choose.md), [network policy](../build/sandbox-policy.md), [reconciliation](../operate/reconciliation.md).
