# Console journey navigation correction — 2026-11-16

Trigger: the user reported that feature semantics and navigation were too complex and did not follow their journey. Prior functionality/test completion is not evidence of a coherent user experience.

## Delivered behavior

- Start here uses real health, verified/enabled Sandbox and model connections, nonarchived Agents and completed Runs to propose the next step. Optional tools are not prerequisites; stale wizard position no longer controls the recommendation.
- Five primary destinations: Start here, Agents, Call from your app, Tasks & results, Needs your attention. The existing infrastructure / operations / Agent capability boundaries remain. Platform settings, engine/connection settings and session/resource diagnostics use secondary navigation. Active deep links reveal their group.
- A four-stage contextual path replaces duplicated page-name tabs. Repeated connection-page setup widgets were removed. Connection-row Create Agent carries the selected connection into the draft.
- Saving a new Agent opens its calling page with the saved ID selected. Default examples reuse a saved Agent; one-off Agent creation is an advanced alternative. With no Agent, the page points to Agent creation instead of showing an unusable form.
- Calling links application-token setup, executable example and task results. It explicitly distinguishes code generation from actual execution. Existing open Session rows link to prefilled continuation examples.
- Mobile navigation is application-owned, collapsible and keyboard-operable. It no longer becomes a tall horizontal strip when secondary groups expand. All new copy is in both catalogs.

## Actual verification

- `npm run check`: passed.
- `npx vitest run testing/console-journey.test.ts testing/console-i18n.test.ts testing/console-ui-contract.test.ts testing/console-session-code.test.ts testing/console-http-code.test.ts`: 5 files, 9 tests passed. State policy includes absent/disabled connections, archived Agents and unhealthy control plane; actual generated Python/TypeScript/HTTP client contract tests remain passing.
- `ego-browser nodejs < tooling/console-journey-review.mjs`: final 68 route/language/viewport checks passed (17 routes × en/zh-CN × 1440/390). JSON and screenshots: `testing/evidence/journey-navigation/`. Actual screenshots were reviewed; an initially excessive mobile navigation height was corrected and the review rerun.
- GUI created a disposable Agent with Vercel/Pi and an existing model connection. Save redirected to `#quickstart?agent=...`, selected the same Agent in reuse mode and generated executable source. The disposable Agent was then archived through the API (HTTP 200); its ID is in private `.local/journey-ui-agent.json`.
- GUI clicked Create Agent on an existing Sandbox connection; the resulting draft retained that connection ID. No cloud task was submitted.
- Browser review harness had two corrected selector assumptions (unsupported chained nth selector and waiting for login after hash-only navigation). These were harness errors, not reported as product failures or passed tests.

## Boundaries

No new provider/model cloud acceptance was run for these navigation changes, no temporary ingress was opened, and no new credentials were needed. Prior cloud evidence remains separate. No commits/publication. This verifies navigation and semantic handoff, not independent human usability. Run/Session/resource domain semantics and original full acceptance remain unchanged. The browser was left at the Chinese Start here page for the user.
