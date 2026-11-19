# Resource operation review HTTP contract

Use these owner-only endpoints to inspect cloud resource operations whose outcome may be uncertain. They are available when the lifecycle service is configured. Every lookup is tenant-scoped. An acknowledgement records a review decision; it is not proof that a cloud resource is absent or that cleanup succeeded.

Examples use an owner token in `HEXAGON_API_TOKEN` and the control-plane origin without `/v1` in `HEXAGON_API_URL`. Resource identifiers belong in private recovery records, not public reports. Missing authentication returns 401; an application token returns `403 owner_token_required`.

## List operations

`GET /v1/resource-operations` returns **200**, `{operations:[...],next_offset:number|null}`. Query parameters are integer `limit` (1–100, default 50) and nonnegative integer `offset` (default 0). Results sort by `updated_at DESC, id ASC`. Concurrent updates can move rows between pages; this is not a stable audit snapshot. The endpoint lists all operation states, not just unknown operations.

```sh
curl --fail-with-body --silent --show-error --get \
  -H "Authorization: Bearer $HEXAGON_API_TOKEN" \
  --data-urlencode 'limit=50' --data-urlencode 'offset=0' \
  "$HEXAGON_API_URL/v1/resource-operations"
```

| Returned field | Meaning |
| --- | --- |
| `id`, `session_id` | Operation and owning Session IDs |
| `kind`, `state` | Resource operation kind/state; not the Run state |
| `provider_resource_id` | Recorded remote resource ID, if known |
| `attempt_count` | Recorded attempt count; not a license to repeat a mutation |
| `review_state` | Independent review status, such as automatic/needs_review/acknowledged |
| `last_checked_at`, `next_check_at` | Inspection/scheduling timestamps, possibly null |
| `created_at`, `updated_at` | Record timestamps |
| `reason`, `failure` | Selected diagnostic fields from operation detail, possibly null |
| `provider_operation_id`, `provider_build_id` | Provider-side operation/build receipt, if recorded |
| `provider`, `session_state` | Joined provider and current Session state; list response only |

The projection omits raw operation detail and credentials. Optional Provider identifiers are not guaranteed to exist after a lost creation response.

## Inspect one operation

`GET /v1/resource-operations/{id}` returns **200** with the operation fields above, excluding the list-only provider/session_state, and adds `reviews`. The reviews array contains at most the latest 50 entries ordered by creation time descending; each has `id`, `action`, `note`, `created_at`. There is no review-history pagination parameter.

```sh
curl --fail-with-body --silent --show-error \
  -H "Authorization: Bearer $HEXAGON_API_TOKEN" \
  "$HEXAGON_API_URL/v1/resource-operations/$HEXAGON_OPERATION_ID"
```

Missing/foreign operation returns `404 resource_operation_not_found`. Inspect the Session separately when using this detail response; do not expect the two joined list fields to be present.

## Record a review or request reconciliation

`POST /v1/resource-operations/{id}/review` accepts a strict body:

| Field | Constraint |
| --- | --- |
| `action` | Required acknowledge, reopen or reconcile |
| `note` | Optional string, trimmed, at most 2000 characters; default empty |

Only an operation whose state is **unknown** accepts a review. The error name `resource_operation_not_pending` does not mean that a state named pending is eligible.

| Action | Committed change | Immediate cloud work |
| --- | --- | --- |
| acknowledge | Appends review; sets review_state=acknowledged and clears next_check_at | None |
| reopen | Appends review; sets review_state=automatic and next_check_at=now | None; makes it eligible for automatic reconciliation |
| reconcile | Same review/scheduling update as reopen | Invokes the applicable Session lifecycle operation after the review transaction commits |

The following requests reopening, not confirmed cleanup:

```sh
curl --fail-with-body --silent --show-error \
  -H "Authorization: Bearer $HEXAGON_API_TOKEN" -H 'Content-Type: application/json' \
  --data '{"action":"reopen","note":"Review the existing operation and its recorded provider identifiers."}' \
  "$HEXAGON_API_URL/v1/resource-operations/$HEXAGON_OPERATION_ID/review"
```

Choose acknowledge only when intentionally acknowledging the unresolved case. To request active reconciliation, use action reconcile with a note describing the investigation. Lifecycle dispatch follows this precedence:

1. Session closing or operation kind delete → close the Session.
2. Kind checkpoint → pause the Session at Sandbox scope.
3. Kind restore → resume the Session.
4. Otherwise → call the Session provisioning reconciliation path.

This is a Session-level operation, not a generic read-only Provider lookup. It may perform the lifecycle work authorized by that path. It must retain the original operation/resource identity rather than blindly creating replacement resources. In particular, do not assume an arbitrary new operation kind has its own dedicated dispatch branch.

Success returns **200** with the current detail object. A caught domain `ExecutionError` during immediate reconciliation also returns **200**, adding `reconciliation_error` with its code. Thus HTTP 200 alone does not prove resolution. Check operation state, review_state, reconciliation_error, Session state and available Provider evidence. Unexpected non-domain exceptions propagate through normal server error handling, even though the review transaction may already have committed.

Malformed bodies return `400 invalid_request`; unknown/foreign operation returns 404; any operation not currently unknown returns `409 resource_operation_not_pending`. There is no Idempotency-Key support: repeating an accepted review can append another review record while the operation remains unknown. If the response is lost, read the latest reviews and state before deciding whether another action is necessary.

Acknowledgement does not change unknown into completed/deleted, and reopening does not guarantee an automatic attempt has already run. Keep unresolved IDs until actual cleanup can be confirmed. See [reconciliation procedure](../operate/reconciliation.md) for investigation and Provider checks.

Sources: [operation queries/review dispatch](../../../../modules/sandboxes/operations.ts), [route parameters](../../../../apps/control-plane/server.ts), [lifecycle reconciliation](../../../../modules/sandboxes/lifecycle.ts). Source and schema review do not establish fresh cloud recovery acceptance. Next: [HTTP inventory](http.md), [Session lifecycle](sessions.md).
