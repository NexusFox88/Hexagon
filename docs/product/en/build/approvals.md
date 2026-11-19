# Add human approval to your product

Present a pending external write and let an authorized person explicitly approve or deny it. Hexagon records the decision against the original Run; the worker delivers the Tool result. Your frontend must not also issue the external operation itself.

You need a Tool approval policy, a Run waiting for a decision, and a management identity permitted to decide. Ordinary application Tokens can read approvals but cannot submit decisions. This is not general organizational RBAC; your backend must authorize the business approver.

## Present the actual operation

Python `client.approvals(run_id)` and TypeScript `await client.approvals(runId)` return `approvals` containing id, run_id, action, state, decision, and created_at. Correlate Tool calls through approval_id to inspect the invocation, arguments, and request hash.

Show the target account/service, operation, material arguments, task, and current state. Model-generated descriptions must not replace the actual parameters. Do not preselect approval or treat an account-authorization action as consent to a write.

## Submit an explicit decision

These backend functions assume an initialized, appropriately authorized client. Check business ownership first, and derive `approved` from the authenticated person's explicit choice.

```python
def decide_selected(run_id, approval_id, approved):
    rows = client.approvals(run_id)['approvals']
    selected = next((row for row in rows if row['id'] == approval_id), None)
    if selected is None or selected['state'] != 'pending':
        raise RuntimeError('Refresh the approval state before deciding')
    return client.decide(approval_id, approved)
```

```typescript
async function decideSelected(runId: string, approvalId: string, approved: boolean) {
  const { approvals } = await client.approvals(runId);
  const selected = approvals.find((row: { id: string }) => row.id === approvalId);
  if (!selected || selected.state !== 'pending')
    throw new Error('Refresh the approval state before deciding');
  return client.decide(approvalId, approved);
}
```

State can change between reading and deciding. The server is authoritative. On `stale_approval`, refresh the approval and Run; do not create a replacement to evade the guard.

## Repetition, expiry, and cancellation

An identical recorded decision returns its prior result. An opposite decision or invalid state cannot overwrite it. These example functions conservatively require pending state before calling; after a lost response, query stored state/decision to determine whether the original choice was recorded.

Cancellation expires pending approvals; late approval cannot revive the Run. An approved request already dispatched may have external effects that cancellation cannot reverse. Denial returns a Tool refusal for the Harness to handle; it does not automatically cancel the entire task.

Waiting can also represent an unknown Tool outcome. If a write was sent but its response was lost, inspect calls and [reconcile](../../../tool-reconciliation.md). Approving again is not a safe replay mechanism. Operator resolution requires actual external evidence.

## Verify the complete flow

With an authorized disposable test object, prove zero writes before approval, exactly one afterward with correct contents, zero after denial, no duplicate after repeated decisions, and no revival after cancellation. Refresh the page to confirm decisions survive independently of browser memory.

Audit the business actor, request, and returned decision without logging credentials. Separate simulated broker checks, actual third-party operations, and cloud Harness journeys; contract checks do not prove the entire production path.

Sources: [decision transaction](../../../../modules/execution/runs.ts), [Token route permissions](../../../../modules/credentials/application-tokens.ts). Next: [Tool authorization](tool-authorization.md), [durable events](stream-events.md).
