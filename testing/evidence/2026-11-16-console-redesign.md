# Vercel-style Console and separated configuration

Implemented the user's three UI requirements on 2026-11-16. Read-only reference inspection used Vercel's actual logged-in Dashboard and official Geist design system. The Console uses grayscale surfaces, neutral borders, compact navigation/actions, self-hosted Geist typography (SIL OFL included), custom settings dialogs, dropdowns, action menus, notifications and inline validation.

## Scope and configuration semantics

Platform navigation contains Sandbox connections and Sandbox Fleet. Agent navigation contains Tools, Protected APIs and Model endpoints. Workspace Secrets remain separately managed shared credential resources. Each connection list filters to its own kind, and new connections inherit that kind without a generic use-case picker. Existing backend APIs, tenant checks, Secret references and cloud execution behavior are retained.

The product-owned UI contains no native select/dialog/datalist or number/date/color picker. All forms disable browser validation bubbles and render errors through the application. The new contract test checks against browser-native dialogs, selectors and pickers. Semantic buttons and text inputs retain their browser accessibility behavior with custom styling. Browser chrome and operating-system permission UI are outside the product surface.

## Observed browser acceptance

- Existing local owner token used without printing it; UI clears the login field after connecting.
- Sandbox view showed only `My Sandbox`; Tools initially showed an empty list. Protected API and Model views independently showed `My HTTP` and `My Model` after navigation completed.
- Created disposable Modal Sandbox configuration through the custom provider dropdown using Home / ArrowDown / Enter. This saved only a draft connection, not a cloud resource. Empty-name and invalid numeric input produced application-rendered errors.
- Created a disposable Tool through the separate Tool page. Its provider list contained only HTTP JSON Tool, with no Sandbox options.
- Created a disposable Secret with a noncredential fixture value, selected it in the Tool's custom credential dropdown, saved the reference, and observed the direct credential input disabled. Secret rotation subsequently advanced the version to v2.
- Exercised status filtering: attention-only Sandbox list showed the draft and excluded the user's enabled connection.
- Destructive confirmation: Tab wrapped from the last to first control; background was inert; Escape cancelled without deleting and restored focus to the originating action-menu button. Explicit confirmation then deleted the disposable Tool. Deleted the disposable Secret and draft Sandbox after verifying they were no longer referenced.
- Independent API read confirmed no `UI acceptance` records remain; exactly the original three Connections and two Secrets remain.
- Fleet showed existing closed cloud Sessions and completed Runs. Custom Run dropdown selected an existing Run, Escape dismissed it, and retained output/events rendered. No new Agent execution or cloud allocation was needed for this UI task.
- Narrow viewport inspection used a requested 390 px emulation; the browser's existing zoom reported 433 CSS px. Navigation and tables scroll within their containers. A fixed action menu stayed within the viewport and its hit target was correct. Nested Escape first closed the provider dropdown while keeping the dialog open, then closed the dialog and restored focus to Add Sandbox.
- Final DOM audit: zero native selectors/dialogs/number/date/color inputs; all forms have `noValidate`; self-hosted Geist reports loaded.

Browser QA caught and fixed a sticky form footer intercepting credential controls, and inline action-menu buttons overflowing horizontally. Dialog body now scrolls independently; credential dropdowns can open upward; action menus use viewport-bounded fixed positioning so narrow table scroll containers do not clip them. Pending refreshes are queued so saving during a background refresh does not leave stale lists.

## Verification and artifacts

- Final full regression: **46 files / 124 tests passed**. Log: `.local/evidence/console-redesign-regression-final.log`.
- TypeScript check and JavaScript syntax checks passed.
- Initial full run failed one assertion that still expected the removed generic navigation label. The assertion now checks the distinct Sandbox and Tool navigation entries; all API/security assertions remain intact. Final full rerun passed.
- Screenshots: `.local/evidence/console-redesign-desktop.png`, `.local/evidence/console-redesign-mobile.png`, `.local/evidence/console-redesign-dropdown.png`.
- Durable UI contract: `docs/console-design.md`; project instructions updated in `AGENTS.md`.

Local Console remains available at http://127.0.0.1:8787/console/. Existing credentials and manual SDK configuration are preserved. No commit or publishing performed. No new provider-matrix claim is made by these UI checks.
