# Recover from disconnects, retries, cancellation, and unknown outcomes

Identify whether you lost observation, a request response, the execution process, or an external operation result. A timeout is not proof of failure; reconnecting is not resubmitting work.

| Observation | Retain and inspect | Next action |
| --- | --- | --- |
| Event stream disconnect | Run ID and committed cursor | Reconnect to that Run and replay after the cursor |
| Lost Run submission response | Session, exact input/origin, key | Resend the identical request to recover the original Run |
| Lost Session creation response | Creation intent, time, connection IDs | Inspect Sessions/resource operations before creating again |
| Runtime unreachable | Original Run, invocation, Sandbox binding | Observe recovery; do not independently restart the Harness |
| Runtime interrupted | Run and dispatched Tool operations | Investigate termination and side effects; do not assume safe workspace reuse |
| Unknown Tool outcome | Call ID, request hash, dispatch policy | Verify externally, then record an evidence-based resolution |
| Unconfirmed close | Session, resource IDs, deletion operation | Reconcile the original resources and retain records |

## Retry an identical submission

Persist the request before sending. With an initialized client:

```python
run = client.submit(saved_session_id, saved_input, saved_key, origin=saved_origin)
```

```typescript
const run = await client.submit(savedSessionId, savedInput, savedKey, savedOrigin);
```

Different content under the same Session/key conflicts. Do not generate a new key to bypass `idempotency_conflict`. An already accepted identical request returns its original record even if a connection was subsequently disabled; this does not permit new work.

Bound retry counts and use backoff for transient transport faults. Distinguish authentication, input, and state conflicts. The SDK does not blindly replay non-idempotent operations.

## Cancel and close explicitly

```python
client.cancel(run_id)
current = client.run(run_id)
# Observe settlement; cancellation does not reverse all external effects.
```

```typescript
await client.cancel(runId);
const current = await client.run(runId);
// Continue observing settlement; cancellation cannot retract external effects.
```

Cancellation prevents new Tool dispatch, but dispatched requests can complete or become unknown. Late approvals cannot revive execution. Cancelling a Run and cleaning up a Session are separate; close unused Sessions and confirm deletion.

An AbortSignal or stopped Python stream stops observation, not execution. Do not map leaving a page to cancellation unless that is an explicit, communicated product behavior.

## Reconcile external writes

Inspect `tool_calls` / `toolCalls` for the invocation and request hash. Verify the actual remote outcome before using `resolve_tool_call` / `resolveToolCall` with a result and evidence. Resolution delivers a verified result without reissuing the remote request. Leave unknown outcomes unknown when evidence is insufficient. Management permissions apply; see the [reconciliation protocol](../../../tool-reconciliation.md).

## Verify recovery

Exercise stream loss, lost submission responses, worker restart, lost write responses, and lost delete responses separately. Confirm original Run/resource identity and correct side-effect counts. Preserve unresolved identifiers. Simulation proves only its modeled branches; record cloud/model journeys independently.

Sources: [recovery architecture](../../../architecture.md), [durable events](stream-events.md). Next: [Backend integration](backend-integration.md).
