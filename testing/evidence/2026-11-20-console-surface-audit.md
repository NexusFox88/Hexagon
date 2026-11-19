# Console surface and long-value review

User requested a Console-wide typography/alignment/overflow review and single-line long values with copy. The initial literal `[]` copy affordance and adjacent ellipsis button were explicitly rejected and replaced by a standard outline copy icon. The current reference is `console-surface-audit/final-copy-icons.png`; earlier audit images intentionally retain the intermediate state.

## Changes

- Shared table/record typography and modal/select/menu type hierarchy; complete action labels and credential states receive adequate column width.
- `list-values.js` retains complete supplied strings. CSS ellipsis controls display; original links and edit buttons retain their listeners. Plain long labels support pointer/Enter/Space full-value viewing. A single outline copy icon copies the complete value and briefly changes to a check. Clipboard failure opens a localized selectable-text fallback. Original resource IDs and OCI references/digests are no longer shortened destructively in the affected list renderers.
- Select triggers use bounded labels; options/action menus grow to fit labels. Menu height calculation now intersects clipping-ancestor bounds with viewport bounds.
- Mobile preferences use a viewport-bounded panel. Expanded mobile navigation has a fixed identity row, independently scrolling navigation and a settings row; navigation no longer overlaps the brand.
- Table scroll anchoring is disabled because explicit refresh-position restoration owns scrolling. Session metadata remains on one line.
- Original theme palette, brand/provider assets, existing loading artwork/animations, routes and resource operations are preserved. No cloud resources created, no forms saved, no commits or publication.

## Executed checks

- `npm run check`: exit 0.
- `npm test -- testing/console-i18n.test.ts testing/console-ui-contract.test.ts testing/console-theme.test.ts testing/console-navigation.test.ts testing/console-release.test.ts testing/console-playground.test.ts testing/console-markdown.test.ts`: 7 files, 16 tests passed. The focused i18n/control suite also passed after the dropdown-boundary fix.
- Managed local restart loaded each reviewed release; final restart succeeded.
- `testing/browser/console-surface-audit.mjs`: 840 recorded surface states, English/Chinese × 1440/390 width at 640 height. Traversed all 17 exported top-level routes, all 53 Sandbox/model/Tool catalog form variants, advanced disclosures, 316 dropdown states, Secret and Harness creation dialogs. Assertions cover document overflow, panel/footer containment and dropdown viewport containment. Form-control horizontal bounds were additionally checked against panels. Real credentials were not entered.
- `testing/browser/console-menu-audit.mjs`: final rerun passed 148 dark-mode route/menu/dropdown/detail/recipe/confirmation checks across both languages and widths. Confirmations were cancelled. Existing account data only.
- Session Conversation/Initialization: 8 locale/width checks, no document overflow. Agent editor: 4 locale/width checks. HTTP editor, token creation disclosure and language/theme preferences inspected without saving.
- `testing/browser/console-copy.mjs`: actual clipboard write of the complete rendered resource value; simulated NotAllowedError verified localized fallback, exact text selection and focus restoration. Repeated successfully after the copy icon and localization corrections. The simulated failure is separate from the actual successful clipboard write.
- `testing/browser/console-scroll.mjs`: real wheel and keyboard input. Scroll 0→500; refresh remained 500; Home/PageDown reached 371. Document stayed viewport-sized; heading/header/pagination remained pinned.
- Final mobile preferences checks in both languages: panel top 64/bottom 429 within 640px; navigation begins at 52px, matching the brand row bottom. Final credential labels: 18px height/18px line height and no horizontal overflow.
- Visual inspection: all desktop route contact sheets and all 53 form-family contact sheets; representative full-size English/Chinese, light/dark, narrow dialogs/dropdowns, Session initialization, mobile preferences and final copy icons.

## Failures found and corrected

- Playground dropdown initially extended to y=661 in a 640px viewport: corrected the shared viewport intersection and reran the menu audit successfully.
- Refresh position initially jumped after long-value decoration: disabled browser anchoring for table regions; real input/refresh check then passed at exactly 500px.
- Mobile preferences initially extended above the viewport, and expanded navigation could overlap the brand: fixed bounded preferences and mobile rail row ownership; final geometry and screenshots confirm containment.
- Copy check initially asserted before the asynchronous clipboard write / requestAnimationFrame focus completed. The browser check now waits for the observable completion/selection; final checks passed.

## Evidence and limits

JSON and screenshots are under `testing/evidence/console-surface-audit/`: `results.json`, `extra-results.json`, `copy.json`, `scroll.json`, `details.json`, `agent-editor.json`, `preferences.json`, `final-geometry.json`. Earlier surface screenshots predate the final icon/sidebar/credential refinements; use `final-copy-icons.png` and `mobile-final-*.png` for the final appearance. The final refinements received focused rechecks rather than repeating every unchanged provider form.

This is local presentation/control acceptance, not provider authorization, cloud execution or hosted sign-in acceptance. The pre-existing HTTP provider image lookup failure is not altered; preserving provider artwork remains outside these layout fixes.
