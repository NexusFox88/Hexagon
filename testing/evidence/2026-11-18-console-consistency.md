# Console consistency audit — 2026-11-18

## Findings and fixes

- Generic dialog/main text input heights overrode checkbox height. Restricted these selectors to text-like inputs, fixed checkbox geometry at 16×16px, and drew an explicit check with CSS. An initial data-URI check icon failed the real Console CSP; browser screenshot inspection caught this and the final implementation uses no external/data image.
- Removed the visible duplicate legend/border inside Allowed operations; retained an accessible fieldset legend. Permission names and technical metadata align beside compact controls. Applied consistent boundaries to MCP permission groups.
- Removed generic seven-column widths that also affected three/five-column tables. Connection tables and Sessions own their respective widths; reduced table padding without reducing primary font size. Connection availability is one state instead of Verified + Enabled. Session execution is distinct from lifecycle beneath Sandbox. Closed-but-never-run Sessions show Not started.
- Agent list uses full width until editing. Task records group identity/title with task preview, state, time and resource link. Token identity and metadata align in columns; creation disclosure no longer repeats its heading.
- Long table identities truncate with ellipsis rather than clipping mid-glyph; status cells can wrap. Empty inline error boxes are hidden globally.
- Pointer-triggered dialogs preserve the triggering button when browser focus was on the document. Actual Escape returned focus to Exa after the fix.

## Browser evidence (actual running local service)

TaskSpace 35. Inspected live populated Sessions/Tools plus all secondary routes: Sandbox, LLM, Harnesses, API Playground, Settings, Tokens, Overview, Runs, Pending, Protected APIs, Secrets, Agents, Network, Cloud operations, Fleet. Screenshots were inspected, not just DOM metrics. Route inventory and images are under `.local/ui-consistency/`.

Opened provider catalogs (Sandbox, model, Tool), searched Lark, opened application permissions, remote MCP editor, Secret editor, OCI registration, and protected API editor. Used Escape/cancellation only: did not save credential changes or mutate existing provider configurations. Tested checkbox Space toggling, real check rendering, fixed footer reachability, catalog search and focus return. English and Chinese screenshots cover modified lists and permissions; a 390px emulated viewport checked the permission editor and footer. No document horizontal overflow in inspected routes. All provider-specific field combinations and every possible server error were not individually exercised; shared editor components and representative form types were inspected.

Final measured rows: Session ~63 CSS px; Runs ~70px; Agents ~74px; revoked Token records ~97px (three metadata lines). Primary text remains 14px; metadata remains 12–13px. Checkbox measured ~16×16px under browser zoom. `.local/ui-consistency/permissions-final.png` verifies the actual check mark; `permissions-narrow-en.png` verifies narrow layout.

## Commands

- Full `TEST_DATABASE_URL=postgres://hexagon@127.0.0.1:55432/hexagon npm run verify`: 80 files / 241 tests passed (`verify-final.log`).
- Subsequent `npm run check` passed; targeted Console localization/journey tests passed (`final-check.log`, `final-focused.log`).
- Presentation-only work: no new cloud Sandbox/LLM execution was performed or claimed. Local service restarted to publish coherent Console assets. No commits/publication.

The record is scoped evidence, not a claim that future UI variants are automatically visually approved. The design contract now explicitly includes control sizing, one-title permission groups, distinct state semantics and real-CSP visual checks.
