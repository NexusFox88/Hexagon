# Python SDK reference

The current package is `hexagon-agent-sdk` version `0.1.0`, imported as `hexagon`, requiring Python 3.10+. Install from this checkout until a verified public distribution is available:

```sh
python3 -m venv .venv
. .venv/bin/activate
python3 -m pip install ./sdk/python
```

The client uses synchronous standard-library HTTP calls. It is not an async client; calls and stream iteration block the calling thread. Package version alone does not identify every development snapshot. Record your installed artifact alongside the server revision. See [package metadata](../../../../sdk/python/pyproject.toml).

## Client and identity

```python
import os
from hexagon import Hexagon, HexagonError

# Local control plane already started; discovers a private workspace identity.
client = Hexagon.local()

# Alternative for a remote control plane; use only in a trusted backend.
# client = Hexagon(os.environ['HEXAGON_API_URL'],
#                  os.environ['HEXAGON_API_TOKEN'], timeout=90)
```

`base_url` is the control-plane origin without `/v1`; the client appends `/v1`. The constructor does not validate credentials by making a request. `timeout` defaults to 90 seconds and applies to HTTP operations, including reads; it is not a Run execution deadline.

`local(data_directory=None, base_url=None, timeout=90)` reads local discovery and owner files. Explicit data directory selects that workspace; otherwise discovery checks the workspace and configured/user descriptor. The optional base URL checks endpoint consistency rather than turning local mode into remote authentication. Private-file/loopback checks can fail before HTTP. See [local.py](../../../../sdk/python/hexagon/local.py). Local calls disable redirects; explicit clients use urllib's default redirect behavior, so configure the actual trusted origin without relying on redirects.

No client-wide `close()` or async context manager exists. `client.close(session_id)` closes a Session and initiates its resource lifecycle; it is not HTTP-client disposal. Ordinary responses use context managers internally. Explicitly close a partially consumed generator if you retain it; stopping observation does not cancel a Run.

## Public method inventory

The following signatures and request expressions are generated from the Python AST, including keyword-only parameters and defaults. Paths are SDK expressions: `{...}` denotes values inserted/encoded by the implementation. Except binary downloads, event generators, constructors and HTTP 204, methods return the JSON-decoded HTTP value (normally a dict), without typed model-object conversion. Collection envelopes remain intact, for example `events()['events']` and `artifacts()['artifacts']`; there is no automatic pagination.

<!-- python-methods:begin -->

