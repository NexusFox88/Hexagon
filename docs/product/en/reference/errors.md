# Error codes and handling

First identify whether the failure belongs to an HTTP request, background Run, Tool call or local command. An accepted request may later fail or wait; HTTP success does not establish task success. The table is an actionable index of common errors, not a promise that every internal error string is a stable public code.

## HTTP and SDK error format

```json
{"error":{"code":"invalid_request","fields":["harness","resources.timeout_seconds"]}}
```

This is an illustrative shape, not an execution log. The [HTTP handler](../../../../apps/control-plane/server.ts) maps Zod validation failures to 400 `invalid_request` with field paths; ExecutionError preserves its status and `error.code`. Fastify client errors become `invalid_http_request` with the corresponding 4xx status, including oversized bodies. Unclassified failures become 500 `internal_error` without exposing database queries or upstream exceptions.

Missing/invalid identity returns 401 `unauthorized`. Correct URL, Token and role rather than retrying permission failures. Tenant-scoped missing resources may return 404 without revealing that another tenant owns them.

Both SDKs expose `HexagonError.status` and `.code`; ordinary HTTP errors without a structured code use `http_error`. They do not preserve the example's `fields` array as an exception property. Network, timeout, JSON parsing and local discovery errors are not necessarily HexagonError. TypeScript stream-open failure uses `event_stream_failed`; Python truncated streams can raise ConnectionError. Do not assume every exception means the server rejected the operation. See [Python](../../../../sdk/python/hexagon/__init__.py) and [TypeScript](../../../../sdk/typescript/index.ts).

## Handle by phase

The HTTP column records the status at the corresponding ExecutionError branch. Background worker paths can record the same error on a Run/event rather than return it directly to the current caller. Source links identify actual branches, not fresh passing tests.

| Code | HTTP | Phase | Next action and resource implications | Source |
| --- | --- | --- | --- | --- |
| `invalid_submission` | 400 | Submission | Correct empty input/key; do not retry unchanged. | [runs.ts](../../../../modules/execution/runs.ts) |
| `idempotency_conflict` | 409 | Submission | Original request exists. Compare exact input/origin; reuse original intent, not a fresh key. | [runs.ts](../../../../modules/execution/runs.ts) |
| `session_busy` | 409 | Submission | An active Run exists; observe it and queue follow-up work in your application. | [lifecycle.ts](../../../../modules/sandboxes/lifecycle.ts) |
| `session_closed` | 409 | Submission | Inspect current Session state; create a deliberate new context only when appropriate. | [lifecycle.ts](../../../../modules/sandboxes/lifecycle.ts) |
| `sandbox_expired` | 409 | Submission | Inspect original resource cleanup before new work. | [lifecycle.ts](../../../../modules/sandboxes/lifecycle.ts) |
| `connection_not_ready` | 409 | Submission | Validate/enable the selected connection; old resources may still exist. | [lifecycle.ts](../../../../modules/sandboxes/lifecycle.ts) |
| `context_file_missing` | 409 | Submission | Upload the referenced file to the same Session before submitting. | [runs.ts](../../../../modules/execution/runs.ts) |
| `context_file_changed` | 409 | Submission | Compare pinned SHA-256 and uploaded bytes; do not ignore the mismatch. | [runs.ts](../../../../modules/execution/runs.ts) |
| `context_file_encoding` | 400 | Submission | Supply valid UTF-8 text without NUL. | [runs.ts](../../../../modules/execution/runs.ts) |
| `context_file_too_large` | 413 | Submission | Reduce referenced background text; see limits. | [runs.ts](../../../../modules/execution/runs.ts) |
| `input_too_large` | 413 | Submission | Reduce input plus compiled background bytes. | [runs.ts](../../../../modules/execution/runs.ts) |
| `initialization_too_large` | 413 | Initialization | Reduce serialized/compiled initialization. | [initialization.ts](../../../../modules/execution/initialization.ts) |
| `upload_too_large` | 413 | Upload | Reduce decoded total or split valid batches; per-file limits remain. | [inputs.ts](../../../../modules/execution/inputs.ts) |
| `connection_changed_during_validation` | 409 | Connection validation | Read current configuration and validate that revision again. | [connections.ts](../../../../modules/connections/connections.ts) |
| `connection_in_use` | 409 | Connection deletion | Inspect dependent Sessions/definitions; settle dependencies without losing cleanup access. | [connections.ts](../../../../modules/connections/connections.ts) |
| `harness_version_conflict` | 409 | Registration | Use existing identical definition or deliberately register a new immutable version. | [images.ts](../../../../modules/harnesses/images.ts) |
| `preview_session_unavailable` | 409 | Preview | Check Session/resource state; do not interpret unavailable preview as failed Run. | [previews.ts](../../../../modules/sandboxes/previews.ts) |
| `preview_unauthorized` | 401 | Preview access | Check grant expiry/revocation and authorized access; never log the grant URL. | [previews.ts](../../../../modules/sandboxes/previews.ts) |
| `tool_call_conflict` | 409 | Tool call / resolution | Compare call identity/arguments and exact request hash; never replace evidence to force acceptance. | [broker.ts](../../../../modules/tools/broker.ts) |
| `tool_call_in_flight` | 409 | Tool resolution | Wait for the broker lock to settle, then re-query; do not concurrently resolve. | [reconciliation.ts](../../../../modules/tools/reconciliation.ts) |
| `tool_outcome_not_unknown` | 409 | Tool resolution | Read current call state; resolution is only for unknown outcomes. | [reconciliation.ts](../../../../modules/tools/reconciliation.ts) |
| `tool_resolution_conflict` | 409 | Tool resolution | An incompatible resolution was recorded; inspect it rather than overwriting. | [reconciliation.ts](../../../../modules/tools/reconciliation.ts) |
| `tool_authorization_not_pending` | 409 | Authorization refusal | Re-query the original call; its authorization wait has changed. | [reconciliation.ts](../../../../modules/tools/reconciliation.ts) |
| `tool_run_not_active` | 409 | Tool decision | Do not revive terminal/cancelling work; inspect recorded effects. | [broker.ts](../../../../modules/tools/broker.ts) |
| `tool_account_changed` | 409 | Tool dispatch | Reconcile account identity and pinned binding; do not silently switch accounts. | [broker.ts](../../../../modules/tools/broker.ts) |
| `mcp_schema_changed` | 409 | Tool dispatch | Revalidate discovery and choose a new compatible binding/Session as needed. | [broker.ts](../../../../modules/tools/broker.ts) |
| `tool_operation_unavailable` | 400 | Tool dispatch | Check selected and pinned operation catalogs; do not broaden permissions automatically. | [broker.ts](../../../../modules/tools/broker.ts) |
| `lease_lost` | 409 | Worker update | Stale execution authority: let current owner recover; never force a duplicate invocation. | [artifacts.ts](../../../../modules/artifacts/artifacts.ts) |
| `invalid_artifact_manifest` | 400 | Artifact capture | Inspect duplicates and aggregate size; failed capture does not undo the task. | [artifacts.ts](../../../../modules/artifacts/artifacts.ts) |
| `artifact_integrity_failed` | 400 | Artifact capture | Check size, canonical Base64 and SHA-256; do not return corrupted output. | [artifacts.ts](../../../../modules/artifacts/artifacts.ts) |
| `artifact_conflict` | 409 | Artifact capture | Same Run/name already has different bytes; retain and investigate both claims. | [artifacts.ts](../../../../modules/artifacts/artifacts.ts) |

