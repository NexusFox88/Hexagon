# Codebase map and module boundaries

Follow one Run to locate its implementation. Before changing behavior, read [architecture](../../../architecture.md) and the [acceptance journey](../../../../testing/acceptance.md). User journeys define acceptance; missing implementation is not permission to remove a requirement.

## Directory responsibilities

| Location | Responsibility |
| --- | --- |
| `apps/control-plane` | HTTP composition, management API, credential ingress, preview ingress |
| `apps/console` | Management UI consuming the same API; bilingual catalogs and application-owned interaction components |
| `modules/execution` | Sessions/Runs, inputs, initialization, scheduling, result interpretation |
| `modules/sandboxes` | Resource lifecycle, operation records, checkpoints, pause, cleanup |
| `modules/harnesses` | Harness registration, protocols, images, execution adapters |
| `modules/connections / credentials / access` | Account configuration, Secrets, protected access policy |
| `modules/tools / apps` | ToolBroker, call reconciliation, applications and OAuth management |
| `modules/artifacts / storage` | Artifacts and PostgreSQL transactions/migrations |
| `integrations` | External protocol adapters for cloud providers, models, applications, HTTP Tools, MCP |
| `runtime` | In-Sandbox Python supervisor and Tool bridge |
| `sdk` | Public Python and TypeScript clients |
| `tooling / testing` | Management/verification scripts and journey/evidence; not substitute product implementations |

## Trace one submission

1. **Client entry:** [TypeScript](../../../../sdk/typescript/index.ts) and [Python](../../../../sdk/python/hexagon/__init__.py) use the same HTTP operations. Console consumes the public API, not a separate execution state model.
2. **Identity/routes:** [server.ts](../../../../apps/control-plane/server.ts) checks identity/scope and parses Session ID, input, and idempotency key before delegation. Every lookup and cross-resource binding validates tenant ownership.
3. **Durable submission:** [runs.ts](../../../../modules/execution/runs.ts) owns idempotency, active-Run constraints, transitions, and events; [sessions.ts](../../../../modules/execution/sessions.ts) pins configuration/resource associations. Persist state/events before streaming.
4. **Worker:** [worker.ts](../../../../modules/execution/worker.ts) uses leases for preparation, recovery, event ingestion, and completion. Stale workers cannot update newer state. Client disconnect does not cancel execution.
5. **Cloud resources:** the [connector contract](../../../../modules/sandboxes/connector.ts) and [registry](../../../../integrations/sandboxes/registry.ts) provide allocation, inspection, files, commands, and private access. Provider branches belong in adapters, not scattered through generic Run orchestration.
6. **Guest processes:** [Runtime](../../../../runtime/server.py) supervises Harness processes; the [Harness contract](../../../../modules/execution/harness.ts) defines installation, invocation, and output. The control plane never executes uploaded source; Runtime does not own cloud resource management.
7. **External Tools:** [tool_bridge.py](../../../../runtime/tool_bridge.py) connects calls to [broker.ts](../../../../modules/tools/broker.ts) for authorization, approval, dispatch, and durable results. Original credentials stay in the control plane. Uncertain effects enter [reconciliation.ts](../../../../modules/tools/reconciliation.ts).
8. **Delivery:** [Artifacts](../../../../modules/artifacts/artifacts.ts) persists deliverables. The worker checks actual results/artifacts before terminal completion. Model text is not execution evidence. Clients query durable results and separately close Sessions for cleanup.

## Locate recovery behavior

- Run/invocation recovery: execution/worker and runs. Do not replay dispatched operations with unknown outcomes.
- Pause/checkpoints/deletion: [lifecycle.ts](../../../../modules/sandboxes/lifecycle.ts), [checkpoints.ts](../../../../modules/sandboxes/checkpoints.ts). Idle, paused, closed, and provider deletion are different states.
- Protected access: [access-server.ts](../../../../apps/control-plane/access-server.ts) and modules/access. Raw keys in environment are not an acceptable compatibility fallback.
- Storage upgrades: [migrate.ts](../../../../modules/storage/migrate.ts) and numbered SQL. Do not modify applied migrations to disguise a new schema.

## Choose the implementation boundary

| Change | Start here | Also verify |
| --- | --- | --- |
| New Sandbox | connector + integrations/sandboxes | Capabilities, uncertain creation, cleanup, both SDKs |
| New Harness | Harness contract + modules/harnesses | Protocol, Tools, native history, result, cancellation |
| New application operation | integrations/apps + ToolBroker | Schema, permissions, approvals, uncertain effects |
| Console interaction | apps/console | Both languages, keyboard/focus, application-owned components |
| Public field | server + domain contract + both SDKs | Types, permissions, examples, compatibility |
| State transition | runs / worker / lifecycle | Transactions, persistence-before-streaming, lease fencing, recovery |

As a no-cloud reading exercise, locate submission, idempotency checking, persisted invocation, Runtime execution, Tool dispatch, and result persistence. Explain who recovers each failure and which actions cannot be blindly repeated. Listing directories alone is insufficient.

This map follows current files/implementation and claims no newly passed tests. Record deterministic and real-provider/model evidence separately, retaining sensitive resource IDs privately.

Next: [execution architecture](../concepts/execution-architecture.md), [capabilities/evidence](../concepts/capabilities-and-evidence.md), [reconciliation](../operate/reconciliation.md).