| Signature (self/cls omitted) | HTTP mapping / return mode |
| --- | --- |
| `local(*, data_directory=None, base_url=None, timeout=90)` | Local discovery → Hexagon instance / 本地发现 |
| `__init__(base_url, token, timeout=90)` | Hexagon instance; no HTTP request / 无请求 |
| `request(method, path, body=None, headers=None)` | JSON-decoded value; 204 → None |
| `create_preview(session_id, port, ttl_seconds=600)` | `POST` `f"/sessions/{quote(session_id, safe='')}/previews"` |
| `revoke_preview(preview_id)` | `DELETE` `f"/previews/{quote(preview_id, safe='')}"` |
| `register_harness(*, image, **configuration)` | `POST` `'/harnesses'` |
| `register_harness_package(**package)` | `POST` `'/harness-packages'` |
| `catalog()` | `GET` `'/catalog'` |
| `applications()` | `GET` `'/applications'` |
| `configure_application_oauth(provider, **configuration)` | `PUT` `f"/applications/{quote(provider, safe='')}/oauth-client"` |
| `authorize_connection(connection_id)` | `POST` `f"/connections/{quote(connection_id, safe='')}/authorize"` |
| `authorization_flow(flow_id)` | `GET` `f"/authorization-flows/{quote(flow_id, safe='')}"` |
| `cancel_authorization(flow_id)` | `DELETE` `f"/authorization-flows/{quote(flow_id, safe='')}"` |
| `create_secret(*, name, value)` | `POST` `'/secrets'` |
| `session_environment(session_id)` | `GET` `f"/sessions/{quote(session_id, safe='')}/environment"` |
| `session_authorization(session_id)` | `GET` `f"/sessions/{quote(session_id, safe='')}/authorization"` |
| `revoke_session_connection(session_id, connection_id)` | `DELETE` `f"/sessions/{quote(session_id, safe='')}/connections/{quote(connection_id, safe='')}"` |
| `list_secrets()` | `GET` `'/secrets'` |
| `secret(secret_id)` | `GET` `f"/secrets/{quote(secret_id, safe='')}"` |
| `update_secret(secret_id, **changes)` | `PATCH` `f"/secrets/{quote(secret_id, safe='')}"` |
| `delete_secret(secret_id)` | `DELETE` `f"/secrets/{quote(secret_id, safe='')}"` |
| `create_access(session, connection_id)` | `POST` `f"/sessions/{quote(session, safe='')}/access"` |
| `list_access(session)` | `GET` `f"/sessions/{quote(session, safe='')}/access"` |
| `revoke_access(grant_id)` | `DELETE` `f"/access/{quote(grant_id, safe='')}"` |
| `overview()` | `GET` `'/overview'` |
| `list_sessions(**query)` | `GET` `'/sessions?' + urlencode(query)` |
| `list_runs(**query)` | `GET` `'/runs?' + urlencode(query)` |
| `pending(limit=25, offset=0)` | `GET` `f'/pending?limit={limit}&offset={offset}'` |
| `approvals(run_id)` | `GET` `f"/runs/{quote(run_id, safe='')}/approvals"` |
| `connection_dependencies(connection_id)` | `GET` `f"/connections/{quote(connection_id, safe='')}/dependencies"` |
| `list_tokens()` | `GET` `'/tokens'` |
| `create_token(label, expires_in_days=30)` | `POST` `'/tokens'` |
| `rotate_token(token_id)` | `POST` `f"/tokens/{quote(token_id, safe='')}/rotate"` |
| `revoke_token(token_id)` | `DELETE` `f"/tokens/{quote(token_id, safe='')}"` |
| `deployment()` | `GET` `'/deployment'` |
| `update_deployment(config, expected_revision)` | `PUT` `'/deployment'` |
| `retry_ingress()` | `POST` `'/deployment/ingress/retry'` |
| `resource_operations(limit=50, offset=0)` | `GET` `f'/resource-operations?limit={limit}&offset={offset}'` |
| `resource_operation(operation_id)` | `GET` `f"/resource-operations/{quote(operation_id, safe='')}"` |
| `review_resource_operation(operation_id, action, note='')` | `POST` `f"/resource-operations/{quote(operation_id, safe='')}/review"` |
| `list_agents()` | `GET` `'/agents'` |
| `agent(agent_id)` | `GET` `f"/agents/{quote(agent_id, safe='')}"` |
| `revise_agent(agent_id, definition, expected_revision)` | `PUT` `f"/agents/{quote(agent_id, safe='')}"` |
| `archive_agent(agent_id)` | `POST` `f"/agents/{quote(agent_id, safe='')}/archive"` |
| `copy_agent(agent_id, name)` | `POST` `f"/agents/{quote(agent_id, safe='')}/copy"` |
| `preflight_agent(definition, bindings)` | `POST` `'/agents/preflight'` |
| `preflight_session(**definition)` | `POST` `'/sessions/preflight'` |
| `list_connections()` | `GET` `'/connections'` |
| `connection(connection_id)` | `GET` `f"/connections/{quote(connection_id, safe='')}"` |
| `create_connection(**definition)` | `POST` `'/connections'` |
| `discover_mcp_tools(connection_id)` | `POST` `f"/connections/{quote(connection_id, safe='')}/discover-mcp"` |
| `connection_authorization(connection_id)` | `GET` `f"/connections/{quote(connection_id, safe='')}/authorization"` |
| `disconnect_connection(connection_id)` | `POST` `f"/connections/{quote(connection_id, safe='')}/disconnect"` |
| `validate_connection(connection_id)` | `POST` `f"/connections/{quote(connection_id, safe='')}/validate"` |
| `update_connection(connection_id, **changes)` | `PATCH` `f"/connections/{quote(connection_id, safe='')}"` |
| `delete_connection(connection_id)` | `DELETE` `f"/connections/{quote(connection_id, safe='')}"` |
| `create_agent(*, env=None, **definition)` | `POST` `'/agents'` |
| `create_session(*, env=None, **definition)` | `POST` `'/sessions'` |
| `session_initialization(session_id)` | `GET` `f"/sessions/{quote(session_id, safe='')}/initialization"` |
| `session(session_id)` | `GET` `f"/sessions/{quote(session_id, safe='')}"` |
| `upload(session_id, files)` | `POST` `f"/sessions/{quote(session_id, safe='')}/files"` |
| `submit(session_id, text, idempotency_key, *, origin=None)` | `POST` `f"/sessions/{quote(session_id, safe='')}/runs"` |
| `run(run_id)` | `GET` `f"/runs/{quote(run_id, safe='')}"` |
| `tool_calls(run_id)` | `GET` `f"/runs/{quote(run_id, safe='')}/tool-calls"` |
| `deny_tool_authorization(run_id, call_id, request_hash)` | `POST` `f"/runs/{quote(run_id, safe='')}/tool-calls/{quote(call_id, safe='')}/deny-authorization"` |
| `resolve_tool_call(run_id, call_id, **resolution)` | `POST` `f"/runs/{quote(run_id, safe='')}/tool-calls/{quote(call_id, safe='')}/resolve"` |
| `cancel(run_id)` | `POST` `f"/runs/{quote(run_id, safe='')}/cancel"` |
| `pause(session_id, scope='session')` | `POST` `f"/sessions/{quote(session_id, safe='')}/pause"` |
| `resume(session_id)` | `POST` `f"/sessions/{quote(session_id, safe='')}/resume"` |
| `session_activity(period='24h')` | `GET` `f'/sessions/activity?period={period}'` |
| `close(session_id)` | `POST` `f"/sessions/{quote(session_id, safe='')}/close"` |
| `decide(approval_id, approved)` | `POST` `f"/approvals/{quote(approval_id, safe='')}/decision"` |
| `events(run_id, after='0')` | `GET` `f"/runs/{quote(run_id, safe='')}/events?after={quote(str(after), safe='')}"` |
| `artifacts(run_id)` | `GET` `f"/runs/{quote(run_id, safe='')}/artifacts"` |
| `download_artifact(artifact_id)` | `GET` `f"/artifacts/{quote(artifact_id, safe='')}/content"`; bytes |
| `stream(run_id, after='0')` | `GET` `f"/runs/{quote(run_id, safe='')}/stream?after={quote(str(after), safe='')}"`; generator[dict] |

