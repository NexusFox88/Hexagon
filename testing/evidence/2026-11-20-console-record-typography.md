# Record typography correction

Live pre-fix measurement: Secrets names inherited Inter 14px; Harness names inherited Inter 13px; Sandbox name buttons used IBM Plex Mono 14px. Shared typography now covers all table wrappers and record/card renderers, independent of element type and dense-table class. Primary text 14/22px, metadata 12/18px, headers/actions 13/20px. Workspace text uses two 16px lines beside a 32px square avatar.

Verification executed:
- Managed `npm run local -- restart`: exit 0.
- Live ego-browser traversal of all 17 exported Console routes × en/zh-CN × 1440/390: 68 checks passed. Existing table cells/strong names and record/template headings computed IBM Plex Mono 14px; no document horizontal overflow. Empty routes do not constitute populated-record verification.
- Screenshots captured for Secrets and Harnesses in all four combinations. Visually reviewed English desktop Harnesses and Chinese narrow Secrets.
- Results: `console-global-design/type-audit.json`; screenshots `console-global-design/type-*.png`.

CSS and design documentation only; no product strings, API handlers, logo files or loading animations changed. This is presentation evidence, not cloud/provider acceptance.
