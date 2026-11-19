# Continue work across turns

Reuse a Session for ongoing project work. Each submission creates a new Run with its own input, events, and result.

Start with an open Session and no active Run. The first Session tutorial explicitly closes its resources, so its closed Session cannot be reused.

## Submit a follow-up

Assume the first Run created `notes.txt` in the workspace and completed. Read the IDs and the new submission key from your application's durable records.

```python
first = client.run(first_run_id)
if first['state'] != 'completed':
    raise RuntimeError('Inspect the first Run before continuing')
second = client.submit(
    session_id,
    'Read notes.txt, append a section named Next steps, and export the updated file into your Run artifact directory.',
    saved_second_turn_key,
)
print(second['id'])
```

```typescript
const first = await client.run(firstRunId);
if (first.state !== 'completed') throw new Error('Inspect the first Run before continuing');
const second = await client.submit(sessionId,
  'Read notes.txt, append a section named Next steps, and export the updated file into your Run artifact directory.',
  savedSecondTurnKey);
console.log(second.id);
```

Use a new key for the second turn and reuse that key for retries of that same turn. Sending different content with the first turn's key causes an idempotency conflict.

## Concurrency and waits

A Session permits one active Run. Waiting for Tool authorization or approval still counts as active. A status check does not prevent another client from submitting concurrently, so handle `session_busy` even after observing completion.

Your application may serialize messages or ask the user to settle the current task. Hexagon does not automatically queue all busy-session submissions. Separate Sessions suit independent workspaces; splitting Sessions loses the shared context that an ongoing task may need.

## Continuity

After planned idle suspension, the next submit coordinates waking the Session. Files and Harness conversation continuity depend on the combination and recovery strategy. Arbitrary process memory, sockets, and background services are not portable guarantees. See [Serverless Sessions](../../../serverless-sessions.md).

Each Run exports a separate artifact snapshot. Later modifications do not rewrite earlier exported output. Use workspace paths to read existing files; an Artifact ID is not a filesystem path.

Another SDK language can continue the Session when connected to the same control plane with appropriate authorization. The Session ID identifies the context, not an in-memory SDK client object.

## Verify and recover

Confirm two distinct Run IDs belong to the same Session. Check that the second task reads the first file, retains its original content, and adds the requested section. Verify conversation continuity separately if your application depends on it; file retention alone does not prove conversation recovery.

Investigate partial changes after a failed first turn before resubmitting work. Runtime interruption and unknown remote outcomes do not imply safe replay. Explicitly close after the final turn and confirm resource cleanup.

Sources: [submission and active-Run checks](../../../../modules/execution/runs.ts), [lifecycle contract](../../../serverless-sessions.md). Next: [Backend integration](backend-integration.md).
