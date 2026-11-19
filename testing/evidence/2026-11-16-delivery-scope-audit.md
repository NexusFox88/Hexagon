# Delivery scope audit and installed SDK application coverage

The original 181-line user-supplied journey was reread. Its requirements remain the authority; a passing subset does not replace it. The user subsequently deferred Daytona and waived live-account validation for breadth-first SaaS expansion. Those are explicit scope constraints, not failed tests relabeled as success.

## Requirement mapping

| Original requirement | Evidence inspected and current verification |
|---|---|
| 1. Local initialization, health, durable restart | `2026-11-15-startup-restart.md`: fresh isolated schema/data, documented migrations/start, unchanged owner/key and decryptable connection after restart; `2026-11-16-local-journey.md`: unified local CLI and actual GUI/SDK walkthrough |
| 2–3. GUI Sandbox and authenticated requirements Tool onboarding | `2026-11-15-gui-initialization.md`: actual credential form save/verify/enable and subsequent authenticated requirement read; `2026-11-15-tool-verification-identity.md`: bounded account/scope display |
| 4–5. Capabilities, compatibility rejection and pinned Session | `testing/execution-preflight.test.ts`, `modules/execution/sessions.ts`; current database regression and retained Session definitions |
| 6–8. Upload, idempotency, provisioning, actual edits/tests | Current-code Instabox/Pi independent Python and TypeScript journeys; immutable test source independently rerun, eight assertions each; earlier MiniMax and other Harness/provider records retained |
| 9. GUI interactive private preview | GUI initialization records actual keyword/status/empty-state interactions; fresh cloud journey independently verifies preview content/authentication and availability after Run completion |
| 10–11. Runtime GUI authorization and SDK approval | GUI initialization and independent Python GUI journey; fresh dual SDK record verifies API-driven wait/resume and zero writes before/one after approval |
| 12. Final reply, artifacts, events and later queries | Current retained-state audit of 35 selected dual SDK journeys / 70 primary Runs; current-code fresh journey separately proves event replay and retention through public SDKs |
| Disconnected event stream; follow-up; bidirectional SDK use | Fresh dual SDK journey plus installed-package HTTP interoperability test; cancellation and closing remain explicit operations |
| Branch A: credential/config lifecycle | GUI connection-lifecycle evidence plus refusal/expiry/reauthentication records; current deterministic tests for version binding, disabled scheduling and dependent-resource deletion |
| Branch B: combinations and custom package | Current registry has 12 providers; 11 non-deferred targets each have OpenCode, Pi and example custom Harness dual SDK records. E2B also has two MiniMax combinations. Daytona's three rows remain open |
| Branch C: interruption and recovery | Fault branch audit links actual worker SIGKILL, Runtime SIGSTOP/SIGKILL, active process cancellation and remote create/delete uncertainty; Instabox P0 adds provider-specific recovery. Current deterministic worker/cleanup regressions passed |
| Branch D: identity/network/preview isolation | Public HTTP tenant test covers 21 operations plus cross-resource bindings; E2B API-to-cloud network probe compares allowed/denied destinations; natural preview expiry checks server rejection of old cookie/ticket; unknown states remain explicit |
| Six resource-teardown requirements | Full journeys check retained artifacts/results, provider absence, preview denial, Fleet cleanup and connection dependency removal. Latest separate Instabox audit reconciled 22 exact operations / 21 resources across 15 completed journals |
| Conditional pause/resume/snapshot/desktop features | Not advertised by the current adapters; no implementation/acceptance claim inferred from the conditional source language |
| No commits/publication | Work remains local. Local npm tarball/wheel creation is packaging, not registry publication |

Illustrative JSON, directory layout, example reply and follow-up wording in the source are examples. Their behavioral requirements are covered by the actual public API/SDK structure and fixture; this audit does not claim those examples are literal wire schemas.

## Current complete selection

Derived `.local/evidence/current-acceptance-selection.json` from verified journals with both SDK Runs, previews and cleanup, selecting the latest available record per tested model/provider/Harness combination. There are **35 selected combinations / 70 primary Runs**, covering 11 non-deferred Sandbox integration targets. Legacy Pi/MiniMax journal `api-smoke-e456265b-d7a8-4006-813c-8d209f9ff7ac` omitted endpoint metadata; its retained model connection was queried and confirmed `https://api.minimaxi.com/anthropic` rather than inferring the model from absence of metadata.

`tooling/audit-retained-journeys.ts` passed for all selected records: completed replies, closed Sessions, required artifacts, exact byte lengths and hashes, eight-assertion reports, single completion events and no unresolved resource operations. This is a current retained-data check, not 35 newly executed cloud journeys or a fresh inventory of every provider account. The fresh current-code cloud run and exact Instabox absence audit are in `2026-11-16-current-dual-sdk-journey.md`.

## Installed SDK gap closed

The existing package-consumer test did not exercise the new application/OAuth methods. Extended `testing/sdk-interoperability.test.ts` to use actual public HTTP routes with isolated PostgreSQL state:

- Both installed SDKs discover all 28 apps; Trello structured credential metadata is available.
- TypeScript configures a dummy Notion OAuth client and starts a consent transaction; Python observes and cancels it.
- Python configures a dummy Google Calendar client and starts a PKCE transaction; TypeScript observes and cancels it.
- Client secrets are absent from public catalogs. Existing Session/environment/secret/interoperability and authorization-refusal checks still run.
- No authorization URL is opened, no authorization code is exchanged and no provider API is contacted by these additions.

Executed `TEST_DATABASE_URL=postgres://hexagon@127.0.0.1:55432/hexagon node --import tsx tooling/verify-sdk-packages.ts`: built npm tarball and Python wheel, installed them into isolated local consumers, and passed both test files. `npm run check` also passed. Artifact hashes and temporary consumer paths are retained in `.local/evidence/sdk-packages.json`.

## Outstanding scope

Daytona's registered combinations remain incomplete and explicitly deferred. No request to change billing, network tier or credentials has been inferred. This audit does not mark the overall full-combination objective complete.

The 28-application expansion is implemented with local checks; Exa/Tavily/DeepL retain real cloud dual-SDK evidence, while other live-account tests are waived by the user's later instruction. Feishu/Lark, generic remote MCP, merged multi-service OAuth accounts and deeper per-provider API coverage remain unimplemented extensions; they are not advertised as delivered capabilities and are not silently substituted for the original acceptance journey.
