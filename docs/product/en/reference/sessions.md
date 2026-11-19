# Sessions HTTP contract

A Session pins a working configuration and holds successive Runs. Creating one does not submit a task or prove that a cloud Sandbox can execute it. This page describes the source contract for creation, inspection, initial files and lifecycle operations. Paths include `/v1`; examples assume an authenticated backend and an origin in `HEXAGON_API_URL` without that prefix.

## Create and preflight

| Operation | Success | Effect |
| --- | --- | --- |
| `POST /v1/sessions/preflight` | 200, readiness object | Validates the proposed definition/bindings; does not insert a Session or provision its Sandbox |
| `POST /v1/sessions` | 201, Session object | Saves pinned configuration, environment and bindings; execution begins through a separate Run submission |

Both accept the same strict JSON body and allow owner/application tokens. Preflight also invokes configured credential-ingress readiness handling and checks tenant-owned connection state, secrets and compatibility. It is not a pure offline schema check, a capacity reservation, a model inference or a cloud execution receipt. A successful preflight does not reserve its checked configuration against later changes.

### Request fields

| Field | Requirement / default |
| --- | --- |
| `harness` | Direct Session: strict `{id: string, version: string}`; exact pair must exist in the current tenant's catalog |
| `agent_id` | Alternative saved-Agent UUID; supply exactly one of `harness` or `agent_id` |
| `agent_revision` | Positive integer, only with `agent_id`; omitted means the current revision at creation |
| `sandbox_connection_id` | Required UUID; tenant-owned Sandbox connection |
| `model_connection_id` | Required UUID; tenant-owned model connection |
| `name` | Optional direct-Session name, 1–200 characters; defaults to `Session` |
| `resources` | Optional strict object; `idle_timeout_seconds` integer 15–3600 (default 60), `timeout_seconds` integer 60–3600 (default 600) |
| `network` | Optional strict object; `mode` is `unrestricted` (default) or `allowlist`; `allowed_hosts` defaults to `[]`, each entry a nonempty string |
| `required_capabilities` | Optional array of strings; defaults to no additional required capability |
| `tools` | Name → Tool connection UUID map; default `{}`. Direct names match `^[a-z][a-z0-9_]*$` |
| `optional_tools` | Array of names from `tools`; default `[]`; direct Sessions only |
| `connections` | Protected API alias → HTTP connection UUID map; default `{}`; aliases match `^[a-z][a-z0-9_]{0,63}$` |
| `variables` | Optional environment name → string map; preferred spelling |
| `env` | Legacy environment map; default `{}`. Nonempty env together with variables is rejected |
| `identity`, `instructions`, `context` | Optional direct-Session behavior fields, detailed below |

Saved-Agent Sessions cannot override `identity`, `instructions`, `context`, `name`, `resources`, `network`, `required_capabilities` or nonempty `optional_tools`. They still require explicit Sandbox/model IDs and required Tool bindings; do not assume saved bindings are automatically supplied by this endpoint. Environment values overlay the saved Agent's defaults. An archived Agent cannot create new Sessions, including by selecting an older revision.

Every declared Tool requires a binding, including optional-at-start Tools. Optional means readiness may be deferred, not that the binding may be omitted. Bound Sandbox/model and protected HTTP connections must be enabled and ready. Connections must belong to the tenant and match their expected kind. A saved Agent rejects undeclared Tool names and missing declared bindings.

### Initialization and environment

| Field | Shape / limits |
| --- | --- |
| `identity` | Strict object: required nonempty `name` ≤200; optional `description` ≤4000 and `role` ≤2000 |
| `instructions` | String ≤32,768 characters |
| `context` | Strict object with optional `text` ≤32,768; optional `files`; `documents` defaults to `[]` |
| `context.files` | At most 8 strict `{path, sha256}` objects; relative path ≤500 characters, lowercase 64-character SHA-256 |
| `context.documents` | At most 8 strict `{name, text}` objects; nonempty name ≤200, text ≤16,384 |

Behavior text cannot contain NUL. File paths cannot be absolute, contain backslashes or empty/`.`/`..` segments. Behavior JSON and compiled initialization have additional 65,536-byte checks. Identity is behavioral guidance, not an authenticated principal. File references describe initial uploaded content; their existence, exact hash and valid text are checked when submitting a Run. Preflight does not certify that files have already been uploaded.

Environment names follow `^[A-Za-z_][A-Za-z0-9_]{0,127}$`. Reserved names include the `HEXAGON_`, `OPENCODE_`, `PI_` prefixes and `PORT`, `NODE_OPTIONS`, `PYTHONPATH`, `PYTHONHOME`, `LD_PRELOAD`, `LD_LIBRARY_PATH`. Values are strings ≤16,384 characters without NUL; there may be at most 64 entries and 65,536 UTF-8 bytes of serialized JSON. Ordinary environment values are available to Agent processes; they do not provide the protected Provider/model credential boundary. See [configuration](configuration.md) and [credentials](../concepts/security-boundaries.md).

