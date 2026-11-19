# Sandbox connection editor redesign

Reorganized the shared Sandbox editor for all 11 current providers: provider logo and connection-specific title, credentials first, default name, secondary saved-credential disclosure, collapsed advanced configuration. Modal credentials and Vercel/Blaxel account scope remain in the main form. Instabox/E2B template help distinguishes provider templates from Harness images. DOM and keyboard order match visual order. Other connection kinds retain their original field grouping.

Primary action saves, validates and enables. Saved identity is retained before validation; invalid validation cannot enable, and retry updates that identity. Interrupted creation responses produce a reconciliation instruction rather than permitting blind resubmission. Empty credentials are rejected before saving. Original credential values are never reflected into the editor.

Actual ego-browser TaskSpace 35 review: opened all 11 provider create forms (E2B, Modal, Boat, Instabox, Vercel, Blaxel, Sprites, Upstash, Agent37, Fly Machines, Freestyle). All logos loaded, names were prefilled, Advanced was collapsed; initial focus was credential / Modal Token ID. Reviewed Chinese Instabox and English Modal, plus narrow Vercel with Advanced expanded: body scroll 210.56px, fixed footer bottom831.88 within viewport844, document width433 matches viewport433. Empty Instabox submission showed localized credential error without creating a record. Verified Model editor after Sandbox still has its normal open fields and Save configuration action. Final keyboard check: credentials first, Tab to credential acquisition link.

Snapshots and provider review metadata: `.local/sandbox-editor-review/`. No provider credentials were entered or saved, no provider validation request was sent, and no cloud Sandbox was created in this browser review. Save/verify/enable success, invalid verification and interrupted verification are deterministic flow tests in `testing/sandbox-connect.test.ts`; they are not live cloud acceptance.

`npm run check` passed. Initial focused catalog and connection-flow tests: 2 files / 7 tests passed. Full verification result is recorded in `.local/sandbox-editor-review/verify.log`.

Full verification: 83 test files / 247 tests passed (31.72s). After scoping footer label updates to avoid changing the MCP discovery button, typecheck and the 7 focused tests passed again; actual MCP editor review confirmed distinct discovery and save labels.
