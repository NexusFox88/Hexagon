# Runs HTTP contract

Use these operations to submit one task to a Session, recover its result, observe persisted events and request cancellation. All paths below include `/v1`. Owner and application tokens may use these routes, subject to tenant ownership and state checks. This reference describes the current source contract, not a fresh HTTP or cloud acceptance run.

## Submit a Run

`POST /v1/sessions/{session_id}/runs` returns **202** and a Run object. `{session_id}` must be a UUID belonging to the authenticated tenant.

| Input | Type / requirement | Meaning |
| --- | --- | --- |
| `Idempotency-Key` header | Required string, 1–256 characters | Identifies one submission within the tenant and Session |
| `input` | Required string, 1–100,000 JavaScript string code units; cannot be whitespace-only | Task text; preserved as submitted |
| `origin` | Optional strict object | Caller-supplied correlation metadata, not authorization |
| `origin.message_id` | Optional string, 1–256 characters | Your original message identifier |
| `origin.request_id` | Optional string, 1–256 characters | Your request identifier |
| `origin.channel` | Optional string, 1–100 characters | Your source-channel label |

Unknown body or origin properties are rejected. Input plus compiled initialization context must also fit the 120,000-byte UTF-8 submission bound; the string-length limit alone is insufficient. An omitted or empty origin becomes `{}`.

Persist the Session ID, exact body and key before sending. With an existing Session and trusted backend token, prepare a request file containing:

```json
{
  "input": "Read the uploaded project and explain its entry point.",
  "origin": {"message_id": "message-001", "request_id": "request-001", "channel": "project-ui"}
}
```

Save it as `run-request.json`, then send it using a previously saved key:

```sh
curl --fail-with-body --silent --show-error \
  -H "Authorization: Bearer $HEXAGON_API_TOKEN" \
  -H 'Content-Type: application/json' \
  -H "Idempotency-Key: $HEXAGON_RUN_KEY" \
  --data-binary @run-request.json \
  "$HEXAGON_API_URL/v1/sessions/$HEXAGON_SESSION_ID/runs"
```

`HEXAGON_API_URL` is the origin without `/v1`. These shell variables are example inputs, not server settings. Do not expose tokens in recorded shell traces. Save the response ID before starting observation. A 202 response establishes acceptance, not execution completion, a working Sandbox, passing tests or exported artifacts.

### Idempotency and state rules

The lookup key is tenant + Session + key. The stored request hash covers the submitted text and nonempty parsed origin. Replay the saved body unchanged; changing input or origin with the same key produces `409 idempotency_conflict`. A matching prior submission returns its current Run even if the Session subsequently closed, because the prior-request lookup precedes new-submission state checks. This is not permission to create new work in a closed Session.

For a new key, accepted Session states are `open`, `paused`, `pausing` and `resuming`; the worker handles wake/reconciliation. Only one nonterminal Run may exist per Session. Busy submission is rejected rather than queued behind it. Both bound Sandbox and model connections must still be enabled, ready and not deleted. Context-file references are checked against uploaded bytes before acceptance. The Run and initial `run.queued` event commit together.

| Failure | Status | Response action |
| --- | --- | --- |
| Malformed UUID/body/header | 400, `invalid_request` | Correct validation errors before resubmitting |
| Whitespace-only input | 400, `invalid_submission` | Supply meaningful input |
| Missing or foreign Session | 404, `session_not_found` | Check tenant and ID; do not infer another tenant's resources |
| Key reused with changed content | 409, `idempotency_conflict` | Recover the original request; use a new key only for an intentional new task |
| Another nonterminal Run | 409, `session_busy` | Observe or cancel the existing Run before another task |
| Session closing/closed | 409, `session_closed` | Query history; use a new Session for new work |
| Control-plane expiry detected | 409, `sandbox_expired` | Inspect lifecycle/resource status |
| Bound connection unavailable | 409, `connection_not_ready` | Diagnose connection state; do not swap immutable Session bindings |
| Referenced context absent/changed | 409, `context_file_missing` / `context_file_changed` | Correct the initial context contract before execution |
| Context file exceeds bound | 413, `context_file_too_large` | Reduce the referenced file within supported limits |
| Invalid context text | 400, `context_file_encoding` | Supply valid UTF-8 text without NUL |
| Combined UTF-8 input/context too large | 413, `input_too_large` | Reduce input/context, not just character count |

A lost response is different from any confirmed error above. Repeat the original submit with the same body/key to recover its Run. Do not generate a fresh key as a transport retry. See the common [error envelope](errors.md).

## Run response

Submit, `GET /v1/runs/{id}`, cancellation and the per-Session Run list use this public representation:

| Field | Shape | Interpretation |
| --- | --- | --- |
| `id`, `session_id` | UUID strings | Stable Run and parent Session identifiers |
| `state` | String | One of the Run states below |
| `input` | String | Original submitted task |
| `output` | Nullable JSON object | Current successful worker output is `{role:"assistant", text, artifacts}`; not a substitute for state or separate artifact queries |
| `error` | Nullable JSON object | Execution/recovery diagnostic, commonly with `code`; inspect even when a Run is nonterminal |
| `origin` | Object | Parsed caller-supplied correlation fields, or `{}` |
| `execution_identity` | Object | Persisted execution context; see below |
| `created_at`, `updated_at` | Timestamp strings | Server record timestamps |

`execution_identity` on new submissions includes `tenant_id`, `session_id`, `agent_id`, `agent_revision` and, when supplied by authentication, `principal` with optional `key_id` and `role`. Direct Sessions may have no saved Agent identity. Historical rows can contain `{}`. Do not use caller-provided origin metadata as proof of identity or treat this snapshot as an independent access credential. Worker lease fields, request hash, idempotency key and Runtime cursor are not part of `publicRun`.

