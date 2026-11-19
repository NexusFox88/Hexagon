# Reconcile uncertain cloud resources and Tool operations

Remote operations can take effect before their response is lost. Unknown means investigation is needed, not automatic failure, noncreation, or deletion.

Use a management identity. Retain Session/operation IDs, Provider resource/operation handles, and timing privately; publish redacted summaries.

## Inspect and review

```python
page = client.resource_operations(limit=50)
operation = client.resource_operation(operation_id)
# Explicit review action against the original operation:
result = client.review_resource_operation(operation_id, 'reconcile', 'Recheck original operation')
```

```typescript
const page = await client.resourceOperations(50);
const operation = await client.resourceOperation(operationId);
const result = await client.reviewResourceOperation(operationId, 'reconcile', 'Recheck original operation');
```

Follow next_offset to inspect the full listing. Review applies to unknown operations. Reconcile invokes lifecycle logic and can perform cloud actions; it is not a read-only button. A reconciliation_error remains investigable even if the HTTP request succeeded.

Acknowledge pauses automatic review while retaining unknown. Reopen restores automatic checks. Operator notes do not prove cleanup.

## Three cases

**Lost creation response:** query the original operation ID, exact name, or Provider handle. One trustworthy match can restore a binding; multiple matches require ownership investigation. Zero matches can reflect asynchronous creation, pagination, or eventual consistency. An empty list alone does not justify creating another resource.

**Lost deletion response:** inspect the original resource and associated endpoints. Confirmed absence permits completion; presence requires continuing the original deletion intent. Uncertainty retains closing. Stopped compute, retained snapshots, and preview endpoints have distinct cleanup boundaries.

**Lost Tool write response:** correlate the call ID/request hash with external records. Then use resolve_tool_call/resolveToolCall to deliver a verified success or failure without resending the request. Explain the actual evidence; otherwise keep unknown.

## Stop blind automation

Unclear ownership, multiple matches, unavailable Providers, and pending asynchronous operations require retained records and bounded backoff. Do not hide uncertainty by deleting connections, editing database states, or creating replacement Sessions.

Cancellation cannot retract dispatched writes. Repeated close can reconcile the same resources, but unknown effects remain accountable. Successful output is not proof of globally zero orphan resources.

Completion requires a verifiable terminal outcome or an explicitly retained unresolved conclusion for every operation. Confirm exact resource/endpoint absence and matching Session state. Tool resolution needs the hash, external facts, and audit result. Test fault cases separately from normal closure.

Sources: [resource review](../../../../modules/sandboxes/operations.ts), [Tool reconciliation](../../../tool-reconciliation.md). Next: [diagnostics](observability.md), [backup/restore](backup-restore.md).
