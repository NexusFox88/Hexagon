# Session environment, authorization and access grants

Use these operations to inspect effective environment values, compare pinned and current connection authorization, revoke a binding within one Session, or issue a scoped proxy credential. They do not edit a Session's pinned configuration or replace Provider credentials.

Paths include `/v1`. All operations enforce tenant ownership. The first three require owner identity; access-grant list/create/revoke also allow application tokens. Examples use a trusted backend token and `HEXAGON_API_URL` without `/v1`. Treat environment responses and issued tokens as private data.

## Read the effective environment

`GET /v1/sessions/{id}/environment` returns **200**, `{env:{...},scope:"agent_process",mutable:false}` and `Cache-Control:no-store`. It decrypts saved ordinary environment values; an empty environment returns `{}`. This is not the redacted initialization endpoint and is not a list of protected Provider/model secrets. There is no update operation here.

```sh
umask 077
curl --fail-with-body --silent --show-error \
  -H "Authorization: Bearer $HEXAGON_API_TOKEN" --output session-environment.json \
  "$HEXAGON_API_URL/v1/sessions/$HEXAGON_SESSION_ID/environment"
```

Run in a private directory and check curl's exit status before reading the response; failed responses can also be saved. Prefer `/initialization` if you only need environment names and a historical configuration snapshot.

## Inspect current authorization

`GET /v1/sessions/{id}/authorization` returns **200**, `{session_id,connections:[...]}`. It evaluates currently stored connection/Secret/revocation state; it does not call providers or verify live credential validity.

```sh
curl --fail-with-body --silent --show-error \
  -H "Authorization: Bearer $HEXAGON_API_TOKEN" \
  "$HEXAGON_API_URL/v1/sessions/$HEXAGON_SESSION_ID/authorization"
```

Each connection contains `id`, `name`, `kind`, `pinned_version`, `current_version`, nullable `secret:{id,name}`, `raw_secret_in_sandbox:false`, nullable `revoked_at` and `state`. Secret metadata does not include its value. State precedence is:

1. Session-specific revocation → revoked.
2. Deleted connection → deleted.
3. Disabled/not-ready connection, or disabled/deleted managed Secret → unavailable.
4. Non-Tool connection whose version differs from the pinned version → changed.
5. Otherwise → ready.

Tool version differences do not use the same changed classification. Ready is a local authorization observation, not a successful external call. Missing/foreign Session returns `404 session_not_found` for environment and authorization reads.

## Revoke a connection for this Session

`DELETE /v1/sessions/{id}/connections/{connection}` requires an owner and returns **200**, the updated authorization object, not 204. Only Tool or HTTP connections present in the pinned definition are eligible; another binding/kind returns `403 connection_not_bound`.

```sh
curl --fail-with-body --silent --show-error --request DELETE \
  -H "Authorization: Bearer $HEXAGON_API_TOKEN" \
  "$HEXAGON_API_URL/v1/sessions/$HEXAGON_SESSION_ID/connections/$HEXAGON_CONNECTION_ID"
```

It inserts a durable Session-specific revocation and marks that Session/connection's access grants revoked. Repetition does not duplicate the revocation row. This is not deletion of the shared connection, Provider-side account revocation or a change to another Session. No reversal endpoint is defined here. The statements are not wrapped in one transaction; if a response fails, read authorization and grants, then repeat the same revocation if needed. A recorded revocation itself is checked during future proxy authorization. Already dispatched external operations cannot be recalled.

## List access-grant metadata

`GET /v1/sessions/{id}/access` returns **200**, `{grants:[...]}` ordered by creation time, without pagination. Each grant contains `id`, `session_id`, `connection_id`, nullable `run_id`, `expires_at`, `revoked_at`, `created_at`. Expired/revoked grants remain visible. No token or base_url is returned by this list. Missing/foreign Session returns 404.

```sh
curl --fail-with-body --silent --show-error \
  -H "Authorization: Bearer $HEXAGON_API_TOKEN" \
  "$HEXAGON_API_URL/v1/sessions/$HEXAGON_SESSION_ID/access"
```

## Issue scoped proxy access

`POST /v1/sessions/{id}/access` accepts strict `{connection_id:UUID}` and returns **201**, `{id,base_url,token,expires_at,implementation:"external_proxy"}` with `Cache-Control:no-store`. The generated base_url is the configured credential ingress origin plus `/access/{grant-id}`. Token is a delegated credential, not the raw Provider secret.

Save a body with your actual connection UUID as `access-request.json`:

```json
{"connection_id":"00000000-0000-4000-8000-000000000001"}
```

```sh
umask 077
curl --fail-with-body --silent --show-error \
  -H "Authorization: Bearer $HEXAGON_API_TOKEN" -H 'Content-Type: application/json' \
  --data-binary @access-request.json --output session-access-grant.json \
  "$HEXAGON_API_URL/v1/sessions/$HEXAGON_SESSION_ID/access"
```

Replace the placeholder UUID. Store the response privately, check command success and never send an owner token to the proxy. Credential ingress must be configured as a valid HTTPS origin. The Session must be open; non-open Sessions are reported as `404 session_not_found` by this operation. Eligible connections are the Session's model connection or bound protected HTTP connections, not Tool bindings. A connection must be enabled, ready, undeleted and match its pinned version. Session revocation denies issuance.

Grant lifetime is `min(3600, Session timeout_seconds)` seconds from issuance, with 600 seconds as fallback; this endpoint has no user TTL or Run ID parameter. Public issuance leaves run_id null. Internal worker issuance can attach a Run, which adds an active-Run check during use. Each use rechecks expiry/revocation, open Session, connection version/readiness, managed Secret availability and applicable Run state. Thus issuance does not guarantee a later request will be authorized.

There is no idempotency key. Repeating creates another grant; its plaintext cannot be recovered through the list. If the response is lost, inspect/revoke identified unused grants before intentionally issuing another. Revoking one grant differs from revoking the Session's entire connection binding.

| Issuance error | Status / interpretation |
| --- | --- |
| credential_proxy_not_configured / credential_proxy_url_invalid | 409; fix ingress configuration |
| session_not_found | 404; missing/foreign or not open |
| connection_not_bound | 403; not the model or bound HTTP connection |
| access_denied | 403; Session connection revoked |
| connection_not_ready | 409; connection absent/unavailable/wrong kind |
| session_connection_changed | 409; current version differs from pinned |
| session_access_expired | 409; computed grant deadline invalid |

Malformed strict bodies return `400 invalid_request`. The subsequent proxy transport has separate policy and authentication handling; see [protected HTTP APIs](../integrations/http-tools.md).

## Revoke one grant

`DELETE /v1/access/{id}` returns **204** with no body. Repeated revocation of an existing grant succeeds and updates its revoked timestamp; unknown/foreign grant returns `404 access_not_found`.

```sh
curl --fail-with-body --silent --show-error --request DELETE \
  -H "Authorization: Bearer $HEXAGON_API_TOKEN" \
  "$HEXAGON_API_URL/v1/access/$HEXAGON_GRANT_ID"
```

This does not close the Session, revoke its account credentials or undo previously dispatched requests. These access grants are distinct from [browser preview grants](artifacts-previews.md).

Sources: [Session configuration](../../../../modules/execution/session-configuration.ts), [access issuance and authorization](../../../../modules/access/access.ts), [HTTP routes](../../../../apps/control-plane/server.ts). This page is source-reviewed; no environment values were retrieved and no grants were issued/revoked in this documentation pass.