Run states are `queued`, `provisioning`, `running`, `waiting_authorization`, `waiting_approval`, `cancelling`, `completed`, `failed` and `cancelled`. Only the last three are terminal. Session and Runtime states are separate; see [events and states](events-and-states.md).

Retrieve one Run with no body or query parameters:

```sh
curl --fail-with-body --silent --show-error \
  -H "Authorization: Bearer $HEXAGON_API_TOKEN" \
  "$HEXAGON_API_URL/v1/runs/$HEXAGON_RUN_ID"
```

Success is **200**. A missing/foreign Run returns `404 run_not_found`.

## List Runs: two different contracts

### Runs in one Session

`GET /v1/sessions/{session_id}/runs` returns **200** with `{ "runs": [...] }`, where entries are full public Run objects. Optional `before` is a schema-validated datetime; the comparison is strictly `created_at < before`. The page is bounded at 100 and ordered by creation time descending. There is no `next_offset` or `has_more` field on this route.

```sh
curl --fail-with-body --silent --show-error --get \
  -H "Authorization: Bearer $HEXAGON_API_TOKEN" \
  --data-urlencode "before=$HEXAGON_BEFORE_TIMESTAMP" \
  "$HEXAGON_API_URL/v1/sessions/$HEXAGON_SESSION_ID/runs"
```

Omit `before` for the first page. The current timestamp-only cursor has no ID tie-breaker; equal timestamps at a page boundary can be skipped. Do not promise lossless exhaustive export using this cursor. Missing/foreign Session returns `404 session_not_found`.

### Tenant-wide Run summaries

`GET /v1/runs` returns **200** with `{ "runs": [...], "offset": 0, "next_offset": null }` or a numeric next offset.

| Query | Default and constraints |
| --- | --- |
| `limit` | 25; integer 1–100 |
| `offset` | 0; nonnegative integer |
| `search` | Empty string; at most 200 characters |
| `state` | Empty string; at most 40 characters; exact state filter when nonempty |

Search is a case-insensitive substring match across Run ID, Session ID, input and Session definition name. Results sort by `created_at DESC, id DESC`. Entries contain `id`, `session_id`, `state`, `created_at`, `updated_at`, `error`, `input_preview` (first 240 database text characters) and `agent_name`. They are summaries, not the full Run response. Concurrent insertions can shift offsets; this is not a snapshot export.

```sh
curl --fail-with-body --silent --show-error --get \
  -H "Authorization: Bearer $HEXAGON_API_TOKEN" \
  --data-urlencode 'limit=25' --data-urlencode 'offset=0' \
  --data-urlencode 'state=failed' \
  "$HEXAGON_API_URL/v1/runs"
```

## Read or stream persisted events

`GET /v1/runs/{id}/events?after=0` returns **200** and `{ "events": [...] }`. Each entry contains string `id`, string `type`, JSON `data` and `created_at`. `after` defaults to `"0"`, must contain only decimal digits and is exclusive. A page contains at most 500 entries ordered by increasing sequence. Save the last processed ID; gaps are valid. Query again until no entries remain, and continue if the Run is active. Absence of events alone is not completion.

```sh
curl --fail-with-body --silent --show-error --get \
  -H "Authorization: Bearer $HEXAGON_API_TOKEN" \
  --data-urlencode "after=$HEXAGON_EVENT_CURSOR" \
  "$HEXAGON_API_URL/v1/runs/$HEXAGON_RUN_ID/events"
```

`GET /v1/runs/{id}/stream` returns **200** `text/event-stream`. Cursor precedence is explicit `after`, then `Last-Event-ID`, then `"0"`. It emits persisted events as SSE `id`, `event` and JSON `data`; the stream does not include the JSON-list timestamp field. Heartbeats are comment frames (`: keepalive`) after approximately 15 seconds without heartbeat emission. The server checks for new data at 500 ms intervals when no page is available.

```sh
curl --fail-with-body --silent --show-error --no-buffer --get \
  -H "Authorization: Bearer $HEXAGON_API_TOKEN" \
  --data-urlencode "after=$HEXAGON_EVENT_CURSOR" \
  "$HEXAGON_API_URL/v1/runs/$HEXAGON_RUN_ID/stream"
```

After observing a terminal Run, the server rechecks persisted events before emitting unnumbered `stream.end` with `{ "state": "completed" }` (or failed/cancelled). This example is a shape, not an execution receipt. Do not store `stream.end` as a new event cursor. Unexpected EOF requires re-query/reconnect using the last committed cursor; closing the client stream does not cancel the Run. Missing/foreign Run returns 404 before opening the stream; failure after headers may instead appear as a disconnected stream.

## Cancel a Run

`POST /v1/runs/{id}/cancel` takes no required body and returns **200** with a public Run object:

```sh
curl --fail-with-body --silent --show-error --request POST \
  -H "Authorization: Bearer $HEXAGON_API_TOKEN" \
  "$HEXAGON_API_URL/v1/runs/$HEXAGON_RUN_ID/cancel"
```

A queued Run becomes `cancelled`; another nonterminal Run becomes `cancelling`. Pending approvals expire in the same transaction, and the corresponding state event is persisted. Already terminal or cancelling Runs return their current representation without another cancellation transition. Continue querying until terminal. This operation does not promise immediate process termination, rollback of dispatched Tool writes or Session resource cleanup. Close the Session separately when finished. Missing/foreign Run returns `404 run_not_found`.

Sources: [HTTP routes and public projection](../../../../apps/control-plane/server.ts), [submission/events/cancellation](../../../../modules/execution/runs.ts), [collection queries](../../../../modules/execution/queries.ts). Next: [HTTP inventory](http.md), [events](events-and-states.md), [recovery](../build/recovery.md).
