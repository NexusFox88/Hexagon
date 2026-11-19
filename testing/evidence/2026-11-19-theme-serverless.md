# Console appearance and provider-wide serverless Sessions

## Scope

User acceptance: a Vercel-style Console must support dark appearance; idle Session wake and retained working state must work beyond E2B. Local refers to the control plane; all provider checks below use real cloud resources. Daytona is excluded.

## Implemented contract

- System / light / dark preferences initialize before rendering, persist locally and react to operating-system appearance changes. Shared semantic colors cover lists, navigation, forms, dialogs, code, status and focus states. Both locales include appearance copy.
- New Sessions expose pinned lifecycle strategy/preservation and effective idle timeout, including in preflight. Submit automatically wakes sleeping Sessions. Close remains terminal.
- Native memory resume: E2B, Freestyle, Instabox. Persistent disk resume: Vercel, Upstash, Boat, Agent37, Fly Machines. Modal snapshots and recreates native compute while preserving Session identity. Blaxel/Sprites use provider-managed automatic standby, explicitly distinct from confirmed compute pause.
- Agent37/Sprites managed files live under persistent home. Runtime restoration retains Harness caches, native conversation identity and workspace files; it skips initial-input reupload and Harness reinstall. A process lock prevents a duplicate Runtime on a warm wake.
- Snapshot intent and identity precede source deletion. Unknown remote outcomes reconcile by exact operation identity, never blind creation retry. Close cleans recorded source/replacement compute and snapshots.

## Deterministic verification

`TEST_DATABASE_URL=postgres://hexagon@127.0.0.1:55432/hexagon npm run verify`

Passed: 99 test files / 311 tests, including TypeScript check, catalog checks, theme persistence/system behavior, pause serialization, Runtime restoration after interrupted preparation, actual temporary-directory removal/relinking for Runtime/Pi/OpenCode/managed-CLI state, duplicate-supervisor prevention, provider-standby recovery before the platform idle timer, active-invocation non-replay, ambiguous snapshot/restore recovery and operation-review routing. The gate creates a unique PostgreSQL schema; development/cloud-journey data is not used as fixture state. Exact log: `.local/theme-serverless-release-verify.log`.

## Actual browser review

Ego browser TaskSpace 48, completed and closed. Reviewed main routes (Sessions, Sandbox, LLM, Harnesses, API Playground, Tools, Settings) in both languages/dark appearance; secondary Settings routes in both languages and both appearances; Session conversation/initialization, Agent and resource-operation views; three provider-create dialogs in both languages; narrow mobile navigation. Verified preference persistence, system light/dark changes, focus return after Escape and no document-level horizontal overflow in the recorded route checks. Light-mode regression was visually inspected. No real credentials were entered during appearance-only form checks.

Private screenshots and route checks: `.local/theme-*.png`, `.local/theme-browser-review.json`, `.local/theme-settings-review.json`. Invalid secondary route probes that redirected to Sessions are not counted as distinct reviewed pages.

## Real cloud acceptance

The live matrix is recorded separately from the deterministic gate. `npm run verify:serverless -- <provider>` uses ready local connections, Pi 1.5.2 and MiniMax-M3. TypeScript uses Messages; Python uses Chat Completions. Each independently creates, submits, polls, waits for automatic idle sleep, submits again without explicit resume, checks successful native `bash` file-read output and prior conversation content, and closes. Private journals retain exact Session/Run/resource IDs under `.local/serverless-acceptance`.

All 11 providers passed the new script: **22 SDK journeys / 44 completed Agent Runs**. Each retained the expected file and conversation content and closed its Session. The earlier same-day Messages-only checks remain separate historical evidence.

| Provider | TypeScript / Messages | Python / Chat Completions | Session cleanup |
| --- | --- | --- | --- |
| e2b | Passed | Passed | Closed |
| freestyle | Passed | Passed | Closed |
| instabox | Passed | Passed | Closed |
| fly-machines | Passed | Passed | Closed |
| vercel | Passed | Passed | Closed |
| upstash | Passed | Passed | Closed |
| boat | Passed | Passed | Closed |
| agent37 | Passed | Passed | Closed |
| modal | Passed | Passed | Closed |
| blaxel | Passed | Passed | Closed |
| sprites | Passed | Passed | Closed |

## Additional recovery checks

Sprites completed both SDK journeys with a 180-second platform idle timeout and a second task submitted after 60 seconds while the Session was still open. In the Python journey, an additional real fault terminated the idle Runtime after the first Run completed and before the second Run existed. The next ordinary SDK submission rebuilt the Runtime, retained the file and native conversation, and completed; no explicit resume was called. Evidence: `.local/serverless-acceptance/sprites-early-idle.json` and `idle-runtime-fault-audit.json`.

Blaxel also passed both SDK early-standby journeys while the Session was still open before the second task. Combined with the main matrix, **26 successful SDK journeys / 52 completed Runs** passed. Both additional provider reports are marked `before_idle_deadline`; no explicit resume was used.

Independent final audits read the persisted native Harness session headers and queried the exact provider resource identities. All 26 successful journeys reused the original native conversation ID and timestamp. All 28 cleanup entries (26 successful journeys plus two failed first attempts) had no remaining compute, recorded checkpoint cleanup, and zero unknown resource operations. Private evidence: `native-history-audit.json` and `cleanup-audit.json` under `.local/serverless-acceptance`.

After acceptance, the temporary Cloudflare ingress was stopped using the existing local management API; it reported `disabled` at 2026-11-19T02:40:59Z. The local Console/control plane remains running. Saved automatic-ingress configuration is unchanged; a subsequent task can prepare credential access on demand.

The complete SDK standby probes observed Sprites warm; they are not evidence of a cold provider transition. Cold state was observed separately in the Runtime-only cloud probe. Blaxel DEPLOYED likewise cannot distinguish active compute from billing standby.

## Failed attempts and limits

- Agent37's initial primitive lost files under `/tmp`; managed persistent-home paths fixed this, followed by successful SDK continuation/file checks.
- Boat rejected unbounded TTL for this trial account. Bounded active TTL plus native snapshots passed later probes; resume refreshes the running deadline.
- Freestyle's first SDK acceptance prompt conflated two UUID-like markers. MiniMax searched for a supposed memory record instead of following the intended fixture; TypeScript continuation assertion failed and Python was cancelled. Both Sessions closed. That attempt remains failed in `freestyle-first-attempt.json`; the revised prompt explicitly separates conversation password and file content.
- A public-events cursor bug in the new acceptance script used `sequence` instead of public `id`; the evidence reader was corrected and tested, including fragmented native output and nonadvancing cursors.
- Blaxel's DEPLOYED API state cannot prove whether compute is actively billed or in standby. Sprites was observed cold with a real idle Runtime in a separate probe. A logical paused Session is never presented as proof of provider billing suspension.
- Modal native snapshots have provider retention limits (default 30 days), not indefinite retention. An unknown snapshot without an image ID remains review-required; the source is not blindly terminated/recreated.
- These journeys validate the shared lifecycle using Pi. They do not establish every Harness/provider/protocol combination, arbitrary-process-memory preservation, multi-day retention, or every provider failure mode.