<!-- python-methods:end -->

Regenerate with `python3 tooling/generate-python-doc-index.py`. This extracts signatures and request mapping, not server schemas or authorization. `**definition`, `**changes`, `**package`, `**resolution` and `**configuration` forward JSON fields validated by the server. See [configuration](configuration.md), [limits](limits.md), and linked workflow guides below. A method's existence does not grant the caller management permission.

## Workflows and return handling

| Methods | Inputs / result use | Behavior guide |
| --- | --- | --- |
| catalog, applications, preflight_* | Inspect returned capabilities, readiness and scoped verification; preflight returns SessionPreflight-shaped JSON | [Choose integrations](../integrations/choose.md) |
| create/validate/update/delete_connection, connection_dependencies | Provider-specific config plus credential/Secret reference; read validation/dependencies before enable/delete | [Connection lifecycle](../build/connection-lifecycle.md) |
| register_harness / register_harness_package | OCI `image` versus source `files`; retain returned id/version/digest | [OCI](../integrations/harnesses/oci.md), [source package](../integrations/harnesses/source-package.md) |
| create/revise/copy/archive_agent | Immutable revisions; expected_revision protects edits | [Agent templates](../build/agent-templates.md) |
| create_session, session, session_initialization | Direct harness or saved Agent, connection IDs; persist returned id, inspect pinned snapshot | [First Session](../start/first-session.md) |
| upload | Mapping of relative path to bytes; client Base64-encodes each value | [Project context](../build/project-context.md) |
| submit, run, cancel | Persist exact input/origin/key and returned Run id; query terminal state | [Backend integration](../build/backend-integration.md) |
| stream, events | Cursor string; generator versus JSON events envelope | [Event streams](../build/stream-events.md) |
| approvals, decide, tool_calls, deny_tool_authorization, resolve_tool_call | Approval boolean differs from account authorization; use original call/hash for reconciliation | [Approvals](../build/approvals.md), [recovery](../build/recovery.md) |
| create_preview, revoke_preview, artifacts, download_artifact | Preview grant is sensitive; download returns bytes | [Previews](../build/private-preview.md), [artifacts](../build/artifacts.md) |
| pause, resume, close, session_activity | Lifecycle requests are not proof of provider cleanup; period accepts only 24h/7d | [Idle and wake](../build/idle-and-wake.md) |
| Secret, access, OAuth and Token methods | Sensitive management operations; preserve tenant boundaries and do not log returned credentials/grants | [Access control](../operate/access-control.md), [credentials](../operate/credentials.md) |
| deployment, update_deployment, retry_ingress, resource_operation* | Revision checks and persisted resource investigation; review does not prove absence | [CLI/configuration](configuration.md), [reconciliation](../operate/reconciliation.md) |

## Minimal contextual call sequence

This excerpt requires an initialized client, ready connection IDs, an application-saved key and persistence callbacks. It is not a complete cleanup-safe executable; use the [full program](../../../../examples/documentation/first-session.py) for that workflow.

```python
session = client.create_session(
    harness={'id': 'pi', 'version': '1.5.2'},
    sandbox_connection_id=sandbox_id, model_connection_id=model_id,
)
save_session_id(session['id'])
client.upload(session['id'], {'README.txt': b'Project context\n'})
run = client.submit(session['id'], saved_input, saved_key,
                    origin={'request_id': business_request_id})
save_run_id(run['id'])
for event in client.stream(run['id'], saved_cursor or '0'):
    if event.get('id'):
        store_event_and_cursor_atomically(run['id'], event)
result = client.run(run['id'])
```

