# Initialization JSON sidebar

Moved the full server-provided initialization snapshot from a bottom disclosure into a persistent right code sidebar. Copy action and status are fixed above the independently scrolling JSON. Configuration keeps its own scroll area. On viewports <=1000px, a keyboard-operable View JSON / Back to configuration button switches the content surface without squeezing the form. Display and copy use the exact same JSON serialization of the already-redacted server snapshot; no new secret lookup.

Actual browser review: the requested Session in TaskSpace35; desktop copy returned localized success; parsed displayed JSON has definition. Scrolling configuration moved its scrollTop160 while JSON stayed at0 and toolbar stayed at143.98px. Removed inherited global pre max-height so JSON fills available sidebar (709px measured). At390×844, keyboard activated JSON view, code visible and copy button bottom276px within viewport844; returned to configuration. Reviewed Chinese and English screenshots in `.local/initialization-sidebar/`.

`npm run check` passed. Catalog verification:4 tests passed. No new cloud execution. Local API/worker left running, temporary ingress stopped.