### Request example

Save this as `session-request.json`, replacing the two example UUIDs with your verified connection IDs. The all-zero suffixes are placeholders, not provisioned resources:

```json
{
  "harness": {"id": "pi", "version": "1.5.2"},
  "sandbox_connection_id": "00000000-0000-4000-8000-000000000001",
  "model_connection_id": "00000000-0000-4000-8000-000000000002",
  "name": "Project review",
  "resources": {"idle_timeout_seconds": 60, "timeout_seconds": 600},
  "instructions": "Explain changes and report actual test results."
}
```

First preflight, then explicitly create using the same saved body:

```sh
curl --fail-with-body --silent --show-error \
  -H "Authorization: Bearer $HEXAGON_API_TOKEN" -H 'Content-Type: application/json' \
  --data-binary @session-request.json "$HEXAGON_API_URL/v1/sessions/preflight"
```

```sh
curl --fail-with-body --silent --show-error \
  -H "Authorization: Bearer $HEXAGON_API_TOKEN" -H 'Content-Type: application/json' \
  --data-binary @session-request.json "$HEXAGON_API_URL/v1/sessions"
```

Creation does not accept the Run submission idempotency guarantee. If its response is lost, inspect the original creation before retrying. Save the returned Session ID, then upload initial files and [submit a Run](runs.md).

### Response shapes

Preflight returns `ready: true`, `combination`, `readiness: {status:"ready", checked_at}`, `lifecycle` and `connections`. Failure uses an error response rather than `{ready:false}`. `combination` is the resolved capability/protocol contract, not measured execution evidence.

`lifecycle` includes `mode` (`serverless`, `provider_managed`, `retained`), `preservation` (`filesystem`, `memory`, `provider_managed`, `none`), `automatic_wake: true` and effective `idle_timeout_seconds` capped at timeout minus ten seconds. `connections` maps `model` and protected API aliases to `implementation`, `raw_secret_in_sandbox:false` and `delegated_token_in_sandbox`. Implementation is `external_proxy_with_native_auth` when native credential auth is declared, otherwise `external_proxy`. This map is not a list of Tool readiness statuses.

Creation returns `id`, nullable `agent_id`/`agent_revision`, `definition`, `env_names`, `state`, nullable `sandbox`, `created_at`, `updated_at`. Environment values are not returned. `definition` contains effective behavior/resources/network, resolved capabilities/combination, optional initialization digest and OCI image, pinned connection config/version, `tool_bindings`, `protected_api_bindings`, `message_policy:"reject_if_busy"`, lifecycle and credential boundary. Treat its evolving nested provider fields as versioned metadata, not a universal Sandbox schema.

## Inspect the Session and initialization

`GET /v1/sessions/{id}` returns **200** with the Session fields above plus `pause_scope`. `state` is `open`, `pausing`, `paused`, `resuming`, `closing` or `closed`; `sandbox` is a nullable provider resource descriptor. A Session's existence or open state is not proof of a live Harness process. Both owner/application tokens may read it. Missing/foreign IDs return `404 session_not_found`.

```sh
curl --fail-with-body --silent --show-error \
  -H "Authorization: Bearer $HEXAGON_API_TOKEN" \
  "$HEXAGON_API_URL/v1/sessions/$HEXAGON_SESSION_ID"
```

`GET /v1/sessions/{id}/initialization` returns **200** with `schema_version:1`, `session_id`, `created_at`, `source:{kind,agent_id,agent_revision}`, `definition`, and `environment:{names,values_redacted:true}`. Kind is `direct` or `agent`. It reads the historical effective snapshot, not the latest Agent definition or current connection version.

```sh
curl --fail-with-body --silent --show-error \
  -H "Authorization: Bearer $HEXAGON_API_TOKEN" \
  "$HEXAGON_API_URL/v1/sessions/$HEXAGON_SESSION_ID/initialization"
```

## Upload and list initial files

`POST /v1/sessions/{id}/files` allows owner/application tokens and returns **200** with `{files:[{path,sha256,size}]}` for the files in that request. Body: strict `{files:[{path,content_base64}]}`. There must be 1–100 entries with unique relative paths, each ≤500 characters and subject to the path restrictions above. Base64 strings use the schema's padded Base64 alphabet and contain at most 2,097,152 characters each. Total decoded bytes per request cannot exceed 8 MiB. See [limits](limits.md) for encoded versus decoded bounds.

A file with the same path replaces the stored initial input while uploads remain permitted. Other paths remain intact. Uploads require an open Session with no submitted Run and no allocated Sandbox; they cannot edit a live workspace. Even an already cancelled first Run closes this initial-upload window. With initialization enabled, `SOUL.md` is reserved.

Save this body as `files-request.json` (the example content is `hello`):

```json
{"files":[{"path":"notes.txt","content_base64":"aGVsbG8="}]}
```

