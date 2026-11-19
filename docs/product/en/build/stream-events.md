# Display Run events in your application

Build progress UI from durable events. A stream is an observation channel: closing a browser, losing a proxy connection, or timing out locally does not cancel a Run.

Start with [backend integration](backend-integration.md) and a Run ID authorized through your business records. The examples use an initialized client and application-owned persistence callbacks.

## Consume and commit a cursor

```python
cursor = saved_cursor or '0'
for event in client.stream(run_id, cursor):
    if event.get('id'):
        # Deduplicate and save the event plus cursor in one application transaction.
        store_event_and_cursor_atomically(run_id, event)
        cursor = event['id']
    else:
        handle_transport_event(event)
result = client.run(run_id)
```

```typescript
let cursor = savedCursor ?? '0';
for await (const event of client.stream(runId, cursor)) {
  if (event.id) {
    await storeEventAndCursorAtomically(runId, event);
    cursor = event.id;
  } else {
    handleTransportEvent(event);
  }
}
const result = await client.run(runId);
```

The storage and handling functions are application callbacks, not SDK methods. Deduplicate by Run and event ID. Advancing the cursor before storing an event can lose data; replay after storing is safe when writes are idempotent. Keep IDs as numeric strings rather than converting them to JavaScript Numbers.

## Reconnect to the original Run

The SDK does not provide unbounded automatic retries. After a transport failure, call `stream` on the same Run using the last committed cursor. Use bounded backoff for transport faults; authentication failures require correcting identity first.

TypeScript accepts an AbortSignal as the third `stream` argument to stop local observation. Cancellation is a separate `cancel` call. Closing a Python iterator connection likewise does not cancel execution.

The HTTP endpoint accepts `after` or `Last-Event-ID`; explicit `after` takes precedence, and the SDK uses it. `stream.end` has no event ID. It indicates that the stream has drained a terminal Run, not a durable business event to checkpoint. Query the Run afterward for final status and output.

## Read without streaming

Python `client.events(run_id, cursor)` and TypeScript `await client.events(runId, cursor)` return an `events` array. Each page currently contains at most 500 events. Advance to its last ID and continue until an empty page. An empty page does not establish completion.

Use Run queries for the current state and events for the timeline. Lack of tokens can mean provisioning, authorization, or approval wait rather than failure.

## Present progress safely

Keep connection state separate from execution state. Preserve progress during reconnects, expose actionable waiting states, and distinguish completed, failed, and cancelled. Tool output is not automatically the final assistant answer; use Run `output` for that result.

Authorize backend forwarding through your business records. Do not expose control-plane Tokens to browsers. Render logs and user content as untrusted text rather than executable HTML.

## Verify

Disconnect and reconnect deliberately. Confirm the same Run, no duplicated event IDs, and final state matching a durable query. Simulate a crash between event persistence and UI delivery. Confirm that stopping observation leaves execution running, while explicit cancellation follows its separate lifecycle.

Sources: [stream route](../../../../apps/control-plane/server.ts), [event queries](../../../../modules/execution/runs.ts), [SDK](../../../../sdk/README.md). Next: [Artifacts](artifacts.md).
