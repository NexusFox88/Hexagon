# Monitoring and collection HTTP contract

These read models describe persisted control-plane state. They are not direct Provider inspections, billing measurements or proof of successful model execution. All `/v1` routes require authentication and tenant scoping. Health, Session list/activity permit application tokens; overview, pending and Fleet require an owner.

## Health

`GET /v1/health` queries the database and returns process_id, boolean active_runs, api/database readiness, credentials, credential_access and execution. Optional health services can report not_configured. If credentials.state is unavailable, the route returns **503**; otherwise its normal response is **200**. Database errors use the server error handler. Inspect the fields, not just the HTTP status: the handler does not turn every degraded execution/access condition into 503.

```sh
curl --fail-with-body --silent --show-error \
  -H "Authorization: Bearer $HEXAGON_API_TOKEN" "$HEXAGON_API_URL/v1/health"
```

`GET /health/live` is a separate unauthenticated liveness route returning `{status:"alive"}`. It does not query dependencies. Use readiness and lifecycle diagnostics for operational decisions rather than treating liveness as full health.

## Session collection

`GET /v1/sessions` returns **200**, `{sessions:[...],offset,next_offset}`. Limit defaults 25 (integer 1–100), offset defaults 0 (nonnegative integer), search defaults empty (≤200 characters), state defaults empty (≤40). Nonempty state is an exact Session-state filter. Search matches case-insensitive substrings of Session ID, Agent ID and definition name. Sort is created_at DESC, id DESC. Next offset is null at the observed end; concurrent inserts can shift pages.

```sh
curl --fail-with-body --silent --show-error --get \
  -H "Authorization: Bearer $HEXAGON_API_TOKEN" \
  --data-urlencode 'limit=25' --data-urlencode 'offset=0' --data-urlencode 'state=open' \
  "$HEXAGON_API_URL/v1/sessions"
```

Rows contain id, agent_id, agent_revision, definition, env_names, state, sandbox, created_at, updated_at, harness, runtime_state and nullable latest_run. Latest_run contains id/state/input_preview (first 240 database text characters), selected by Run created_at DESC/id DESC. Runtime state comes from the recorded binding. This projection differs from single-Session GET and Fleet; do not infer a universal Session response type across all routes. Environment values are not returned.

## Task activity

`GET /v1/sessions/activity` accepts period `24h` (default) or `7d`. It returns **200** with active_sessions, idle_sessions, paused_sessions, period, buckets and checked_at.

```sh
curl --fail-with-body --silent --show-error --get \
  -H "Authorization: Bearer $HEXAGON_API_TOKEN" --data-urlencode 'period=24h' \
  "$HEXAGON_API_URL/v1/sessions/activity"
```

| Metric | Definition |
| --- | --- |
| active_sessions | Open/paused/pausing/resuming Sessions with a nonterminal Run |
| idle_sessions | Open Sessions without a nonterminal Run |
| paused_sessions | Sessions currently paused, regardless of queued work |
| buckets[].active_sessions | Distinct Session IDs whose Runs overlap that interval |

The categories are not necessarily disjoint: a paused Session with newly submitted work can be active and paused. Each bucket has start and active_sessions. The 24h period has hourly rolling buckets; 7d has daily rolling buckets anchored to query time, not calendar midnight. Terminal Run overlap ends at updated_at; nonterminal overlap extends to current time. These counts cover the tenant's full data rather than the current Session list page. They measure task activity, not CPU utilization, HTTP traffic or billed compute.

## Overview

`GET /v1/overview` returns **200**, counters plus checked_at:

- ready_connections: undeleted, enabled, ready connection rows.
- open_sessions: state open, not all nonclosed Sessions.
- active_runs: all nonterminal Runs.
- pending_approvals: pending approval rows.
- pending_authorizations: Tool calls waiting_authorization.
- unknown_operations: all unknown resource operations, including acknowledged ones.
- active_agents: unarchived Agent templates.

```sh
curl --fail-with-body --silent --show-error \
  -H "Authorization: Bearer $HEXAGON_API_TOKEN" "$HEXAGON_API_URL/v1/overview"
```

## Pending work

`GET /v1/pending` returns **200**, `{items:[...],offset,next_offset}`. It uses the same limit/offset bounds as collection queries. Although shared parsing accepts search/state, the current SQL does not apply those two filters. Do not present them as supported filtering behavior on this endpoint.

```sh
curl --fail-with-body --silent --show-error --get \
  -H "Authorization: Bearer $HEXAGON_API_TOKEN" \
  --data-urlencode 'limit=25' --data-urlencode 'offset=0' \
  "$HEXAGON_API_URL/v1/pending"
```

Rows contain id, kind, state, session_id, nullable run_id and created_at, ordered oldest first by created_at/id. Kinds are approval (pending), authorization (Tool waiting_authorization), tool_outcome (Tool unknown), resource (resource unknown and review_state not acknowledged). An acknowledged unknown operation therefore remains in the overview count but disappears from this queue. These are stored pending rows; read the corresponding operation before acting, since the associated Run or decision may have changed.

## Fleet snapshot

`GET /v1/fleet` returns **200**, `{sessions:[...]}`, at most the latest 200 Sessions by creation time. There is no pagination contract. Each entry contains id, agent_id, definition, env_names, state, sandbox, created_at, updated_at, runtime_state, latest_run and resource_operations.

```sh
curl --fail-with-body --silent --show-error \
  -H "Authorization: Bearer $HEXAGON_API_TOKEN" "$HEXAGON_API_URL/v1/fleet"
```

Fleet reports runtime_state=stopped for closed Sessions; otherwise it uses the persisted binding state. Latest_run has id/state/updated_at, selected by creation time descending. Each resource operation has id, kind, state, provider_resource_id, reason (only populated for unknown/rejected) and updated_at. Resource operations are ordered by creation time/ID; no records yield an empty array. This is not a live Provider poll and cannot prove that all remote resources are absent. Its 200-Session bound must not be used to certify global cleanup.

Malformed query values return `400 invalid_request`. Owner-only route access with an application token returns `403 owner_token_required`; missing identity returns 401. Use [resource operations](resource-operations.md) and [Runs](runs.md) for object-specific investigation. Sources: [query implementation](../../../../modules/execution/queries.ts), [Fleet projection](../../../../modules/execution/sessions.ts), [HTTP routes](../../../../apps/control-plane/server.ts). Examples are source-reviewed; no live deployment queries or monitoring acceptance were run in this pass.
