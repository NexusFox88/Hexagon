# OCI Harness acceptance — 2026-11-18

This evidence distinguishes registry resolution, actual container binaries with a deterministic model fixture, and actual cloud Sandbox/model/tool execution. No images were published and no commits were created.

## Implemented surface

- `POST /v1/harnesses`, Python `register_harness(image=...)`, TypeScript `registerHarness({image,...})`.
- Docker Hub/GHCR tag/index resolution, Linux amd64 manifest/config digest verification, immutable tenant-owned registrations, optional managed registry credentials.
- Session pins the image; Modal derives Runtime prerequisites and starts a persistent Sandbox. The Runtime invokes the image's command through the declared protocol adapter. Unsupported providers reject image Sessions before cloud allocation.
- Five templates: OpenCode 1.2.27, Aider 0.86.2, Pi 1.5.2, Claude Code 2.1.327, Python Agent 1.0.0. OpenCode/Aider reference public upstream images; the others are build recipes, not published images.
- Console registered-image table, template catalog with self-hosted identity images, image-registration dialog, details and SDK examples; one contextual page toolbar with language and page actions.

## Repeatable commands and observed results

| Command | Actual result | Evidence |
| --- | --- | --- |
| `TEST_DATABASE_URL=postgres://hexagon@127.0.0.1:55432/hexagon npm run verify` | 73 test files, 214 tests passed; latest run 10:14:37 local | `.local/oci-harness/verify-final.log` |
| `npm run verify:packages` with test database configured | 4 files / 4 tests passed using installed TS tarball and Python wheel, including real HTTP registration contracts | `.local/oci-harness/packages-final.log`, `.local/evidence/sdk-packages.json` |
| `node --import tsx tooling/build-harness-images.ts all` | All five local images built; version commands checked | `.local/oci-harness/` build logs |
| `npx tsx tooling/smoke-harness-images.ts` | All five actual container binaries returned the protocol fixture result; all containers removed | `.local/oci-harness/fixture-results-all.json`, `fixture-final.log` |

The fixture command uses a deterministic Anthropic-compatible HTTP/SSE server. It is **not** evidence of five cloud/model integrations. Unit tests cover registry auth/redirect policy/digests, tenant ownership, immutable version collisions, managed-secret references, provider compatibility, adapter result parsing and Modal keepalive behavior.

## Actual cloud acceptance

Provider: Modal. Model: configured SiliconFlow international endpoint. External tool: configured Exa connection. Local SDK clients need no manually supplied control-plane token. Model/tool account credentials remain behind the control-plane proxy; Sandbox processes receive scoped grants.

Python: OCI registration through Python SDK, pinned public Python image, custom JSON protocol via explicit command override of the checked-in Python Agent example. Two turns completed, remembered `ORBIT-42`, read `APP_OCI_ACCEPTANCE=python`, completed a remote Exa search, exported/downloaded a 255-byte report, and closed the Session with confirmed cleanup. Downloaded content and SHA-256 recorded in `.local/oci-harness/python-journey.json`. This proves the custom protocol in an actual cloud OCI image; it does not imply publication of our Python Agent Dockerfile.

TypeScript: strict two-turn OpenCode journey recorded in `.local/oci-harness/typescript-journey.json`. The acceptance script requires the exact remembered passphrase, unchanged environment value, completed remote tool call, JSON artifact download and confirmed cleanup. Final result: passed. Downloaded `report.json` was 120 bytes and contained exactly `remembered_code=ORBIT-48`, `env_value=typescript` and `https://specs.opencontainers.org/image-spec/`. The real Exa call completed. Initial close returned `sandbox_deletion_unconfirmed`; background reconciliation completed and the Session became closed with its Sandbox destroyed. The original script exited before saving final assertions because its finally block did not handle this transient response; a separate SDK read/download/reconciliation check verified and persisted all assertions. The checked-in acceptance script now saves evidence before cleanup and waits for reconciliation on that specific error without blindly issuing another delete. This last script correction was type-checked, not represented as an additional cloud rerun.

