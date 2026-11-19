# Handle Tool authorization and reauthorization

Authorization establishes usable account credentials. Approval permits one specific operation. They can occur sequentially; successful authorization is not blanket approval for writes.

First [configure and bind a Tool](tools.md). Declare a Tool optional only when deferred authorization is acceptable. Missing required authorization can prevent Session initialization.

## Resume the original Run

Inspect Run state and Tool calls. Present `waiting_authorization` as an actionable state, not indefinite thinking. Locate the connection in Console, authorize the account or replace credentials, verify, and enable it. The worker continues the original Run; do not submit a replacement merely to resume.

OAuth requires a deployment-owned application registration and correct callback. The credential-proxy tunnel is not a management or OAuth callback tunnel. Externally supplied access tokens may need manual renewal. Consult the connector contract for exact scope.

## Inspect and refuse one request

```python
calls = client.tool_calls(run_id)['calls']
# Display the invocation and let an authorized operator select it.
selected = next(call for call in calls if call['id'] == selected_call_id)
client.deny_tool_authorization(run_id, selected['id'], selected['request_hash'])
```

```typescript
const { calls } = await client.toolCalls(runId);
const selected = calls.find((call: { id: string }) => call.id === selectedCallId);
if (!selected) throw new Error('Selected invocation not found');
await client.denyToolAuthorization(runId, selected.id, selected.request_hash);
```

Refusal requires an authorized management identity; an ordinary application Token cannot use that mutation route. Execute through Console or an appropriately authorized backend, never by handing owner credentials to the browser.

Refusal affects that pending invocation only. The Harness receives `tool_authorization_denied` and can continue explaining the limitation. It does not revoke account credentials, cancel the Run, or prohibit a later distinct request.

Identical repeated refusal returns the stored result without restarting execution. Hash mismatch, nonpending calls, dispatch in progress, or cancellation races can reject the action. Query current state rather than changing the hash to bypass a guard.

## Expiry and unknown outcomes

Replacing invalid credentials does not authorize repeating already-dispatched operations. If a write was sent and its outcome is unknown, use [Tool reconciliation](../../../tool-reconciliation.md). Refusal cannot undo an earlier external request.

Cancelling an OAuth consent flow is separate from cancelling the Run. Preserve recoverable waiting state when users leave consent, allowing explicit refusal or later completion without duplicate tasks.

Verify successful authorization resumes the same Run. Verify refusal makes no new external call, leaves credentials unchanged, and lets the task explain the restriction. Account-specific evidence is listed in [application connectors](../../../application-connectors.md). Next: [Approvals](approvals.md).
