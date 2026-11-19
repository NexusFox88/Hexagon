# Local deployment settings HTTP contract

These four routes manage the current local control-plane workspace. They are registered only when a deployment settings service exists, require owner authentication and additionally require tenant `local-workspace`. Other tenants receive `403 deployment_management_forbidden`; application tokens are rejected by the owner route policy. This is not an API for provisioning hosted deployments.

## Read settings

`GET /v1/deployment` returns **200** with config, revision, restart_required, optional ingress status, and environment_overrides. Revision is the SHA-256 of the parsed/defaulted configuration JSON. Restart_required compares saved revision with the running process's startup revision.

```sh
curl --fail-with-body --silent --show-error \
  -H "Authorization: Bearer $HEXAGON_API_TOKEN" "$HEXAGON_API_URL/v1/deployment"
```

Config contains outbound_proxy (optional), no_proxy and ingress. Ingress status, when configured, has state, attempts, checked_at and possibly code. Environment_overrides has boolean proxy/ingress indicators; it does not expose the values or enumerate every environment override. A missing deployment.json uses defaults; malformed/unreadable saved configuration returns `500 deployment_configuration_invalid`.

## Replace configuration

`PUT /v1/deployment` accepts strict `{config,expected_revision}`. Expected_revision must be a 64-character string matching the current revision returned by GET. Config is a complete replacement, not a merge:

| Field | Contract |
| --- | --- |
| outbound_proxy | Optional HTTP/HTTPS origin; no user/password, query, fragment or non-root path |
| no_proxy | Default empty array; at most 128 entries, each ≤253 characters matching the supported host-pattern schema |
| ingress | Default `{mode:"cloudflare"}`; strict mode-specific object |
| ingress.mode | cloudflare, disabled or external |
| ingress.url | Required only for external; HTTPS origin with the same URL restrictions |

No-proxy entries permit `*` or the schema's host-like patterns, not URLs, arbitrary shell expressions or general regular expressions. Refer to [configuration](configuration.md) for environment precedence: saved values do not necessarily override explicit process environment.

Prepare `deployment-update.json` with your GET revision and complete intended config. For example, `{config:{no_proxy:[],ingress:{mode:"cloudflare"}},expected_revision:...}` selects temporary ingress and removes any saved outbound proxy. Use actual JSON in the file, not this illustrative notation.

```sh
curl --fail-with-body --silent --show-error --request PUT \
  -H "Authorization: Bearer $HEXAGON_API_TOKEN" -H 'Content-Type: application/json' \
  --data-binary @deployment-update.json "$HEXAGON_API_URL/v1/deployment"
```

Success returns **200**, `{config,revision,restart_required:true}`. The implementation takes an exclusive file lock, checks revision, writes a private temporary file and atomically renames it to deployment.json. It does not restart the process or establish a working tunnel. Omitted fields get defaults, including cloudflare ingress; do not omit fields intending to preserve them.

`409 deployment_configuration_changed` means your revision is stale: re-read and reconcile the complete intended configuration. `409 deployment_configuration_busy` means the update lock exists; investigate the active writer before touching a lock. A lost response can follow a successful file replacement. Read the saved revision/config before retrying, and schedule any restart through the local management workflow. There is no automatic rollback of an applied config if a later restart fails.

## Retry temporary credential ingress

`POST /v1/deployment/ingress/retry` takes no required body and normally returns **200** with the currently available ingress status. It requires the running environment's HEXAGON_ACCESS_TUNNEL to equal cloudflare; otherwise `409 development_ingress_disabled`.

```sh
curl --fail-with-body --silent --show-error --request POST \
  -H "Authorization: Bearer $HEXAGON_API_TOKEN" \
  "$HEXAGON_API_URL/v1/deployment/ingress/retry"
```

The handler starts retry without awaiting completion, then reads status. A successful response does not prove ingress is ready. Poll deployment/health and inspect status. If the optional ingress service is absent, do not assume a status object or an attempt occurred merely because the route exists.

## Stop ingress

`POST /v1/deployment/ingress/stop` takes no required body. It awaits the configured ingress service's stop and returns **200** with its available status. It does not rewrite saved ingress mode, disable future process startup or close Sessions.

```sh
curl --fail-with-body --silent --show-error --request POST \
  -H "Authorization: Bearer $HEXAGON_API_TOKEN" \
  "$HEXAGON_API_URL/v1/deployment/ingress/stop"
```

Retry and stop both reject with `409 active_run` if **any nonterminal Run in the database** exists; the guard is not limited to the current tenant. Stopping ingress can affect credential delivery for later tasks, so verify readiness before resuming work. Neither operation has a request idempotency key or changes the saved configuration revision.

Malformed strict update bodies return `400 invalid_request`. Source: [settings and environment composition](../../../../modules/deployment/settings.ts), [route guards](../../../../apps/control-plane/server.ts), [ingress lifecycle](../../../../modules/deployment/ingress.ts). Examples assume HEXAGON_API_URL without `/v1` and a local owner token. No settings, processes or tunnels were changed in this documentation pass. Next: [local workspace](../operate/local-workspace.md), [networking](../operate/networking.md), [HTTP overview](http.md).