Save the creation intent before creating; Session creation does not inherit Run idempotency. Reopen interrupted streams using the committed cursor. Query final status after streaming. Authorization/approval waits need the corresponding user flow; do not blindly approve everything in an event handler. Keep failure journals until resources are reconciled.

## Types, errors and coverage limits

`SessionPreflight` is imported by `hexagon`; supporting TypedDict definitions live in [contracts.py](../../../../sdk/python/hexagon/contracts.py). They describe JSON shape and do not validate runtime data or convert dicts into objects. Most methods have no annotated response type; do not infer a richer typed API.

HTTP errors become `HexagonError(status, code)` with `http_error` fallback. Network errors, timeouts, JSON decoding and local discovery failures may be different exceptions. `stream` raises ConnectionError on truncated/unexpected EOF and returns normally on `stream.end`; there is no infinite reconnect loop. `session_activity` rejects invalid periods locally with ValueError. See [errors](errors.md) before retrying.

`request(method, path, body=None, headers=None)` is the JSON escape hatch for implemented routes without convenience methods, such as listing one Session's Runs. It prepends `/v1`; it does not invent routes or bypass permissions. Browser preview transport, credential proxy traffic and OAuth browser redirects are not generic JSON SDK operations. The SDK has no full HTTP-schema model layer or built-in durable application journal.

The method inventory is source-generated. Per-method executable examples and exhaustive response-schema review remain part of this draft's acceptance; the table alone does not fulfill them. Existing installed-package and cloud evidence keeps its original scope/date. This documentation pass does not claim a new complete SDK journey.

## Response contracts by resource

The generated signatures show how to invoke the client. Use the corresponding HTTP contract for exact response projections, status codes, required role, state preconditions and effects. Most management methods return the decoded JSON directly; a successful promise/call can still carry invalid connection validation or reconciliation_error. Do not infer success from the absence of an SDK exception.

| Resource | Contract |
| --- | --- |
| Runs, events and cancellation | [Runs, events and cancellation](runs.md) |
| Session creation, files and lifecycle | [Session creation, files and lifecycle](sessions.md) |
| Session environment, authorization and grants | [Session environment, authorization and grants](session-access.md) |
| Artifact bytes and private previews | [Artifact bytes and private previews](artifacts-previews.md) |
| Approvals and Tool recovery | [Approvals and Tool recovery](approvals-tools.md) |
| Connections, validation and usage | [Connections, validation and usage](connections.md) |
| Applications and OAuth | [Applications and OAuth](oauth.md) |
| Managed Secrets | [Managed Secrets](secrets.md) |
| Application tokens | [Application tokens](tokens.md) |
| Agent templates and revisions | [Agent templates and revisions](agents.md) |
| Catalog and Harness registration | [Catalog and Harness registration](harness-registration.md) |
| Resource operation reconciliation | [Resource operation reconciliation](resource-operations.md) |
| Monitoring and collection queries | [Monitoring and collection queries](monitoring.md) |
| Local deployment configuration | [Local deployment configuration](deployment.md) |

Binary artifact download and streaming are special return paths described above. HTTP DELETE is not uniformly empty: Token revoke returns JSON, while preview/access/Secret/connection deletion uses 204. OAuth flow cancellation returns a flow object. Preserve these differences when building a generic application wrapper.

## Inspect an existing Run without submitting work

Run the [complete diagnostic example](../../../../examples/documentation/inspect-run.py) from the repository root with the local SDK installed:

```sh
python3 examples/documentation/inspect-run.py --session YOUR_SESSION_ID --run YOUR_RUN_ID --after 0 --max-pages 20
```

It checks the Run/Session association, queries Session state, reads up to the requested number of event pages, re-queries the Run and lists artifact IDs/sizes/digests. It excludes task text, event payloads, output text and artifact names from its report; IDs still belong in private evidence. It never submits, approves, cancels or closes work.

Event IDs stay decimal strings, with arbitrary-precision comparisons. `last_observed_cursor` is a diagnostic observation, not a persisted application-consumer checkpoint: the program counts events rather than storing their payloads. An empty page only means the query was drained at that moment. The later Run query and artifact listing are separate reads, so this is not an atomic snapshot. If the page bound is reached, continue with the reported cursor for diagnostics; do not discard unprocessed application events based on that cursor.

Local syntax and deterministic fake-client checks are separate from real API acceptance. Use [Run contracts](runs.md) and [recovery](../build/recovery.md) to interpret the result.

[Example setup, stages and recovery](../../../../examples/documentation/README.md).
