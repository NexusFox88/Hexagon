# Product completion implementation and verification — 2026-11-16

Scope: all M0–M6 delivery items in `docs/product-completion-plan.md`. Original `testing/journey-source.md` remains the acceptance source. No commit or publication performed. This record separates implementation verification from independent human usability and external-provider certainty.

## M0 — traceability

`testing/product-completion.md` maps each deliverable and the original journey, including Web project inputs, tools, approvals, previews, artifacts, failure recovery and teardown. Basic chat is not substituted for that journey.

## M1 — deployment and resource recovery

Implemented persisted nonsecret proxy/bypass/ingress configuration, optimistic updates, explicit environment precedence, nonblocking development ingress, retry/stop, hosted-mode requirements, distinct network diagnostics, durable resource-operation backoff/review/audit and accepted-create-handle persistence. Unknown outcomes remain unknown until authoritative evidence is available; acknowledgement does not imply deletion.

Deployment tests (7), resource-operation/lifecycle/expiry tests and full verification passed. Real primary restart retained `api.instabox.sh` bypass and management availability. The browser recorded an operator review and retained its history. New create callbacks persist an accepted provider handle before polling fails; covered by Instabox tests.

Instabox is not declared fixed at the transport level. One late resource was found and deleted (private `failed-network` audit). Two other creates remain unknown: historical Session `147d4b5c-5d25-4ce3-bcff-e5dd95690454` and this-run Session `2d4c680f-412a-4511-8a11-cb87f469fee3`. Current queries found no exact matching resources; absent authoritative operation/nonallocation evidence, both remain closing/needs_review. Their Runs were cancelled. Use Console resource operations to re-query, retain provider evidence, or acknowledge the pending item without declaring cleanup. Resource IDs and operation IDs remain in private evidence for later recovery.

## M2 — configuration journey

Implemented resumable setup navigation, separate saved/validated/enabled/compatible states, validation timestamps/scope, structured credentials, provider credential links, localized field errors and nonsecret drafts. Optional tools can be skipped; credentials and write permissions are not implicitly enabled.

A fresh data directory and database schema on ports 8807–8809 were initialized. Through the GUI: Vercel Sandbox credentials and SiliconFlow model endpoint were saved, validated and enabled; an Agent was created and preflighted; an application token was created and rotated; GUI-generated Python ran through the installed wheel against a real cloud Sandbox and returned `CLEAN_INSTALL_OK`, then explicitly closed the Session. Restart retained ready connections, Agent and secret-store availability. Elapsed wall time was 550.641 seconds, including parallel agent work. This is automated operator evidence, NOT an independent developer usability study.

## M3 — reusable Agents and SDK calling

Implemented immutable Agent revisions, copy/archive, dependency validation and Session pinning; harness catalog/registration; definition-only preflight; separate first-call/reuse/continue examples for Python, TypeScript and HTTP. Generated clients persist private journals, stable idempotency keys and event cursors. Re-execution resumes rather than blindly resubmitting; explicit new-turn and close actions have failure/cancellation semantics.

Actual generated programs executed with installed SDK packages: Python wrote a file in a Vercel/Pi Session and TypeScript read the same file; then the reverse direction ran in another Session. All six program executions exited zero and both Sessions closed. Independent provider inspections found their resources absent. Deterministic tests execute generated Python/TypeScript and curl HTTP clients, covering lost submission replies, stable keys, resume, failed Run exit status, waiting approval, cancellation and pending cleanup. Agent revision/tenant/archive cases passed against PostgreSQL.

## M4 — management and recovery

Implemented overview, paginated/searchable Session and Run lists, deep links, separate resource/runtime states, pending actions, readable Run details, advanced paged events, artifacts and retained last-success state on disconnection. Approval requires viewing the action; unknown external tool outcomes require recorded evidence rather than blind retry.

Browser tests used a dedicated deterministic fixture with no cloud worker: allow and deny approvals, authorization denial after more than 200 events, unknown tool outcome resolution and audit, offline data retention and reconnect. The fixture's resource-operation count remained zero. These are UI simulations, not SaaS account tests. Real cloud Web journeys below exercise actual execution and tool protocol boundaries.

## M5 — integration clarity

Application directory filtering/multiple accounts, OAuth client versus account authorization, permission explanations, connection dependencies, credential lifecycle guidance, provider capability limitations and evidence tags are implemented. Current catalog remains 11 Sandbox adapters and 28 application adapters; Daytona remains excluded from new configurations. Existing live-account evidence is distinguished from contract-only coverage; no new unauthorised SaaS account testing is claimed.

