# Daytona integration attempts — 2026-11-15

Status: actual provisioning/bootstrap verified; complete model task NOT passed.

The adapter uses @daytona/sdk 0.231.1. It creates private sandboxes with operation/session labels, an absolute TTL, synchronous deletion confirmation, file/command operations and private preview headers retained inside the control plane. Console includes Daytona connection configuration. GUI interaction for this provider remains unverified.

Private journals in `.local/evidence`:

- `api-smoke-c36b4762-5974-4e3e-b28f-2ee8914064bd.json`: default 1 GiB snapshot failed the OpenCode 2 GiB minimum. Cleanup confirmed.
- `api-smoke-f162a642-97ed-4d63-9b62-c47648868f70.json`: resize API returned 404. Operation-label reconciliation recovered the created resource. Cleanup confirmed. The unsupported resize path was removed.
- `api-smoke-dcb755c5-95c0-45e4-92be-c8b3115da5a4.json`: existing `daytona-medium` snapshot supplied 4 GiB; Runtime and OpenCode started. Model task timed out, and provider cleanup was confirmed. No snapshot was created or removed.

The third resource reported `networkBlockAll=false`, null network/domain allow lists, and a populated `autoDestroyAt`. Direct unauthenticated probes inside it reached registry.npmjs.org over HTTPS (200); api.minimaxi.com and example.com HTTPS connections were reset, while example.com HTTP returned 403. No model credential was used in those probes.

Daytona's [official network limits](https://www.daytona.io/docs/en/network-limits/) say Tier 1/2 organizations restrict outbound access independently of sandbox settings; Tier 3/4 allow unrestricted internet by default. The published essential-services list contains npm and `*.minimax.io`, but does not list the tested `api.minimaxi.com` host. The observed behavior is consistent with organization restrictions; the account tier itself has NOT been verified. No proxy bypass or account change was attempted.

The public provider capability list deliberately does not advertise an enforced user network allow list. A successful connection-list validation proves account API access only, not model endpoint reachability inside a sandbox. The alternate-provider acceptance checkbox remains open.

## International endpoint probe

A new short-lived test Sandbox (`91137714-2dc8-4593-abd8-e18611752d8c`) was created with a three-minute TTL. The adapter returned its actual expiry `2026-11-15T02:32:11.701Z`. No model credential was sent.

- registry.npmjs.org: HTTP 200, curl exit 0.
- api.siliconflow.com: no HTTP response, curl TLS exit 35.
- api.minimax.io: HTTP 404 on root, curl exit 0 (connectivity only; no authentication/model call tested).
- api.minimaxi.com: no HTTP response, curl TLS exit 35.

Deletion and absence were confirmed at 02:29:30 UTC. Private journal: `.local/evidence/daytona-network-03bb2053-1ccb-48ff-bd63-f5dcc9cf3c2c.json`. This strengthens the domain-restriction diagnosis but still does not prove the account's tier. Successful SiliconFlow tests on E2B do not resolve this Daytona restriction.

## User-requested SiliconFlow international recheck

At 04:18 UTC, after the user specifically asked to use `siliconflow_api_key_polygala` with the international site, `npx tsx tooling/probe-daytona-siliconflow.ts` created one short-lived Daytona Sandbox and rechecked the exact endpoint `https://api.siliconflow.com/v1/models`.

- Sandbox `b7483d62-4982-413a-a394-95a432d762d6`.
- HTTPS npm baseline: HTTP 200, curl exit 0.
- SiliconFlow international models endpoint: HTTP 000, curl exit 35 (TLS connection failure).
- Authentication was not reached; the script did not copy the model credential into a Sandbox that could not establish transport. This is not evidence of an invalid SiliconFlow credential. Earlier E2B SiliconFlow journeys remain successful evidence for that credential/endpoint.
- Provider deletion and absence confirmed at 04:18:31 UTC. Private journal `.local/evidence/daytona-siliconflow-7c7d8d88-d674-42cd-943d-e745e507e58b.json`.
- `npm run check` passed for the repeatable probe tooling.

A separate bounded local request to the officially documented MiniMax international endpoint `https://api.minimax.io/anthropic/v1/messages`, using the existing user MiniMax key and model MiniMax-M3, returned HTTP 401 `authentication_error`. Evidence `.local/evidence/minimax-international-probe.json`. This closes the untested international-MiniMax alternative with current credentials; it does not affect the working domestic MiniMax configuration. Official endpoint reference: https://platform.minimax.io/docs/api-reference/text-anthropic-api.

The current network symptoms do not prove the exact account tier or policy cause. No routing bypass, account-tier change or replacement credentials were introduced. Daytona full-task acceptance remains open.
