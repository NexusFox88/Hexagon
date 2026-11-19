# Events, states and transitions

State belongs to a specific object. A Run can be completed while its Session remains open; a Sandbox can be running while a Run waits for approval. Runtime unreachable does not prove compute absence. Track client connectivity separately.

## Session

| State | Meaning |
| --- | --- |
| `open` | Accepts work; does not imply compute already exists or a task is running. |
| `pausing / paused / resuming` | Pause/wake lifecycle; inspect pause_scope because Session and Sandbox suspension differ. |
| `closing / closed` | Closure pending/confirmed; retain cleanup records while closing. |

Source: [modules/sandboxes/lifecycle.ts](../../../../modules/sandboxes/lifecycle.ts)。

## Run

| State | Meaning |
| --- | --- |
| `queued` | Durably accepted, not yet executed; allocation is not established. |
| `provisioning` | Preparing compute/image/Runtime; image-build waiting is not another Run. |
| `running` | Executing; use events to inspect activity. |
| `waiting_authorization` | Account authorization or an uncertain Tool outcome may need attention; inspect tool calls. |
| `waiting_approval` | Awaiting approval of a particular operation, distinct from account access. |
| `cancelling` | Cancellation settling; dispatched external requests can still return. |
| `completed / failed / cancelled` | Terminal Run states; completed does not mean the Session is closed. |

Source: [modules/execution/runs.ts](../../../../modules/execution/runs.ts)。

## Runtime binding

| State | Meaning |
| --- | --- |
| `reserved / preparing / starting` | Control-plane reservation, preparation and startup phases. |
| `ready` | Binding ready; not a permanent reachability or task-success guarantee. |
| `restoring / restoring_preparing / restoring_starting` | Runtime preparation after restoration. |
| `unreachable` | Reachability uncertain; recover without assuming resource loss. |
| `interrupted` | Execution interrupted; investigate workspace/effects before reuse. |

Source: [modules/execution/worker.ts](../../../../modules/execution/worker.ts)。

## Sandbox resource

| State | Meaning |
| --- | --- |
| `provider-derived state` | Connector-returned string, not a closed cross-provider enum; interpret running/paused through that connector. |
| `confirmed absence / unknown` | inspect null means confirmed absence; authentication/network failure must not become null. |

Source: [modules/sandboxes/connector.ts](../../../../modules/sandboxes/connector.ts)。

## Resource operation

| State | Meaning |
| --- | --- |
| `pending` | Persisted intent, not proof of remote acceptance. |
| `completed` | This operation completed; create completion does not mean task or deletion completion. |
| `unknown` | Remote outcome uncertain; reconcile original operation/receipts. |
| `rejected` | Definitive refusal, such as confirmed non-acceptance of allocation. |
| `review_state: automatic / needs_review / acknowledged` | Separate review axis; acknowledged does not turn unknown into completed. |

Source: [modules/sandboxes/operations.ts](../../../../modules/sandboxes/operations.ts)。

## Transitions and observation

The normal Run path is queued → provisioning → running → completed. Failure, authorization, approval, cancellation and worker recovery add branches; this is not a strictly increasing UI progress bar. `run.claimed` describes worker ownership/generation, not a Run state named claimed. `run.recovery_needed` can record recovery error information without changing the current state; it is not a new terminal state.

Runtime invocations have their own starting, running, cancelling, exited, cancelled, failed and interrupted states; see [Runtime](../../../../runtime/server.py). Exited only means process termination. The worker still parses results and exports artifacts before Run completion. The persisted Runtime binding and invocation state are also separate fields.

## Event envelope and cursor

```json
{"id":"42","type":"run.queued","data":{"session_id":"00000000-0000-0000-0000-000000000001"},"created_at":"2026-11-19T00:00:00Z"}
```

This is an illustrative sanitized shape, not an observed log. JSON event queries return `{events:[...]}` with id/type/data/created_at. SSE uses id/event/data fields; SDK-parsed stream events do not add the database created_at field. Example SSE:

```text
id: 42
event: run.queued
data: {"session_id":"00000000-0000-0000-0000-000000000001"}

```

The cursor is the database sequence as a numeric string: increasing within a Run query, not necessarily contiguous, and distinct from Runtime cursor. Events are persisted before streaming. JSON queries return up to 500 rows. SSE after takes precedence over Last-Event-ID, defaulting to 0. Deduplicate by Run/id and save event plus cursor atomically in your application.

A keepalive comment may arrive about every 15 seconds. Once terminal and drained, `stream.end` carries `{state: ...}` without an id; it is not durable. Disconnecting only stops observation. Empty pages do not prove terminal state; query the Run after stream completion. Sources: [HTTP SSE](../../../../apps/control-plane/server.ts), [Runs](../../../../modules/execution/runs.ts).

## Main events and payloads

| Event | Payload fields / meaning |
| --- | --- |
| `run.queued` | `session_id` |
| `run.claimed` | `generation, recovery` |
| `run.provisioning / run.running` | `transition data (often {})` |
| `run.completed` | `final assistant output` |
| `run.failed` | `failure details including code` |
| `run.cancelling / run.cancelled` | `{} or lifecycle reason; expiry cleanup can include resource_cleanup` |
| `run.recovery_needed` | `generation and diagnostic fields` |
| `runtime.reconnected` | `{}` |
| `sandbox.image_building` | `{}` |
| `workspace.inputs_verified` | `session_id, files (path, sha256, size)` |
| `approval.required` | `id, action` |
| `approval.decided` | `id, approved` |
| `artifact.created` | `id, name, sha256, size` |
| `authorization.denied` | `call_id, source: caller, outcome: authorization_denied` |
| `tool.outcome_resolved` | `call_id, outcome, evidence, source: caller_verified` |
| `tool.completed` | `call_id; additional fields depend on direct/caller-verified/denied path` |
| `tool.result_after_cancellation` | `call_id, outcome` |

Fields depend on the emitting path; the summary is not a strict JSON schema. Tool sources: [broker](../../../../modules/tools/broker.ts), [reconciliation](../../../../modules/tools/reconciliation.ts); artifacts: [capture](../../../../modules/artifacts/artifacts.ts). `tool.outcome_unknown` requires investigation, not a new approval. Inspect the original call's hash, policy and state.

Runtime ingest deduplicates source cursors; native Harness stdout can also generate activity events. Native events depend on the Harness and do not expose complete private reasoning. This draft does not yet enumerate every dynamic native/activity payload or provide an example for each lifecycle event; those remain reference-review work.

## Consumer requirements

Preserve or safely ignore unknown event types without crashing or manufacturing state transitions. Narrow payloads before reading fields. Tool completed can deliver an error or an authorization-denial result; it is not proof a side effect succeeded. caller_verified identifies a caller's checked conclusion, not a fresh provider request by the server.

Reconnect to the original Run rather than resubmitting. Reconcile unknown outcomes. Display Run result, Session state, connectivity and cleanup separately so a success badge cannot conceal unresolved resources. Next: [streaming guide](../build/stream-events.md), [recovery](../build/recovery.md), [reconciliation](../operate/reconciliation.md).