GUI reviewed API-key/model forms, Modal structured credential fields and Slack OAuth client fields. Both-language field validation and retained nonsecret input were checked. Contract/catalog/localization tests passed. Provider capability and credential setup references are in `docs/sandbox-providers.md`.

## M6 — distribution and quality

Implemented doctor/start/configure/status/restart flow, runtime prerequisite and hosted-mode checks, documented backup/upgrade boundaries, application token creation/expiry/rotation/revocation/last-use, modular Console pages and generated-client contract checks. Local SDK tarball/wheel installed and verified in isolated consumers; no package publication.

Commands actually completed:

- `TEST_DATABASE_URL=postgres://hexagon@127.0.0.1:55432/hexagon npm run verify`: type checking and 61 test files / 183 tests passed at 17:43:47, duration 25.57 seconds. Real PostgreSQL schemas were used for database tests. Log: `.local/product-completion-final-tests.log`.
- `npm run verify:packages`: isolated local TypeScript tarball and Python wheel checks passed. Manifest `.local/evidence/sdk-packages.json`; those installed packages were used for the generated-client cloud journeys.
- `npm run verify:startup`: fresh startup/restart and wrong-master-key handling passed; private evidence `.local/startup/hexagon_startup_d6068579c0dc447688e5d58d81a315b1/evidence.json`.
- `npm run local -- doctor`: Node, Python, OpenSSH, cloudflared and database prerequisites passed.
- `ego-browser nodejs < tooling/console-browser-review.mjs`: 15 routes × en/zh-CN × desktop/narrow = 60 page reviews passed. Recipe waits for route and settled content; screenshots and JSON are in `testing/evidence/product-completion/`. Keyboard selectors, application dialog focus/Escape, bilingual invalid fields, offline states and final ingress stop were additionally exercised. Screenshots were visually inspected.

No independent user study or production hosted deployment has been performed. Gate A has direct functional evidence. Gate B engineering checks are delivered; its independent-use claim remains to be validated with a target developer. Backup/restore instructions are documented; this record does not claim a production disaster-recovery drill.

## Full original cloud regression

Both commands used real Sandbox resources and SiliconFlow; each ran both SDKs serially:

```sh
HEXAGON_SANDBOX=boat HEXAGON_HARNESS=opencode HEXAGON_MODEL=siliconflow HEXAGON_WEB_SMOKE=1 HEXAGON_BOTH_SDKS=1 HEXAGON_SERIAL_SDKS=1 node --import tsx tooling/smoke-api.ts
HEXAGON_SANDBOX=vercel HEXAGON_HARNESS=pi HEXAGON_MODEL=siliconflow HEXAGON_WEB_SMOKE=1 HEXAGON_BOTH_SDKS=1 HEXAGON_SERIAL_SDKS=1 node --import tsx tooling/smoke-api.ts
```

- Boat/OpenCode: verified; private `.local/evidence/api-smoke-814b6821-032e-44da-a211-85cda6ff7267.json`.
- Vercel/Pi: verified; private `.local/evidence/api-smoke-e217aace-f514-445c-8ffc-22b4adb3683d.json`.
- Both records confirm product cleanup and independent resource cleanup; no templates created. Coverage retains project input receipts, unchanged eight-assertion acceptance fixture, tool authorization/write approval, preview access boundaries, artifacts, stream resume, follow-up, cancellation and SDK continuation. Original-key isolation checks remained enabled.
- The first Vercel attempt failed while acquiring the temporary credential tunnel before resource allocation (`api-smoke-452271b3-d8a6-436c-afcb-284eb172af8d.json`). The new attempt did not retry an unknown cloud create. Instabox failures and unknown outcomes above remain recorded separately.

## Private evidence and teardown

Private `.local/product-completion/`: `live-evidence.json`, `reverse-live-evidence.json`, journals, `final-resource-audit.json`, `gui-actions-evidence.json`, `failed-network/`, `failed-instabox-repeat/`, `teardown.json`. Fresh-workspace evidence is `.local/product-onboarding-clean/evidence.json` and `restart-token-audit.json`. Do not publish files containing credentials or raw model/tool data.

At 17:50, the primary GUI test application token was revoked and returned HTTP 401 on `/v1/agents`; the clean-workspace token was also revoked and verified. Clean and fixture services were stopped. Primary temporary ingress was stopped through its GUI; authenticated deployment state is `disabled`, while management/Console remains available on 8787. Full smoke jobs closed their own temporary ingress. The user's primary service and reusable Agent remain available; initiating another cloud call requires an explicitly started development ingress or configured stable HTTPS endpoint. All successful test Sessions have confirmed resource cleanup. The two unknown Instabox creates are explicitly excluded from that statement.
