# Actual E2B egress policy probes

Command: `npx tsx tooling/smoke-network.ts`. Exit 0 on 2026-11-15.

The test uses the product E2BConnector with two short-lived cloud sandboxes and public, credential-free HTTPS targets. It does not invoke a model. Private evidence: `.local/evidence/network-bd2c630e-8109-4427-a6ea-d7f8a3a494ec.json`.

| Policy | example.com | example.org |
| --- | --- | --- |
| Unrestricted baseline | curl exit 0, HTTP 200 | curl exit 0, HTTP 200 |
| Allowlist: example.com | curl exit 0, HTTP 200 | curl exit 35, HTTP 000 |

The unrestricted baseline establishes destination availability during the test. The restricted instance uses the adapter's `denyOut: ['0.0.0.0/0']` and domain `allowOut`, with public ingress disabled. Both probes explicitly bypass proxy environment variables. The denied request fails before an HTTP response, while the permitted destination remains reachable.

Sandbox `iy5k4q0nm0pvw9fpt9gsu` (baseline) and `iszo1i9ib7k8ky2ge2qck` (allowlist) were deleted; provider inspection confirmed both absent. Operation IDs and cleanup records are retained in the private journal. The script journals creation intent before provisioning and reconciles by operation metadata if the response is uncertain.

Scope: real connector-level domain egress enforcement. This does not prove the complete public API/SDK network configuration journey, all IP/IPv6 or wildcard cases, cross-tenant permissions, or another provider's network capabilities. The combined permission/network acceptance branch remains open.
