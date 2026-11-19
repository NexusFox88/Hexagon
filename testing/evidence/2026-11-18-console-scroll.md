# Console scroll ownership — 2026-11-18

Implemented shared viewport layout in `apps/console/scroll-layout.css` and refresh-position tracking in `scroll-layout.js`. Lists, Session detail, initialization, Playground, Agent editor, catalogs and configuration modals have explicit scroll owners. Run/operation/token renderers expose record containers instead of scrolling the whole page. Catalog search stays outside its scrolling list. Select dropdowns account for their nearest clipping ancestor.

## Actual browser acceptance

Used ego-browser managed TaskSpace 35 against the running local Console and existing persisted data. No connection saved, token created, Run submitted or cloud Sandbox provisioned for this presentation change.

- Session list tested in English and Chinese using `verifyConsoleScroll(page)` from `testing/browser/console-scroll.mjs`: real wheel input, Home, PageDown and Refresh. Chinese list scrolled to 555.56 px and retained exactly 555.56 after refresh; English reached 868.89 and retained 868.89. Document/window remained 926/0. Title top remained 20; sticky table header 93.10; pagination bottom 884.67 stayed within viewport 926. Raw results: `.local/scroll-layout/regression.json`.
- Route sweep covered Sandbox, models, Harnesses, Playground, settings, tokens, overview, runs, pending, protected HTTP APIs, secrets, Agents, network, operations, Fleet, Session conversation and initialization. Wheel input left window at 0, document height equal to viewport and title position unchanged. Existing-data measurements: `.local/scroll-layout/routes.json`. Routes with little content naturally did not overflow.
- Desktop reused-Session Playground: left pane 685 px high / 1283 px content; wheel moved it to 598.33 while right pane stayed at 0. Window remained 0. No request submitted.
- Narrow emulation 390×760 (browser zoom yields CSS viewport 433×844): Session list scrolls internally with pagination outside. Playground becomes one bounded content pane, scrolled 646.67; document remained 844, window 0. Catalog cards scrolled 1960.56 with title visible. After additionally moving search outside the body, short-window catalog confirmed search remains visible while cards scroll 1369.44.
- Short emulation 1280×480 (CSS height 533): expanded Token form scrolls internally; submit remained at y376–412 and record list still reachable at y449–533. No token created.
- Chinese Exa editor at narrow width: body scrolled, footer remained y763–832 in viewport 844. Escape returned focus to Exa. No credential value read or changed.
- Viewed screenshots for narrow Session list, narrow catalog, narrow Playground, short catalog and Chinese editor. Images and route metrics stay in `.local/scroll-layout/` (local evidence).

## Commands

- `TEST_DATABASE_URL=postgres://hexagon@127.0.0.1:55432/hexagon npm run verify`: 80 files / 241 tests passed, 31.24s. Covers shared layout implementation and dropdown clipping update; the subsequent catalog-filter placement and selected-turn scroll preservation were checked with the final checks below and the browser.
- Final `npm run check`: passed.
- Final `npx vitest run testing/console-i18n.test.ts testing/console-journey.test.ts`: 2 files / 5 tests passed.
- Final managed-browser regression helper: English and Chinese passed after the catalog/scroll restoration refinements.

Deterministic tests are not claimed as cloud-provider execution. This acceptance concerns Console presentation and interaction. Mandatory future layout checks are recorded in `docs/console-design.md`; the exported browser helper requires a populated local Session list and a managed browser Page.