Aider: actual pinned Aider image on Modal called the configured real model and returned `OCI_AIDER_OK` plus `ORBIT-48`; Session cleanup confirmed. `.local/oci-harness/aider-journey.json`. This adapter is conversation-only and does not advertise connected-tool support.

Separate direct cloud probes confirmed Runtime health and actual Python/OpenCode/Aider binary versions, then deleted those Sandboxes: `modal-image-probe.json`, `modal-opencode-probe.json`, `modal-aider-probe.json` in the private evidence directory.

## Failures found and corrected

- Modal inherited image commands could terminate immediately: clear image entrypoint/Cmd and explicitly keep the Sandbox alive with `sleep infinity`.
- Official registry blobs redirect to CDN hosts: permit only the explicit HTTPS CDN allowlist, strip authorization on redirect, and verify config bytes against the digest.
- Claude Code root-incompatible bypass permissions and greedy CLI option parsing: explicit allowed tool set and `--` prompt separator; actual binary fixture rerun passed.
- Generic artifact-delivery instructions induced filesystem work even for text-only answers: scope those instructions to requested deliverables. Subsequent OpenCode first-turn reply matched the requested acknowledgement.
- Earlier TS model-generated reports changed the environment value or included acknowledgement text in the passphrase field. These attempts remain failed evidence (`typescript-model-misread.json`, `typescript-report-schema-mismatch.json`). Strict downloaded-content assertions and an unambiguous report schema prevent treating Run completion as acceptance success.
- Registration dialog footer could scroll out of view: use a flex column with only the body scrolling. Browser-verified at 390×844 in both languages.

## Browser review

Actual Ego browser interaction, not just DOM/unit tests:

- GUI registration from the Aider template; stored registry entry appeared in the table.
- Image validation and localized failure states; custom protocol/registry selectors; Escape returns focus to Register image.
- English and Chinese catalogs, desktop template/registered views, details, image editor, narrow layout.
- Mobile dialog footer remains in viewport (bottom 831 within 844px); no horizontal overflow (390px document width).
- Shared contextual toolbar reviewed on Sandbox, LLM, API Playground, Tools, Settings and Session detail; Session detail has one visible title and accessible language control.
- Real Python two-turn conversation rendered with right-aligned user messages, left-aligned Agent replies and downloadable report.

Private screenshots: `templates-en-final.png`, `editor-en-mobile-final.png`, `editor-zh-mobile-final.png`, `session-zh-final.png`. Earlier screenshots of failed layouts are not passing evidence.

## Cleanup

Read-only database audit after the last cloud run: all seven OCI acceptance Sessions closed; all recorded create/delete operations completed. Private Session/resource/operation IDs remain in `.local/oci-harness/resource-cleanup-audit.json` for follow-up. Direct probe IDs remain in their individual private probe files. No user configuration or older sessions were deleted.

## Explicit limits

- Only Modal currently advertises native OCI image execution. Legacy installer/source modes remain available elsewhere; this is not an all-provider OCI compatibility claim.
- Pi and Claude Code: actual local image build/binary/fixture verified, not real cloud/model acceptance.
- Private registry policy, references and credential lifecycle are tested deterministically; no real private-repository pull was exercised.
- Linux amd64 and Alpine/Debian-family bootstrap only; arbitrary registries, distroless images and other architectures are not supported.
- Modal ignores image USER. An image user declaration is not an enforced security boundary.
- Registry credentials are supplied to Modal's image builder, not agent process environment. That does not make untrusted image builds a new isolation/security boundary.
- Temporary Cloudflare tunnel recovered and carried these cloud tests. User-authorized localhost.run fallback attempts failed at SSH handshake and carried no requests.

Follow-up: [2026-11-18 delivery checkpoint](2026-11-18-harness-delivery.md) adds Fly public OCI support and new Harness cloud records. The limits above describe this earlier checkpoint.
