# Console interaction audit and DeepSeek Harness — 2026-11-18

## Browser coverage

Actual Ego browser operations against the local Console, with user configuration preserved:

- 19 route entries × English/Chinese × 1440/768/390px = 114 rendered-page layout checks. Routes: Sessions, Infrastructure, Sandbox, Models, Harnesses, API Playground, Tools, Settings, Tokens, Network, Secrets, Protected APIs, Agents, Resource operations, Overview, Setup, Runs, Pending and Fleet. Private measurements: `.local/ui-audit/pages-after.json`. No whole-document horizontal overflow after the fix.
- 11 Sandbox provider forms, the model form and all 29 Tool catalog choices × both locales = 82 narrow-screen form checks. Expanded provider/permission disclosures, footer visibility and Tab focus containment; no credential submissions. Private measurements: `.local/ui-audit/forms.json`.
- Actual wheel scrolling and keyboard End in the catalog were verified in the preceding scroll correction; this audit additionally checked table keyboard scrolling and menu hit testing after horizontal scrolling.
- At 768×600 the connection action menu's five actions were inside the viewport and actual hit targets. Opening Delete displayed confirmation with Cancel focused. Escape cancelled without deleting anything.
- Secret editor at 390×600 retained its footer within the viewport. Harness editor with advanced fields expanded at 390×600 retained its footer; submitting an empty image focused and revealed the localized error. Select End/Tab closed the popup and focused the next command field.

## Defects corrected

1. Table min-width expanded whole pages at tablet widths. `.table-wrap` now owns horizontal overflow; table regions and page code blocks are keyboard-focusable labeled regions.
2. Closing a select or action menu with Tab left focus on a hidden option. Focus returns to the trigger before default Tab navigation.
3. Playground selections rebuilt the form and discarded focus to BODY. The select restores focus to the replacement control with the same ID after change handlers run.
4. A moved/reconnected custom select lost its outside-pointer handler. Reconnection restores that listener.
5. Confirmation default focus now explicitly goes to Cancel.
6. Harness registration errors could be above the visible body. Error feedback now receives focus and scrolls into view; Harness code regions are focusable.
7. Mobile navigation now dismisses with Escape and returns focus to its toggle. Long page titles wrap; contextual actions wrap within available width.
8. Vitest unintentionally discovered upstream reference-source tests under `.local`. Its normal default exclusions now also exclude `.local/**`; product tests remain unchanged.

## DeepSeek Harness

Official sources consulted: https://github.com/deepseek-ai/deepseek-harness and its `docs/cli-help.md`, headless JSON event implementation, base profile, model and MCP configuration. Pinned npm release: `@deepseek-ai/dsh@0.2.2-rc.1` (release candidate).

Added `deepseek-v1` to the OCI registration API, TS SDK type, Console selector and catalog. The OCI recipe runs the official dsh CLI; the adapter uses headless JSON final records, resumes the native Session ID, supplies configured Messages endpoint/scoped grant, and connects assigned tools through the existing Python MCP bridge. Upstream telemetry and session-log upload are disabled.

Actual command: `npx tsx tooling/build-harness-images.ts deepseek`. Build succeeded using Node 24.11.1 bookworm. Earlier slim-image attempts failed on Debian mirror 502 / absent certificate bundle; failed logs remain private. The final full base already includes Runtime prerequisites.

Actual command: `npx tsx tooling/smoke-harness-images.ts deepseek`. Passed actual container program execution, second-turn same-Session continuation, real MCP stdio negotiation/tool call through `runtime/tool_bridge.py` to a deterministic mailbox, and container cleanup. Model responses and mailbox completion are fixtures; **not a real cloud/DeepSeek account acceptance**. Evidence: `.local/oci-harness/fixture-results-deepseek.json`, `deepseek-continuation.log`.

No image published. The catalog labels DeepSeek as a build recipe, not a ready published/cloud-verified image. Templates now include DeepSeek, OpenCode, Aider, Pi, Claude Code and Python Agent. Native OCI cloud support remains Modal.

## Automated verification

`TEST_DATABASE_URL=postgres://hexagon@127.0.0.1:55432/hexagon npm run verify`: 73 files, 215 tests passed. `.local/ui-audit/verify-final.log`.
Targeted adapter/localization rerun: 12 tests passed. `.local/ui-audit/targeted-final.log`.
Later small keyboard changes are verified in the browser and final check output, rather than counted as additional cloud acceptance.

## Live user journey

Used Console to select Modal OCI, the existing model endpoint and registered OpenCode OCI, enter an exact-reply prompt and send through API Playground. The first attempt failed during credential-channel preflight, before creating a Sandbox. The Console showed the localized retryable failure and restored controls. One UI retry completed on real Modal with OpenCode and the configured model, returning `UI_AUDIT_JOURNEY_OK`. A transient Runtime disconnect was reconciled and the same Run resumed; no duplicate Run was created. Closing the Session through the Console confirmation destroyed its Sandbox. Private resource IDs and results are retained in `.local/ui-audit/live-journey.json` and `live-session.json`. No credential or user resource was overwritten.

## Final browser regression

- 14 Harness detail/template dialogs (details plus six recipes in both locales) checked at 390×600; content remained scrollable and footers visible.
- Completed Session refresh previously cleared the conversation while awaiting each turn. Rendering now stages the full conversation before one replacement; completed detail views stop automatic polling.
- Final manual Refresh observed one content mutation and **zero empty conversation frames**, with `UI_AUDIT_JOURNEY_OK` retained and `data-live=false`.
- Playground selection retained focus on its replacement Sandbox trigger; mobile Escape closed navigation and focused its toggle. Private evidence: `.local/ui-audit/final-interaction.json`.
- Visually inspected `.local/ui-audit/live-result-final.png`: user message on the right, Agent response on the left, completed status and closed workspace remain readable.
