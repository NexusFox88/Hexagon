# Session activity, automatic wake and Console acceptance

Verified on 2026-11-19. Local control plane; real execution in cloud E2B sandboxes. No commits or publishing.

## Delivered behavior

- Playground is the first navigation item. Missing Sandbox, model, Harness and optional tools have contextual configuration links opening a separate tab; returning refreshes changed configuration without discarding the draft.
- Harness templates use compact cards and official Hermes/OpenClaw image assets. Provider names/icons are shared across Sandbox, Tools and Session lists. Execution status colors are semantic, and the column is called Harness.
- Session dashboard exposes current active, idle and sleeping counts plus rolling 24-hour/7-day activity. Active counts include queued tasks; historical buckets count distinct Sessions with overlapping Runs, not merely Session creation.
- Sleeping Sessions accept durable task submissions. Workers reconcile and wake the same workspace before running the task. Explicit close remains terminal. An existing nonterminal Run still prevents a second concurrent Run on that Session.
- E2B supports native idle sleep and automatic wake with preserved workspace/process state. Default idle timeout is 60 seconds, configurable through Session resources; effective idle timeout is bounded by the running resource timeout. Uncertain provider outcomes reconcile before retrying.
- Other providers retain compute and are explicitly identified as retained mode. Universal provider-level serverless compute is **not** delivered by this change. Client disconnect does not cancel accepted work; existing running-resource timeouts remain applicable.

## Deterministic verification

`npm run verify`: passed TypeScript checks and 94 test files / 298 tests in the final run (34.77 seconds). Local raw output: `.local/session-final-verify.log`.

Regression coverage includes tenant isolation, busy-session pause rejection, logical versus native sleep, lost remote responses, reconciliation without blind repeat, idle sweep, sleeping task acceptance, worker wake, terminal close, activity queries, and Python/TypeScript SDK interoperability.

## Real cloud verification

1. E2B lifecycle primitive: create file/background process, native pause/resume through TypeScript and Python SDKs, confirm preservation, destroy. Passed; cleanup confirmed.
2. E2B + Pi 1.5.2 + MiniMax-M3 (Anthropic protocol), TypeScript: complete first message, automatically sleep at the test's 15-second idle threshold, submit another message without resume, automatically wake, recall previous-turn passphrase, close. Passed.
3. Same complete journey through Python. Passed.

Private local evidence retains exact Session/Run/resource identifiers for cleanup and diagnosis: `.local/session-pause-cloud.json`, `.local/serverless-cloud.json`, associated logs and scripts. Both model journeys recorded closed resources. These results do not establish the full Sandbox × Harness × model-protocol matrix.

## Browser acceptance

Actual Ego browser review covered 17 routes at desktop and 390px widths in both English and Simplified Chinese (68 geometry checks). Reviewed template branding and density, Provider cells, activity dashboard, lifecycle controls, and blank-workspace setup guidance.

- Real list wheel scrolling preserved fixed page title/header and visible pagination; refresh retained the list position.
- Home/PageDown on the focused list worked after fixing shared scroll-region keyboard handling; document remained unscrolled. Evidence: `.local/session-scroll-audit.json`.
- Blank-workspace Playground offered all four contextual setup links; opening Sandbox produced a real separate tab while preserving the Playground draft.
- Chinese manual sleep/wake confirmations were exercised on an isolated no-cloud fixture, then the fixture was closed.
- Temporary blank-workspace server was terminated cleanly (exit 0); its isolated schema cleanup ran. Browser TaskSpace was closed.

Screenshots and geometry artifacts remain private in `.local/`, including `harness-final.png`, `session-dashboard-zh.png`, `providers-tools-en.png`, `providers-sandboxes-zh.png` and `session-layout-audit.json`.

## Local delivery

Restarted the normal local service successfully. Console: `http://127.0.0.1:8787/console/`. At restart, credential access reported not configured with idle recovery; real cloud acceptance above used the dedicated test setup. Do not interpret service startup alone as a new post-restart cloud execution test.
