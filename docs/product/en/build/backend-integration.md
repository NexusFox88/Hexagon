# Integrate an Agent into your backend

Keep the Hexagon client in your backend. Authenticate business users there, persist Session and Run identifiers, and return authorized results to the frontend. The browser should not hold control-plane administration credentials.

This guide assumes the [first Session tutorial](../start/first-session.md), verified Sandbox/model connections, and a durable application database. Code snippets illustrate SDK calls; authentication, business authorization, and application transactions remain your responsibility.

## Persist the relationships

The following is a suggested application model, not Hexagon's database schema:

| Application record | Data to retain | Purpose |
| --- | --- | --- |
| Work context | Business user/workspace, task ID, Session ID | Authorize every read and mutation |
| Submission intent | Business request ID, Session ID, exact input, origin, idempotency key | Recover a lost submission response |
| Execution | Run ID, last observed state, result reference | Resume queries after backend restart |
| Observation | Run ID and last committed event cursor | Replay and deduplicate events |
| Cleanup | Session ID, close intent, confirmed status | Recover unfinished resource cleanup |

A well-formed Session ID is not authorization. Resolve its ownership through your business database before contacting Hexagon. This remains necessary when multiple business users share one control-plane tenant.

## Initialize the client

Use local discovery for local development. For a remote control plane, configure the URL and an appropriate application Token on the backend.

```python
import os
from hexagon import Hexagon
client = Hexagon(os.environ['HEXAGON_API_URL'], os.environ['HEXAGON_API_TOKEN'])
```

After installing the locally built TypeScript package in your application:

```typescript
import { Hexagon } from '@hexagon/agent-sdk';
const apiUrl = process.env.HEXAGON_API_URL;
const apiToken = process.env.HEXAGON_API_TOKEN;
if (!apiUrl || !apiToken) throw new Error('Missing server-side Hexagon configuration');
const client = new Hexagon(apiUrl, apiToken);
```

Check permissions separately for administration, registrations, and approval decisions. An execution Token does not imply unrestricted management access. Exclude Tokens, authorization headers, and original Provider credentials from logs.

## Create context and submit work

Create a direct Session for the business context:

```python
session = client.create_session(
    harness={'id': 'pi', 'version': '1.5.2'},
    sandbox_connection_id=sandbox_connection_id,
    model_connection_id=model_connection_id,
)
# Persist session['id'] against the authorized business record before submission.
run = client.submit(session['id'], saved_input, saved_idempotency_key,
                    origin={'request_id': saved_business_request_id})
# Persist run['id'] against the same business request.
```

```typescript
const session = await client.createSession({
  harness: { id: 'pi', version: '1.5.2' },
  sandbox_connection_id: sandboxConnectionId,
  model_connection_id: modelConnectionId,
});
// Persist session.id against the authorized business record before submission.
const run = await client.submit(session.id, savedInput, savedIdempotencyKey,
  { request_id: savedBusinessRequestId });
// Persist run.id against the same business request.
```

The `saved*` values come from a committed submission intent, not fresh values generated on every HTTP retry. `origin` helps correlate requests; it does not replace authorization or idempotency. The request hash includes input and nonempty origin. Changing either while reusing a key produces `idempotency_conflict`.

Your database and Hexagon do not share a transaction. Handle the gap where a remote request succeeds before its response is saved: persist intent, send, then persist the response. Recover lost Run submission responses by resending the same Session, input, origin, and key.

Session creation does not have that Run idempotency contract. An unknown creation outcome requires investigation through Session queries or Console before creating another. Track such records in an observable recovery queue rather than repeatedly creating resources.

## Query and deliver results

Query saved Run IDs with `client.run(run_id)` in Python or `await client.run(runId)` in TypeScript. Distinguish queued, executing, waiting for authorization/approval, and terminal states in the UI.

Subscribe and forward events from the backend. Frontend disconnection means observation stopped; it must not automatically cancel execution. Confirm terminal state through durable queries. Recheck business ownership before delivering artifacts. Preview URLs are expiring access credentials and should not enter public logs.

## Handle concurrency and cleanup

Only one Run can be active per Session. On `session_busy`, your application can retain a message and submit it after the current Run terminates. This is an application queue, not an automatic platform queue. Use separate Sessions for independent work within account limits.

Assign an explicit close policy to every Session. Settle active work, request closure, and record the confirmed outcome. Process exit hooks are insufficient: unfinished cleanup must survive restarts in your database.

## Verify the integration

Test cross-user denial, lost-response recovery returning the same Run, backend restart without creating new work, frontend reconnect without duplicated events, and confirmed closure with retained artifacts. These are acceptance requirements, not claims that the snippets have passed a fresh cloud journey.

Sources: [Run submission implementation](../../../../modules/execution/runs.ts), [SDK guide](../../../../sdk/README.md). Next: [Files and context](project-context.md).