```sh
curl --fail-with-body --silent --show-error \
  -H "Authorization: Bearer $HEXAGON_API_TOKEN" -H 'Content-Type: application/json' \
  --data-binary @files-request.json \
  "$HEXAGON_API_URL/v1/sessions/$HEXAGON_SESSION_ID/files"
```

`GET` on the same path returns **200**, `{files:[{path,sha256,size}]}` for stored inputs ordered by path. It lists metadata, not bytes or the current Agent-edited filesystem. Inspect these hashes when reconciling a lost upload response.

```sh
curl --fail-with-body --silent --show-error \
  -H "Authorization: Bearer $HEXAGON_API_TOKEN" \
  "$HEXAGON_API_URL/v1/sessions/$HEXAGON_SESSION_ID/files"
```

Upload-specific errors: `400 duplicate_input_path`, `400 reserved_initialization_path`, `413 upload_too_large`, `409 workspace_already_started`, `409 session_closed`; malformed bodies use `400 invalid_request`. Missing/foreign Session is 404. Structural validation can fail before a resource lookup.

## Pause, resume and close

These routes exist when the lifecycle service is configured. Pause/resume require an owner token; close allows an application token too. All are POST operations, scoped to the tenant.

| Path suffix after `/v1/sessions/{id}` | Body | Success response |
| --- | --- | --- |
| `/pause` | Optional strict `{scope:"session"}` or `{scope:"sandbox"}`; default session | 200, state/scope and, on a completed transition, compute/standby flags |
| `/resume` | No required body | 200, state/scope and possible compute/standby flags |
| `/close` | No required body | 200, `{state:"closed"}` after confirmed cleanup |

```sh
curl --fail-with-body --silent --show-error --request POST \
  -H "Authorization: Bearer $HEXAGON_API_TOKEN" -H 'Content-Type: application/json' \
  --data '{"scope":"sandbox"}' \
  "$HEXAGON_API_URL/v1/sessions/$HEXAGON_SESSION_ID/pause"
```

```sh
curl --fail-with-body --silent --show-error --request POST \
  -H "Authorization: Bearer $HEXAGON_API_TOKEN" \
  "$HEXAGON_API_URL/v1/sessions/$HEXAGON_SESSION_ID/resume"
```

Logical scope `session` does not establish stopped compute. Native scope `sandbox` depends on Provider capabilities; provider-managed standby is reported separately. A completed transition can include `compute_paused` and `provider_managed_standby`, but a repeat at the target state may return only state/scope. Do not interpret absent fields as a full fresh inspection. Pausing requires no nonterminal Run; incompatible transition/scope requests return `session_transition_pending` or `session_pause_scope_conflict`. Unsupported native pause returns `sandbox_pause_unsupported`, all 409. Closing/closed Sessions reject pause/resume. Run submission can wake a paused Session; explicit resume is not required for every new task.

```sh
curl --fail-with-body --silent --show-error --request POST \
  -H "Authorization: Bearer $HEXAGON_API_TOKEN" \
  "$HEXAGON_API_URL/v1/sessions/$HEXAGON_SESSION_ID/close"
```

Explicit close rejects a nonterminal Run with `409 session_busy`: cancel/observe it first. Close persists intent and reconciles owned resources before confirming closure. `sandbox_creation_unconfirmed`, `sandbox_checkpoint_unconfirmed` or `sandbox_deletion_unconfirmed` require inspection of resource operations; a timeout/error is not evidence of absence. Repeating close on the same Session reconciles its resources; an already closed Session returns `{state:"closed"}`. Exported artifacts and historical Runs remain accessible; preview access is invalidated. See [resource reconciliation](../operate/reconciliation.md).

## Creation failures and related operations

Malformed strict schemas return `400 invalid_request`. Common domain failures include `404 agent_not_found`, `404 agent_revision_not_found`, `409 agent_archived`, `404 connection_not_found`, `400 connection_kind_mismatch`, `409 connection_not_ready`, `409 tool_not_ready`, `400 missing_tool_binding`, `400 undeclared_tool_binding`, `400 ambiguous_variables` and `413 initialization_too_large`. Harness/model/network/capability incompatibility returns the corresponding compatibility reason with 400; credential readiness can fail before definition validation. Consult [errors](errors.md) rather than assuming every failure is a cloud quota problem.

This page does not substitute for the remaining operation references: tenant-wide Session lists/activity, sensitive environment retrieval, current authorization, per-Session connection revocation and access/preview grants. Their route permissions remain in the [HTTP inventory](http.md); their behavior is described in [connection lifecycle](../build/connection-lifecycle.md), [private previews](../build/private-preview.md) and [initialization](../concepts/initialization.md).

Sources: [Session schemas and operations](../../../../modules/execution/sessions.ts), [initialization](../../../../modules/execution/initialization.ts), [environment](../../../../modules/execution/environment.ts), [file inputs](../../../../modules/execution/inputs.ts), [lifecycle](../../../../modules/sandboxes/lifecycle.ts), [HTTP routes](../../../../apps/control-plane/server.ts). These are source-reviewed examples; no HTTP or cloud execution is claimed by this reference.
