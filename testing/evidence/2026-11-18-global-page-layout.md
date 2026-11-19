# Global Console page layout and real journey

## Changes

Introduced shared page composition in `apps/console/page-layout.css`: one title/action band, removal of decorative platform footers, bounded settings (720px) and configuration/diagnostic surfaces (1040px), retained full-width operational lists. Network configuration no longer stretches both panels to full viewport height. Playground retains independently scrolling desktop columns and stacked mobile content. Tool usage puts the connection name in the page title rather than duplicating an internal heading.

Initialization drops its duplicate title, groups help/copy action, and uses a section label/content grid with 8px property-row gaps and 20px group spacing. Raw configuration and generated code remain available. The main snapshot scroll owns vertical movement, including expanded JSON.

## Browser coverage

Ego-browser TaskSpace 35. Opened 17 routes in English and Chinese: Sessions, Sandbox, LLM, Harnesses, Tools, Playground, Settings, Tokens, Overview, Runs, Pending, protected HTTP, Secrets, Agents, Network, Operations, Fleet. Also reviewed Session Initialization, Fleet detail and Tool usage. Captured desktop, narrow 390×844 and Chinese screenshots; inspected the actual images across the page types. Geometry sweeps found no document overflow or outer page scrolling.

Added reusable `testing/browser/console-layout.mjs`; actual invocation passed all 17 routes at desktop and all 17 at 390px (Chinese), with assertions for title presence, document bounds, heading overlap and content bounds. Private results in `.local/global-layout-review/assertions.json`. This is geometry coverage, not exhaustive validation of every provider/account operation.

Opened Modal, Responses and Lark creation dialogs from their catalogs after the global styling change: footer buttons remained visible; Escape returned to the parent. Previous complete catalog/auth-method review is documented separately in `2026-11-18-integration-onboarding.md`. Opened Tool usage from its list action and verified duplicate heading removal.

Ran `testing/browser/console-scroll.mjs` against populated Sessions using real wheel and keyboard input, with stable header/pagination and refresh position retention. Results in `.local/global-layout-review/scroll.json`.

## Real cloud journey

Used existing configured Vercel Sandbox and SiliconFlow OpenAI connection (no fresh credential registration or SaaS OAuth authorization in this pass). From GUI Playground selected both, kept Pi, entered a task and submitted through the real API. The cloud Run completed with `GLOBAL_LAYOUT_JOURNEY_OK`. Observed result in Session, opened Initialization, expanded generated Python code, switched to TypeScript, and reused the snapshot in Playground; all three infrastructure selectors were prefilled correctly. This verifies code generation/navigation; it is not a new Python/TypeScript runtime acceptance.

Closed the new Session via the GUI and its application-owned confirmation dialog. Private IDs, resource state and Run result are retained in `.local/global-layout-review/live-journey*.json`; no credentials were printed. Existing user configuration remained unchanged.

## Verification

`TEST_DATABASE_URL=postgres://hexagon@127.0.0.1:55432/hexagon npm run verify`: 83 files / 248 tests passed, 32.06s. Log `.local/global-layout-review/verify.log`. Local service restarted with final UI assets. No commit or publish.

Final scroll audit initially caught fractional zoom placing pagination at 926.67px with an innerHeight of 926px. Added a shared 12px bottom inset to page-body. Re-ran actual wheel/keyboard/refresh audit successfully: wheel scrollTop555.56px, keyboard591.67px, pagination bottom914.67px within viewport926px. Final Fleet detail confirmed Sandbox destroyed, runtime stopped, Run completed, and both create/delete operations confirmed. This small CSS correction was browser-verified after the full deterministic suite above.