## Preflight reasons are not retry instructions

[Combination preflight](../../../../modules/execution/compatibility.ts) returns `compatibility.reasons`, including `incompatible_model`, `harness_tools_unsupported`, `sandbox_oci_image_unsupported`, `sandbox_private_image_unsupported`, `harness_initialization_unsupported`, `missing_capability`, `network_policy_unsupported` and `credential_proxy_not_allowed_by_network_policy`. These describe incompatibility; they do not all imply the same HTTP response or a failed remote allocation. Correct the combination or explicitly revise requirements. Never silently replace an allowlist with unrestricted access.

## Establish the original outcome before retrying

- Query/event transport failure: bounded backoff, same Run and committed cursor; correct authentication first when applicable.
- Lost Run submission response: recover with the same Session, input, origin and key; do not generate another key.
- Lost Session/cloud creation response: preserve intent, identifiers and time; inspect original objects/operations. Do not assume Run submission idempotency applies.
- Unknown Tool write: inspect call, request hash and pinned policy, then resolve only after checking upstream records; do not re-dispatch.
- Unconfirmed close/delete: retain resource/deletion receipts and reconcile the original operation. Stopping the service or an empty list does not universally prove cleanup.

Resources may already exist and writes may already have happened. Neither `internal_error` nor client timeout guarantees no effects. Follow [recovery](../build/recovery.md) and [reconciliation](../operate/reconciliation.md).

## Unclassified errors and local commands

Record time, request method and sanitized path, HTTP status/code, business correlation ID and private Session/Run/operation references. Query durable Run, Tool call and resource-operation state, then export [diagnostics](../operate/observability.md). Exclude Authorization headers, credential-bearing preview URLs, original secrets and complete user inputs.

The local launcher, dependency probes, provider SDKs and some Runtime failures still emit text or ordinary exceptions rather than a unified HTTP code. Follow [CLI](cli.md) and the relevant integration guide; do not invent API codes for them. When implementation/evidence is inconclusive, retain the unknown state and distinguish observed facts from unverified conclusions.

This page was checked against error branches and SDK source; no fault injection was run in this documentation pass. Next: [troubleshooting](../operate/troubleshooting.md), [limits](limits.md), [recovery](../build/recovery.md).
