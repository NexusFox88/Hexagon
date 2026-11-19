# Artifacts and private previews HTTP contract

Artifacts are exported bytes retained by the control plane; private previews grant temporary access to a live HTTP port in a Session. Use artifacts for results that must survive Session closure. Use previews to inspect the running application. Neither API publishes a production website.

All four management operations below allow owner and application tokens, subject to tenant ownership. Set `HEXAGON_API_URL` to the control-plane origin without `/v1`, and provide the indicated resource IDs and trusted backend token. Preview routes are registered only when the preview service is configured.

## List exported artifacts

`GET /v1/runs/{run_id}/artifacts` returns **200** with `{ "artifacts": [...] }`. The path ID must be a UUID. Results are ordered by name; this endpoint has no pagination parameters. Each item contains:

| Field | Shape / meaning |
| --- | --- |
| `id` | Artifact UUID, used for content download |
| `session_id`, `run_id` | Owning Session and producing Run |
| `name` | Exported relative name; not a trusted local destination |
| `sha256` | Lowercase SHA-256 of exported bytes |
| `size` | Integer byte count |
| `created_at` | Server timestamp |

```sh
curl --fail-with-body --silent --show-error \
  -H "Authorization: Bearer $HEXAGON_API_TOKEN" \
  "$HEXAGON_API_URL/v1/runs/$HEXAGON_RUN_ID/artifacts"
```

An existing Run with no exports returns an empty array, not 404. Missing/foreign Run returns `404 run_not_found`. Listing is not restricted to successful Runs: inspect Run state separately, and do not treat an empty array during execution as the final result. There is no public artifact-upload operation in this route family; the worker captures the Harness manifest.

## Download one artifact

`GET /v1/artifacts/{artifact_id}/content` returns **200** and raw bytes, not JSON or Base64. The path ID must be a UUID. A missing/foreign artifact, or a historical row without retained content, returns `404 artifact_not_found`.

| Header | Value / behavior |
| --- | --- |
| `Content-Type` | `application/octet-stream` |
| `Content-Disposition` | Attachment; fallback filename `artifact`, UTF-8 filename derived from the final component of the export name |
| `X-Content-SHA256` | Exported content digest |
| `Cache-Control` | `private, no-store` |
| `X-Content-Type-Options` | `nosniff` |

```sh
curl --fail-with-body --silent --show-error \
  -H "Authorization: Bearer $HEXAGON_API_TOKEN" \
  --dump-header artifact-headers.txt --output artifact-download.bin \
  "$HEXAGON_API_URL/v1/artifacts/$HEXAGON_ARTIFACT_ID/content"
```

Use a new private download directory and your own destination filename. On a failed HTTP response, `--fail-with-body` can still write the error body into that destination: require curl exit status 0 before using it. Compare file byte count and SHA-256 against the list metadata and response header. Do not execute downloaded model-generated code merely to inspect it. Neither the route nor its schema advertises a Range/conditional-download contract; do not assume resumable partial downloads.

Capture limits are 64 files per manifest, 4 MiB decoded bytes per file and 8 MiB total. Names are relative, at most 512 characters, and reject path traversal, backslashes and control characters. Canonical Base64 and digest integrity are checked during capture. Repeated capture of the same Run/name with identical content is tolerated; a different hash yields `artifact_conflict`. These are worker-capture constraints, not fields to POST to the public download route. See [limits](limits.md).

Closure preserves exported bytes and Run records independently of the Sandbox. A file that exists only in the workspace is not automatically an artifact. Verify downloads after closure for your journey; retention is not a substitute for your deployment's backup policy.

## Create a private preview grant

`POST /v1/sessions/{session_id}/previews` accepts a strict JSON object and returns **201**. The Session ID must be a UUID.

| Field | Requirement |
| --- | --- |
| `port` | Required integer 3000–8999, excluding Runtime port 8765 |
| `ttl_seconds` | Optional integer 30–3600; default 600 |

```sh
curl --fail-with-body --silent --show-error \
  -H "Authorization: Bearer $HEXAGON_API_TOKEN" -H 'Content-Type: application/json' \
  --data '{"port":3000,"ttl_seconds":600}' \
  "$HEXAGON_API_URL/v1/sessions/$HEXAGON_SESSION_ID/previews"
```

