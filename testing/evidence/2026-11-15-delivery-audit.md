# End-user journey delivery audit

Updated after the full provider expansion and final source audit. The original main journey and four defined fault/permission/connection/combination branches have evidence. Ten non-deferred sandbox integration targets have all three current Harnesses through both SDKs. The final audit found and fixed the Tool account/scope GUI omission; see [identity evidence](2026-11-15-tool-verification-identity.md).

Full overall completion is still not claimed: the Blaxel concurrency re-audit reproduced and fixed a 409 allocation race; focused concurrent calls and overlapping Pi/custom dual-SDK journeys now pass, with independent resource cleanup evidence. However, Daytona's registered combinations have not passed and are explicitly deferred by the user. Boat's updated key cleared its historical billing blocker. Its Connector, GUI CRUD, Runtime, managed purge and all three Harness dual-SDK journeys now pass; OpenCode and Pi were rerun serially under the current trial concurrency limit. No unverified target is marked passed.

## Source-to-evidence mapping

| Source requirement | Evidence inspected / current implementation |
| --- | --- |
| 1. Local startup, health and restart persistence | startup-restart evidence and original verified JSON; README commands and main.ts initialization/health/worker wiring |
| 2. GUI Sandbox credential onboarding | gui-initialization; connection-lifecycle-gui; actual E2B account verification, masked credential and explicit enablement |
| 3. GUI authenticated requirements Tool | gui-initialization and real task requirement read; final tool-verification-identity fix and actual GUI account/scope display |
| 4–5. Discover/select/pin compatible execution | execution-preflight API tests, Session definition fields and execution-combinations docs |
| 6. Upload/idempotency and exact workspace input | input-delivery real hashes and durable receipt; SDK/public Run tests |
| 7–8. Cloud runtime/Harness preparation and actual implementation | GUI initialization/Python GUI journeys, actual fixed tests and independent reruns |
| 9. User-operated private preview | GUI initialization browser filter interaction, preview-natural-expiry and tenant/proxy boundary tests |
| 10. Missing Tool authorization and continuation | separate TypeScript/Python GUI journeys, reauthentication and authorization-denial evidence |
| 11. Caller approval and actual report write | both SDK real tasks, controlled report service counts before/after approval |
| 12. Final answer/state/events/artifacts | actual cloud journals and current retained database audit below |
| Disconnect and current-Session follow-up | both real SDK journeys, cursor replay and bidirectional language continuation |
| Python and TypeScript client delivery | sdk-packages installed npm/wheel public API regression; separate full cloud client evidence |
| A. Connection lifecycle / Tool credentials | connection-lifecycle-gui plus API cloud lifecycle; denial/expiry/reauthentication |
| B. Alternate Harness/custom package | 32 verified model/Harness/provider rows across 10 integration targets, with both SDKs; Daytona remains explicitly deferred |
| C. Interruption/cancel/recovery | fault-branch-audit and active-cloud-cancellation, including fixed detached-child defect |
| D. Tenant/network/preview/unknown state | tenant-boundaries actual HTTP test, network-api real cloud probes, preview-natural-expiry and Fleet fault browser evidence |
| Six teardown requirements | real close/retention/provider-absence/preview-denial/Fleet/dependency-deletion evidence; current journal cleanup scan found no unresolved cleanup markers |

Named illustrative JSON and suggested directory layout in the source are examples, not exact wire-format mandates. Actual SDK methods and output schema are documented. The HTTP JSON Tool adapter is the credential Tool included in the declared support scope; optional EXA/Tavily/DeepL credentials were made available, not mandated as three additional provider integrations. Current adapters do not advertise pause/resume/snapshot creation/desktop streaming, so conditional tests for those capabilities do not establish or imply support.

## Current retained-state verification

A fresh selection was derived from actual verified dual-SDK Web-task journals, not from the matrix's pass labels. The selection covers 30 SiliconFlow combinations (10 integration targets × 3 Harnesses), plus the original MiniMax OpenCode and Pi combinations on E2B. Every selected journal reports both previews and confirmed cleanup. Pi's older MiniMax journal predates its explicit model metadata field; its direct execution record identifies MiniMax, and it is not inferred from an absent field alone.

`tooling/audit-retained-journeys.ts` was run against all **32 selected journeys / 64 primary Runs** and passed. For each primary Run it checks the current PostgreSQL completed state, nonempty final reply, closed Session, required implementation/test artifacts, byte lengths, SHA-256 hashes, the fixed 8-assertion report, exactly one completion event and no unresolved resource operation. Private `.local/evidence/final-acceptance-selection.json` records the exact selected journals; `.local/evidence/retained-journey-audit.json` records current hashes and counts. This audit is distinct from and does not replace the previously executed cloud/GUI/authorization/fault scenarios linked above.

The final Fly-specific independent provider audit checked all **20 exact test-owned App IDs**, including failed attempts; all returned 404. Other providers retain their individual provider-absence and associated-resource evidence; this audit did not claim a new whole-account inventory for every provider. Intentionally retained local evidence schemas, packaged SDK artifacts, E2B manual template and shared Modal App/image caches are documented fixtures, not orphan running sandboxes.

## Live delivery and remaining boundary

The local Console returns 200; authenticated API health reports API/database/credential/worker ready. The actual local Tools service returns account/scope from /auth/check and ACCEPTANCE-001 from /requirements with the private fixture credential. Anonymous access is rejected. The GUI-first manual journey guide identifies the current addresses, credential sources, provider-specific fields, approval step, download path and cleanup procedure. The service runs the latest Tool metadata fix and Boat Connector and Blaxel preview conflict fix as PID 35497.

The latest full deterministic suite passed **38 files / 111 tests**, with TypeScript and Console syntax checks passing. Both locally packaged SDKs have their separate installed-consumer verification record. No commits, package publication or project deployment were performed.

Daytona needs an authorized model endpoint reachable from its organization before its three Harness rows can be accepted; the user asked to defer that work. Boat now allocates successfully and all three Harness rows have passed both SDKs. Its read-only-confirmed trial limit is two concurrent Sandboxes; serial combination execution respects that limit. Daytona remains outstanding, and no payment/network-tier change was attempted. The current audit turn made concrete progress (full retained-matrix verification and a product requirement fix), so it is not a no-progress/blocked turn.


## Updated external condition (12:03 UTC)

The user supplied an updated Boat API key and requested a retest. Real creation, commands, binary files, protected HTTP/auth and deletion now pass; see [Boat retest](2026-11-15-boat.md). The earlier billing blocker is historical. Boat Connector/GUI/Runtime/full SDK integration is now actionable remaining work, not an external impasse. Daytona remains user-deferred. This does not mark the overall objective complete.


The selected Blaxel Pi/custom records now use the fresh concurrent passing journeys. Independent full retained audit remains 32 unique combinations / 64 primary Runs. Provider audit separately confirmed all eight exact resources and preview collections from the concurrency investigation absent. Historical 502 failures are not reclassified or assigned an unproven cause.
