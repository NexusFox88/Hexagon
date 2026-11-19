# Console navigation audit — 2026-11-18

Scope: proactive navigation review following repeated misplaced detail-return links. No provider credentials or account configuration changed; no new cloud executions were performed for these UI-only changes.

## Changes
- Shared explicit parent resolver for Session, Tool usage, Fleet, Run, Agent editors, Settings subpages and source-bound Playground.
- Fleet list click now navigates to its detail URL. Refresh retains the selected resource; keyboard activation returns to the list.
- Agent editing/creation has an explicit URL, a single-column editor, and stale-fetch guard. Returning to Agents removes the editor.
- Snapshot Playground returns to Initialization, and no longer repeats its title/source-return link in content.
- Global list search/status survive detail navigation.

## Actual verification
- `npm run check`: passed.
- Targeted navigation and localization tests: 2 files / 6 tests passed.
- Managed ego-browser reviewed all 17 routes in English and Chinese at desktop width, then all 17 routes at 390 × 844. Geometry assertions passed: document does not scroll or overflow, title does not overlap content, content remains within viewport. Local results: `.local/navigation-review/{en,zh-CN,mobile}.json`.
- Fleet: clicked first list row, reloaded detail, activated header return with Enter, observed list. Searched `28295c0a`, entered detail and returned; search retained, one matching row.
- Agent: clicked View/revise, observed route containing Agent ID, returned using header control, observed editor removed. Inspected rendered desktop editor screenshot after removing the unused grid column.
- Session: opened Initialization, clicked reuse-in-Playground, observed shared title and correct parent URL, clicked return and observed Initialization restored.
- Tool: opened DeepWiki usage, verified Chinese header return and tabs, inspected screenshot, clicked return to Tools. The first attempt overlapped a service restart and timed out; reload after restart succeeded.
- Final Session Initialization: visible JSON sidebar, localized header return, document has no vertical scroll. Screenshots inspected locally; screenshots and identifiers remain private.

These checks cover navigation and layout, not a fresh full cloud SDK/provider acceptance run.

Full `TEST_DATABASE_URL=postgres://hexagon@127.0.0.1:55432/hexagon npm run verify`: passed, 84 test files / 250 tests. Full command output is private in `.local/navigation-review/verify.log`.
