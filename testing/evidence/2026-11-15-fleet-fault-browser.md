# Fleet fault states and cleanup retry — browser acceptance

Date: 2026-11-15. Status: passed using real Console, authenticated local API and isolated PostgreSQL with controlled fault records/provider adapter. Actual cloud behavior is covered by the separate Runtime-loss and resource-response-loss evidence; this record does not claim another cloud execution.

Fixture command: `npx tsx tooling/console-fault-fixture.ts` (exit 0).
Private evidence: `.local/evidence/fleet-ui.07c4dbe3-9aee-46f3-9a53-53f422746bb0.json`.
Browser: ego-browser task space 12, owned Page p1; finished with no kept pages.

Observed through the UI:

- Runtime unreachable: separate state boxes showed Sandbox last recorded running, Runtime “无法连接，进程状态未知”, and Run waiting authorization.
- Runtime interrupted: separate Runtime “执行中断，需恢复环境”, Run failed, and `runtime_interrupted` error.
- Creation unknown: no assigned resource; visible “创建资源 · 结果未知，待核对” with explanation that the original operation is reconciled instead of duplicated.
- Cleanup uncertainty: Session closing, delete operation unknown, explanatory error text, and “重试清理”.
- Clicking “重试清理” and accepting the confirmation invoked the actual product close route. Console then showed Session closed, Sandbox destroyed, Runtime stopped and deletion confirmed; the former Run remained failed and its event record remained visible.
- Controlled execution events and Run errors were rendered in the detail panel.

The backend independently required the cleanup Session to be closed, the controlled resource to be absent, and exactly two destroy attempts (initial injected failure plus browser retry). It then shut down and dropped its isolated database schema. `fixture_cleanup` is confirmed. No cloud resources were created.

A UI defect found during this check was fixed: preview creation was offered even when the pinned Session capabilities excluded preview. Console now shows “当前执行组合不支持 Web 预览。” and omits the action for those combinations. After reloading the actual page, browser DOM inspection confirmed the explanation was visible and the preview-creation button absent. Existing full-preview cloud journey evidence covers supported combinations; it was not rerun here.

Validation: `npm run check` and `node --check apps/console/app.js` passed. No implementation-mirroring UI unit test was added; the changed behavior was exercised in the browser. A selector wait initially used the wrong exact text and a later ref became stale during polling; both were recovered within the same task space using current observed Session rows, without changing application state to force a pass.

No production credentials were exposed. Authentication used an encrypted scoped checkpoint decrypted only in browser-tool memory. No commits made.
