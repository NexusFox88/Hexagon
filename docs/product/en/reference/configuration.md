# Configuration and environment variables

Configuration has separate layers: control-plane process settings, saved local deployment settings, Session behavior/guest environment, and provider-specific Connections. Their scopes differ. Putting a cloud account key in Session env does not replace a Connection.

## Control-plane process

Sources: [main.ts](../../../../apps/control-plane/main.ts), [deployment mode](../../../../modules/deployment/mode.ts), [local discovery](../../../../modules/deployment/local-discovery.ts) and [tunnel](../../../../integrations/network/cloudflare-tunnel.ts). Changes require service restart, except internal readiness logic can update temporary ingress origins. Defaults below are entry-point defaults before local saved settings are applied.

| Name | Default | Applicability / requirement | Sensitive | Type and purpose |
| --- | --- | --- | --- | --- |
| `HEXAGON_DEPLOYMENT_MODE` | local | local / hosted | No / 否 | local or hosted; other values fail startup. |
| `DATABASE_URL` | postgres://hexagon@127.0.0.1:55432/hexagon | both; required hosted / 两者，hosted 必填 | Yes / 是 | PostgreSQL URL; hosted has no implicit database creation. |
| `HEXAGON_DATA_DIR` | .local/control-plane | primarily local / 主要 local | Private path / 私有路径 | Resolved data directory for identity, key, settings and logs. |
| `HOST / PORT` | 127.0.0.1 / 8787 | both / 两者 | No / 否 | Management listener host and numeric port; loopback local binding enables local bootstrap. |
| `HEXAGON_ACCESS_HOST / HEXAGON_ACCESS_PORT` | 127.0.0.1 / 8789 | both / 两者 | No / 否 | Separate credential-access listener, not management ingress. |
| `HEXAGON_ACCESS_URL` | unset before local deployment settings / local 配置前未设 | both; required hosted / 两者，hosted 必填 | Origin only / 仅 origin | Public HTTPS origin for delegated credential access; local tunnel can populate it. |
| `HEXAGON_ACCESS_TUNNEL` | derived locally / local 推导 | local only / 仅 local | No / 否 | cloudflare or empty; other nonempty values fail; hosted rejects nonempty. |
| `PREVIEW_HOST / PREVIEW_PORT` | 127.0.0.1 / 8788 | both / 两者 | No / 否 | Preview listener; preview port also contributes to generated addresses. |
| `PREVIEW_SCHEME / PREVIEW_DOMAIN` | http / localhost | both / 两者 | No / 否 | Advertised preview scheme/domain; configure DNS/TLS/routing separately. |
| `HEXAGON_MASTER_KEY` | none / 无 | required hosted / hosted 必填 | Yes / 是 | Canonical Base64 encoding of 32 bytes, matching existing encrypted data. |
| `HEXAGON_BOOTSTRAP_TOKEN` | none / 无 | required hosted / hosted 必填 | Yes / 是 | Must authenticate an existing owner; does not create hosted identity. |
| `HEXAGON_LOCAL_DISCOVERY_FILE` | ~/.hexagon/local.json | local | Private path / 私有路径 | Discovery descriptor location; per-data-directory connection.json is also written. |
| `CLOUDFLARED_BINARY` | cloudflared | local tunnel / 本地隧道 | No / 否 | Executable path; it must exist when using temporary ingress. |
| `HEXAGON_TUNNEL_PROXY_FALLBACK` | enabled unless disabled / 非 disabled 时启用 | local tunnel / 本地隧道 | No / 否 | disabled prevents proxy-stripped retry for the specific tunnel transport failure. |

Hosted startup requires an explicit database, matching key, existing owner Token and HTTPS credential origin without userinfo, query, fragment or a non-root path. Development tunnels are rejected. Failures include `invalid_deployment_mode`, `hosted_identity_and_storage_required`, `hosted_master_key_invalid`, `hosted_https_ingress_required` and `hosted_owner_identity_required`. There is no automatic hosted identity bootstrap; see [self-hosting](../operate/self-host.md).

Listener ports are converted with `Number(...)` and passed to the server; invalid values do not all have one unified configuration error. Port conflicts, invalid hosts and listen failures use underlying errors. Changing HOST does not configure TLS, identity or reverse proxies.

## Saved local deployment settings

The selected data directory contains `deployment.json`, validated by [settings.ts](../../../../modules/deployment/settings.ts). Local startup reads it; the direct hosted entry does not. The managed local launcher applies saved settings, so follow self-hosting instructions with explicit process configuration rather than mixing hosted startup with local bootstrap.

| Field | Type / default | Required / sensitive | Behavior |
| --- | --- | --- | --- |
| `outbound_proxy` | Optional HTTP(S) origin, no default | Optional; URL username/password rejected | Outbound proxy; no path, query or fragment |
| `no_proxy` | String array, default `[]` | Optional, normally nonsecret | Up to 128 entries, 253 characters each, restricted host syntax |
| `ingress.mode` | Default `cloudflare` | Optional, nonsecret | `cloudflare`, `disabled` or `external` |
| `ingress.url` | HTTPS origin | Required for external; no embedded credentials | Credential-access ingress, not Console or OAuth callback |

