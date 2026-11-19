# Configure ingress, proxies, and protected credential access

Hexagon has three inbound traffic roles. Route each deliberately rather than pointing one development tunnel at all services.

| Ingress | Local default | Caller and purpose |
| --- | --- | --- |
| API / Console | 127.0.0.1:8787 | SDK/Console task and configuration access |
| Private preview | 127.0.0.1:8788 | Browser access to authorized Sandbox HTTP apps |
| Credential listener | 127.0.0.1:8789 | Bounded model/protected HTTP access from Sandboxes |

These are defaults, not recommendations to expose them publicly. Corresponding HOST/PORT settings change listeners; reverse proxies should route only the intended role.

## Development ingress

The managed launcher defaults to a Cloudflare development channel and needs cloudflared. It forwards the credential listener, not management. Console Network & ingress displays its status; management remains independently available when the tunnel fails.

The tunnel carries delegated tokens and request/response content through its service. Fixed/production networks should use a stable HTTPS origin. Example external configuration:

```json
{"no_proxy":[],"ingress":{"mode":"external","url":"https://credentials.example.com"}}
```

Save through local configure and restart without active work. Replace the placeholder with an actual reachable origin routed to the credential listener.

Stopping a temporary channel is a runtime action; future work can restore the saved mode. Save disabled mode to keep ingress disabled. Do not rotate an origin currently used by active invocations.

## Hosted and preview routing

Hosted requires stable HTTPS credential ingress and rejects temporary tunnels. Verify reachability from a real Sandbox: a loopback health request from the control plane is insufficient.

Management remains authenticated. Previews require a dedicated wildcard domain/TLS and grant-specific subdomains, separate from Console origin. See [preview limits](../build/private-preview.md). OAuth callbacks belong to management authorization routing; a credential tunnel is not an OAuth callback tunnel.

## Outbound proxies and policy

Saved outbound_proxy settings and explicit process environment govern their respective paths. Environment wins; bypass entries merge with loopback. Protected upstreams have additional destination enforcement: direct paths check public DNS and reject redirects; trusted proxy mode requires exact approved hosts.

`HEXAGON_ACCESS_EGRESS_PROXY_URL` and `HEXAGON_ACCESS_EGRESS_HOSTS` configure protected upstream proxying. Hosts are exact names, not wildcards. Successful npm traffic does not prove model/Tool egress works.

Sandbox allowlists must include the credential origin hostname. Sandbox policy and control-plane Tool egress are different boundaries; see [network policy](../build/sandbox-policy.md).

## Diagnose in order

1. Confirm control-plane health and intended workspace.
2. Check credential origin identity, TLS, and routing.
3. Test actual Sandbox access, including allowlist restrictions.
4. Check model protocol, fixed upstream, credentials, and outbound proxy.
5. For previews, check process/port, grant, origin, and expiry.

Record execution stage, sanitized codes, and required identifiers; avoid complete headers, tokens, and upstream bodies. Do not repair ingress by exposing management or injecting original model keys into the Sandbox.

Acceptance needs a real cloud call, isolated preview authorization, rejected unauthorized access, and working ingress after restart. Sources: [entry](../../../../apps/control-plane/main.ts), [settings](../../../../modules/deployment/settings.ts), [credential boundary](../../../secret-management.md). Next: [local workspace](local-workspace.md).