The response contains `id` (grant UUID), `session_id`, integer `port`, ISO timestamp `expires_at` and `url`. The URL contains a secret ticket. Store it privately and deliver it only to an authorized user; do not paste it into shared logs. The default local shape is `http://<grant-id>.localhost:8788/?ticket=<ticket>`; hosted deployments use their configured scheme/domain/port.

Creation requires an open Session, a recorded Sandbox ID and no detected control-plane expiry. Missing/foreign Session returns `404 session_not_found`; otherwise an unavailable Session returns `409 preview_session_unavailable`. Invalid port/TTL or unknown body fields return `400 invalid_request`.

Grant creation does not start a server, wake a sleeping Session, probe HTTP health or establish that the Provider can deliver preview traffic. Start the server within the cloud workspace and verify its port first. Provisioning and private transport can still fail when opening the URL. There is no idempotency key or public preview-list/read endpoint in this management family. If the creation response is lost, do not assume that no grant exists; avoid retry loops, inspect available private records and allow the requested grant lifetime to expire if its ID cannot be recovered.

## Browser access is a separate HTTP surface

Open `url` in the authorized browser; do not send a management owner token to the preview origin. The initial GET ticket is checked and exchanged for a host-only `hexagon_preview` HttpOnly, SameSite=Lax cookie; HTTPS adds Secure. The response redirects to the same path/query with the ticket removed. Cookie lifetime is bounded by grant expiry. Ticket-bearing non-GET requests are rejected.

Subsequent requests validate grant ID, token digest, expiry/revocation and Session availability. Closing or pausing the Session can invalidate current access. A same-origin check rejects a supplied foreign Origin header. The proxy uses the trusted Provider target; user paths do not choose a new upstream host. Provider credentials and upstream cookies are not forwarded to the browser.

Current transport forwards ordinary HTTP methods/bodies, subject to an 8 MiB request body limit and a 30-second upstream fetch timeout. It forwards only selected request/response headers. Same-upstream redirects are rewritten into preview-relative locations; external redirects are blocked. CSP restricts external resources and framing. WebSocket upgrades and upstream application-cookie flows are not supported. Upstream HTTP error statuses can be relayed, so not every 4xx/5xx is a Hexagon authorization failure.

| Preview-surface failure | Meaning |
| --- | --- |
| 401 `preview_unauthorized` | Ticket/cookie/host invalid, grant revoked/expired, or Session unavailable |
| 403 `preview_origin_rejected` | Supplied Origin differs from this preview origin |
| 502 `preview_external_redirect_blocked` | Upstream redirect leaves the trusted target origin |
| 502 `preview_unavailable` | Non-domain proxy/transport failure; inspect target and Session |

The preview server has its own error handler; do not assume all its errors use the management server's validation envelope/status policy. Observe the actual response code and context.

## Revoke access

`DELETE /v1/previews/{preview_id}` returns **204** with no response body. Do not parse JSON on success.

```sh
curl --fail-with-body --silent --show-error --request DELETE \
  -H "Authorization: Bearer $HEXAGON_API_TOKEN" \
  "$HEXAGON_API_URL/v1/previews/$HEXAGON_PREVIEW_ID"
```

The ID must be a UUID. Unknown/foreign grant returns `404 preview_not_found`. Repeating revocation of an existing grant also succeeds; the row is marked revoked rather than removed. Revocation does not stop the application's server or close the Session. Refresh the browser to verify that new requests are denied; already delivered content cannot be recalled.

Sources: [artifact storage and integrity](../../../../modules/artifacts/artifacts.ts), [grant lifecycle](../../../../modules/sandboxes/previews.ts), [preview proxy](../../../../apps/control-plane/preview-server.ts), [HTTP routes](../../../../apps/control-plane/server.ts). Next: [artifact workflow](../build/artifacts.md), [preview troubleshooting](../build/private-preview.md), [HTTP overview](http.md). This reference is source-reviewed; these requests have not been executed as a fresh cloud/browser acceptance run.