Example configuration (the external hostname is a placeholder requiring real routing):

```json
{
  "outbound_proxy": "http://127.0.0.1:7890",
  "no_proxy": ["localhost", "127.0.0.1"],
  "ingress": {"mode": "external", "url": "https://credentials.example.invalid"}
}
```

```sh
npm run local -- configure /absolute/path/deployment.json
```

configure replaces the full config rather than merging a patch; omitted fields take defaults. It returns a revision and `restart_required: true`, without restarting. Invalid saved files cause `deployment_configuration_invalid`; concurrent updates can produce `deployment_configuration_busy` or `deployment_configuration_changed`. Read the current settings rather than bypassing locks/revisions.

## Proxy precedence

Local `deploymentEnvironment` chooses `HTTPS_PROXY`, then `https_proxy`, then saved `outbound_proxy`. HTTP proxy uses `HTTP_PROXY`, then `http_proxy`, then that selected proxy. `NO_PROXY` takes precedence over `no_proxy` and merges with saved entries plus `127.0.0.1,localhost`. An explicitly present empty string can shadow saved values.

`HEXAGON_ACCESS_URL` takes precedence over a saved external URL; a usable external address disables the temporary tunnel. Without one, explicit `HEXAGON_ACCESS_TUNNEL` takes precedence over ingress mode. Local environment assembly sets `NODE_USE_ENV_PROXY` to `1`; setting it to `0` is therefore not guaranteed to disable proxies through that path. The direct hosted [outbound setup](../../../../modules/deployment/outbound.ts) does select direct transport when it receives `0`.

With a local proxy and no explicit `HEXAGON_ACCESS_EGRESS_PROXY_URL`, assembly fills that value from the selected proxy. `HEXAGON_ACCESS_EGRESS_HOSTS` then defaults to `api.siliconflow.com,api.minimaxi.com,api.minimax.io,api.minimax.chat`. This concerns credential-access proxy routing, not account authorization or the Sandbox network allowlist. See [networking](../operate/networking.md) for advanced settings; application policy and process proxies are distinct.

## Session settings and guest environment

| Setting | Type / default | Scope and application time |
| --- | --- | --- |
| `harness` or `agent_id` | Exactly one; Agent revision optional | Resolved/pinned at creation; do not combine saved Agent with configuration overrides |
| Sandbox/model connection IDs | Required UUIDs | Tenant-owned, compatible, ready connections; not credential values |
| `resources` | Idle default 60 seconds; timeout default 600 | Pinned at creation; see limits and lifecycle semantics |
| `network` | Default unrestricted; allowed_hosts empty | Pinned; allowlist needs provider support and credential-ingress access |
| `identity`, `instructions`, `context` | Optional behavior fields | Model guidance/background, not caller authorization |
| `tools`, `connections` | Name-to-connection-ID maps, default empty | Tool bindings and protected HTTP bindings are different |
| `variables` / `env` | String maps; env default empty | Guest Agent process environment, not control-plane configuration; values may be sensitive |

variables is an alternative to env. Supplying variables together with nonempty env produces `ambiguous_variables`. Names match `[A-Za-z_][A-Za-z0-9_]{0,127}`. Prefixes `HEXAGON_`, `OPENCODE_`, `PI_` and names `PORT`, `NODE_OPTIONS`, `PYTHONPATH`, `PYTHONHOME`, `LD_PRELOAD`, `LD_LIBRARY_PATH` are reserved. Values reject NUL; see [limits](limits.md) for count/byte bounds. Do not use guest env to bypass control-plane credential storage.

Sources: [Session schema](../../../../modules/execution/sessions.ts), [environment schema](../../../../modules/execution/environment.ts), [initialization](../../../../modules/execution/initialization.ts). Create a new Session for a changed definition; saving deployment settings or restarting does not rewrite an existing Session's pinned behavior.

## Client and provider settings

SDK URL/Token constructor arguments are client configuration. Example `HEXAGON_API_URL` / `HEXAGON_API_TOKEN` variables are read by the example program, not control-plane identity-bootstrap switches. `Hexagon.local()` discovers identity using explicit data-directory selection, workspace descriptors and the user discovery file. Do not weaken private-file checks to make discovery succeed.

Provider settings live in Connection `config`, with managed Secret or OAuth credentials. Their fields, defaults and verification scope are in [integration guides](../integrations/choose.md), not global deployment environment variables. Test-only `TEST_DATABASE_URL` does not select the ordinary service database.

This page was checked against current configuration readers; no running installation was changed or restarted. Next: [installation](../start/install.md), [self-hosting](../operate/self-host.md), [networking](../operate/networking.md).
