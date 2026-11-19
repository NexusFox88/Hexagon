# Secret management acceptance — 2026-11-15

This change adds managed Secret resources, Connection references, exact-policy HTTP access, protected model credentials, GUI controls and both SDKs. All registered providers use the common external credential path; Vercel additionally injects restricted grants through native Header transforms. This is not implementation evidence for every vendor's native Secret API.

## Deterministic and local evidence

- TypeScript typecheck passed.
- Full regression passed: 41 files / 117 tests. The suite includes tenant/reference boundaries, write-only responses, ciphertext inspection, rotation and disable invalidation, grant expiry/revocation/Session closure, path/method restrictions, binary responses, redirects and trusted-egress host restrictions.
- Built TypeScript SDK and Python SDK interoperability passed: real local HTTP requests for Secret CRUD, preflight, grants and revocation.
- Vercel policy tests verify exact grant-path transforms and network contract preservation. Worker recovery tests verify native grant metadata is never delivered to Runtime.
- Local startup/migration/restart/wrong-key checks passed in isolated data directories; private journal: `.local/startup/hexagon_startup_ab95d94d6332492d8f0559ee827f63ed/evidence.json`.
- Browser verified Secret create, no saved-value display, Connection reference selection, validation/enable, rotation disabling dependent Connection, reference display, guarded deletion, disable, and cleanup of all disposable GUI records. Local Console remains available at `http://127.0.0.1:8787/console/`.

## Real cloud evidence already verified

| Provider / Harness | SDKs | Protected access | Guest scan | Cleanup | Private journal |
| --- | --- | --- | --- | --- | --- |
| Boat / custom Python | Python + TypeScript | External credential proxy; real SiliconFlow model results | 3,292 sources checked; original model key not found | Confirmed | `.local/evidence/api-smoke-77412672-c99e-4e9c-8f53-01a0a229ebd6.json` |
| Vercel / custom Python | Python + TypeScript | Native Header injection of delegated proxy grant; real SiliconFlow model results | 220 sources checked; original model key and native grant not found; original absent from persisted invocation | Confirmed | `.local/evidence/api-smoke-3802415c-55cb-4afe-9fa7-fb22c0820b9c.json` |

Guest scans receive SHA-256 digests only, not original keys. They inspect process environments/arguments and bounded Hexagon runtime/configuration files, excluding dependency trees. These are concrete absence checks over that scope, not a claim of arbitrary memory forensics. Successful calls plus scans establish the intended data path for the tested combinations.

## Network and failed attempts

The local network uses synthetic DNS answers in reserved address space. Direct egress correctly rejected them. Tests now explicitly use the existing trusted local proxy and an exact `api.siliconflow.com` upstream host allowlist; no blanket private-address bypass was added.

The user explicitly approved temporary Cloudflare HTTPS tunnels to the credential-only listeners. Each smoke attempt closes its tunnel in cleanup. Management API and Console are not the tunnel upstream. The original upstream secret is injected locally after the inbound tunnel request; the tunnel carries delegated authority and request/response content.

Initial failed attempts remain failed evidence (including no-return success claims):

- Boat initial Harness failure: `api-smoke-f673fe3b-840a-49ae-84ae-30f451853f58` — cloud cleanup confirmed.
- Boat validation failure: `api-smoke-29e98adf-8b5d-4ec0-bbac-6e5c05de02c8` — no resource allocated; cleanup confirmed.
- Vercel initial 502 under reserved-address protection: `api-smoke-b76a649f-10b3-4915-b402-c340d92ee2e7` — cleanup confirmed.
- Modal and E2B validation attempts: `api-smoke-5aa13601-f1b1-4aa3-afd0-db96b059ed5c`, `api-smoke-f212b1d0-1d2d-4de4-a6d5-ecb0ae5c3220` — cleanup confirmed.

Additional completed checks:

- Vercel / custom Python / both SDKs with both model and generic HTTP bindings passed. The guest made authenticated `GET /v1/models` through `HEXAGON_CONNECTIONS`, plus model calls. Both native grants and the original key were absent from 221 checked sources and the original key was absent from the persisted invocation. Product/cloud cleanup confirmed: `.local/evidence/api-smoke-9df6e2cb-863a-4d1b-b913-2d6f8412468f.json`.
- Vercel / Pi / both SDKs full Web journey passed, including actual model streaming, Tool authorization/approval, private preview/revocation, fixed tests, artifacts, event replay, continuation, cancellation, retention and confirmed cleanup. Guest scan covered 311 sources and excluded the original key and native grant: `.local/evidence/api-smoke-d9bde8f8-0571-422e-9aac-39f470d278e4.json`.
- Local Runtime Python suite: 9 tests, 8 passed and 1 platform-specific skip on macOS. Focused checks additionally verify compressed bytes/headers and denial after Run cancellation/completion.

Boat/OpenCode's TypeScript Web journey, model streaming and subsequent conversation completed with original-key absence checks, but the independent Python Session remained in provisioning/reconciliation and the overall attempt failed (`api-smoke-3078a5ed-2bfa-4852-bc64-d27d8ecee165`). All its cloud resources were confirmed cleaned up; this is partial evidence, not a successful dual-SDK row. E2B/Modal provisioning-timeout attempts `api-smoke-27f8e2a9-0182-4c34-88cc-b505bd20c054` and `api-smoke-3062cd13-0cae-4c42-8f9f-ad9babdef920` failed with cloud cleanup confirmed. The extra Vercel/OpenCode validation attempt `api-smoke-f775171c-269d-46f8-aa36-7e5fb2b19d83` also failed before execution with cleanup confirmed. Daytona remains user-deferred. Earlier provider matrix results do not count as fresh credential-isolation evidence.


## Local delivery

The local control plane was reloaded with the feature; API, database, encrypted credential backend and worker health passed. Public credential ingress is deliberately not retained after acceptance. Health reports `credential_access.state = not_configured` until the operator supplies `HEXAGON_ACCESS_URL` or explicitly enables `HEXAGON_ACCESS_TUNNEL=cloudflare` at startup.

The opt-in development tunnel startup/restart/shutdown path also passed the real isolated startup smoke, including process-group cleanup: `.local/startup/hexagon_startup_1f5c867d23944e4c95296f36b6698c2a/evidence.json`. This test opened only credential listeners and was covered by the user's temporary-tunnel authorization. Stable hosted ingress remains a deployment configuration rather than a permanent test tunnel.

Final local process inspection found no remaining `cloudflared` process after the acceptance and startup checks. Final TypeScript typecheck passed. The persistent local service remains bound to loopback with no temporary ingress enabled.
