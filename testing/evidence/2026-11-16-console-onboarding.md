# Console configuration and onboarding — 2026-11-16

Scope: user selected Console configuration/onboarding improvements. UI-only changes; no new provider capability, SaaS account authorization or cloud execution acceptance is claimed.

## Changes

- Collapsible configuration guide with real verified-and-enabled counts and separate navigation to platform Sandboxes, model endpoints and optional Agent Tools. Initially compact when required categories already have ready connections.
- Per-connection next-step guidance and prioritized configure/verify/enable/SDK action. Needs-setup count includes disabled connections.
- Provider/application menu filtering, localized empty results and kind-specific connection name placeholders. Filtering does not mutate selection or clear draft fields.
- Application-owned SDK binding dialog with Python/TypeScript fragments for all four connection kinds, public IDs only, required placeholders, Session preflight, Tool declaration guidance and not-ready warning. These are explicitly configuration fragments, not standalone programs.
- Complete English/Simplified Chinese messages, including SDK selector accessible name.

## Actual checks

- `npx vitest run testing/console-i18n.test.ts testing/console-ui-contract.test.ts`: **2 files / 5 tests passed**, last run 15:10:49 Asia/Shanghai. Catalog parity, message references, localization helpers and native-UI prohibition checked.
- `npm run check`: passed.
- `node --check apps/console/app.js` and `node --check apps/console/components.js`: passed.
- Eight actual GUI-generated fragments saved privately in `.local/evidence/console-sdk-snippets.json`. Four Python fragments parsed with `ast.parse`, and their selected connection binding fields checked. Four TypeScript fragments type-checked against the real SDK via `npx tsc --noEmit --target es2022 --module nodenext --moduleResolution nodenext --skipLibCheck .local/evidence/console-snippet-*.mts`: passed. Fragments were not executed against cloud resources.

## Browser observations

Ego task space 21, actual local service at `http://127.0.0.1:8787/console/`:

- English and Chinese guide, real 2 Sandbox / 1 model / 3 Tool counts, expansion/collapse and scoped navigation reviewed.
- Trello found with search + ArrowDown + Enter. Searching an absent provider showed localized empty-result guidance while preserving Trello, the name and a dummy unsaved credential. Locale change also preserved the draft. No dummy credential was saved.
- Escape first closed the filtered selector while keeping the editor open; a second Escape closed the editor.
- A credential-free Trello draft named `Console onboarding draft 20261116` was created through the GUI. It showed Configure as next action, draft/disabled state and increased the setup count. Its SDK dialog showed the prerequisite warning in both languages. Deleted through the custom confirmation, with the final GUI showing no matching connection and total Tool count restored to 3. One automated 5-second post-delete wait timed out; a subsequent snapshot confirmed deletion, without issuing another delete.
- SDK snippets opened for Sandbox, model, Tool and protected API connections. Python and TypeScript selection, copy success messages, modal background inertness, Escape close and trigger focus restoration checked. Found and fixed the SDK selector's initially stale accessible name; final localized labels observed as `SDK language` / `SDK 语言`.
- Both-language narrow form review and Chinese narrow SDK dialog review. Requested emulation 390 × 844; browser reported an effective layout viewport of 433px and dialog width approximately 413px. Fixed footer actions remained visible and dialog body scrolled. Screenshots inspected:
  - `applications/configuration-guide-zh.png`
  - `applications/sdk-binding-en.png`
  - `applications/sdk-binding-zh-mobile.png` (before accessible-name-only correction)
  - `applications/provider-search-en-mobile.png`
  - `applications/provider-search-zh-mobile.png`
- Restored desktop view, Chinese language and Sandbox page; retained the Console tab for the user.

## Environment and limits

`npm run local -- status` at 07:12:49 UTC: API/database ready, credential store ready, credential access reachable, execution running, no active Runs. A prior browser footer briefly reported unreachable ingress; the later service status confirmed reachability. Existing provider credentials and enabled connections were not changed. No SaaS request, cloud Sandbox allocation, commit or publish occurred. Historical real Python/TypeScript execution evidence remains separate from these UI and snippet checks.
