# Shared list readability correction

Implemented and browser-reviewed on 2026-11-19. Scope: presentation, localization and keyboard scrolling; no cloud resources created and no commits/publishing.

## Changes

- Shared Provider identity uses 16px contained artwork and 8px text gap. Full provider names have dedicated width. Model protocol assets explicitly map to OpenAI/Anthropic artwork instead of broken image URLs.
- Sessions place explicitly labeled Session lifecycle beside the Session identifier. The Sandbox cell only identifies the provider; it no longer misrepresents Session state as an observed compute state.
- Session and connection lists use content-based column budgets instead of percentage compression. Ordinary rows retain readable text and approximately 64px height. Long model identifiers wrap; Harness name/version have separate bounded lines and full initialization remains reachable in detail.
- Tools authentication and Harness evidence summaries have concise complete localized labels. Evidence details retain their original scope. Harness registered-table columns have explicit protocol/source/action budgets.
- Focused scroll regions explicitly support horizontal arrow keys, in addition to Home/End/PageUp/PageDown. Nested inputs and controls retain their own key behavior.

## Verification

- `TEST_DATABASE_URL=postgres://hexagon@127.0.0.1:55432/hexagon npm run verify`: 94 files / 298 tests passed, 37.75 seconds. `.local/list-readability-verify.log`.
- After the final horizontal keyboard handler: `npm run check` and `npx vitest run testing/console-i18n.test.ts testing/console-journey.test.ts`: passed, 6 tests. `.local/list-final-check.log`.
- First verification attempt without TEST_DATABASE_URL was rejected by the gate; rerun above used the required database environment.
- Actual browser audit: 17 routes × two widths × two languages = 68 geometry checks. Effective viewport widths recorded were 1611 and 433 CSS px (browser zoom means requested 390-device-pixel emulation is not 390 CSS px). Both language artifacts: `.local/list-layout-en.json`, `.local/list-layout-zh.json`.
- Visually inspected Sessions, Sandbox, LLM, Tools and Harness registered lists; corrected additional clipped authentication/evidence labels and missing protocol icons during review. Screenshots remain in `.local/list-final-*.png` and `.local/list-tools-zh.png`.
- Real wheel scrolling: list moved 0→555.56px, refresh preserved position, Home then PageDown reached 331.11px; document remained unscrolled, header and pagination stayed visible.
- At effective 433 CSS px, keyboard horizontal scrolling reached 766.67px with document width equal to viewport width. Session row click opened its actual detail.
- Local service restarted with final assets. Browser TaskSpace 46 finished and closed.

The first horizontal probe timed out; inspection showed the separate browser invocation had reverted to desktop width with no horizontal overflow. Repeating with the narrow viewport set in the same invocation passed. This is recorded separately from product verification.
