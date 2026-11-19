# Privately preview generated Web applications

A private preview gives a browser temporary authorized access to an HTTP port inside a Session. Use it to inspect Agent-generated pages and interactions. It is not a production publishing service.

You need an open Session with allocated cloud resources, a Provider supporting private access, and a running HTTP server. Creating a grant does not start the server.

## Start the application

Ask the Agent to create a simple HTML page and start an HTTP server on a specific port, such as 3000. Have it verify the response locally before requesting a preview.

Use a background-process mechanism supported by the Runtime and Provider when the service must survive Harness exit. A “started” message alone does not establish continued liveness. Begin with a static page that needs no WebSocket, external resources, or login cookie to isolate transport problems.

## Create and revoke access

Continue with an initialized client and an authorized Session ID. Open the URL and complete inspection before revoking it.

```python
preview = client.create_preview(session_id, port=3000, ttl_seconds=600)
# Open preview['url'] in an authorized browser; do not write it to public logs.
# After completing the inspection:
client.revoke_preview(preview['id'])
```

```typescript
const preview = await client.createPreview(sessionId, 3000, 600);
// Open preview.url in an authorized browser; do not write it to public logs.
// After completing the inspection:
await client.revokePreview(preview.id);
```

Allowed ports are 3000–8999 except Runtime management port 8765. Lifetime is 30–3600 seconds, defaulting to 600. The response includes a grant ID, expiry, and access URL.

## Authorization boundary

Local previews use port 8788 by default, with a distinct `<id>.localhost` origin per grant. The entry ticket becomes a host-only HttpOnly cookie and is removed from the address bar. Requests check expiry, revocation, and Session availability. Closing the Session invalidates preview access.

Provider traffic credentials remain on the server. The URL ticket itself is a credential: sharing it can grant access. Deliver it only after checking your application's business permissions.

Hosted deployments require a dedicated preview domain with wildcard routing and TLS. Keep generated content on a separate origin from Console; treat Agent-generated HTML as untrusted application content.

## Supported behavior

Current support covers HTTP pages, assets, forms, and API requests within the preview origin. WebSocket upgrades, upstream application cookies, arbitrary external redirects, and external browser resources are unsupported. Development pages relying on HMR sockets or external CDNs may not work fully; establish ordinary HTTP behavior first.

Run completion neither guarantees that the preview process is still alive nor automatically means it was stopped. Background-process lifetime, idle suspension, expiry, and Session closure affect access. Provider-specific process preservation is not a permanent-URL guarantee.

## Diagnose and verify

For `preview_session_unavailable`, inspect Session state, allocated resources, and expiry. If a grant exists but loading fails, inspect the process and port, Provider private transport, control-plane proxy, then browser origin and TLS. Do not create duplicate Runs or expose Provider ports to work around the issue.

Test real browser interaction, anonymous rejection, natural expiry, explicit revocation, and denial after Session closure. Cookies from different grants must not be interchangeable. This article is source-reviewed; it does not claim a new browser acceptance run.

Sources: [grant lifecycle](../../../../modules/sandboxes/previews.ts), [SDK support boundaries](../../../../sdk/README.md#web-previews). Next: [Artifacts](artifacts.md) for deliverables that must outlive the preview.
