# Session initialization reuse — 2026-11-18

Implemented snapshot → direct creation request projection, Python/TypeScript SDK creation snippets, and an editable API Playground draft. Historical Session/Agent IDs are not reused. Tool/protected API binding aliases, optional tools, resource/network settings and pinned Harness version are preserved. Environment values are never recovered from the source snapshot; generated code reads required names from process environment. Connection references resolve current configuration and permissions, as stated in UI.

## Deterministic verification

`TEST_DATABASE_URL=postgres://hexagon@127.0.0.1:55432/hexagon npm run verify`: **80 files, 241 tests passed**, including typecheck/catalog/UI architecture checks. New 3 tests verify projection, missing-env failure before HTTP, and actual Python/TS subprocess execution against a protocol fixture with preflight followed by new Session creation. These tests are simulations, not cloud execution. Private log: `.local/session-reuse/final-verify.log`.

## Real local service and cloud acceptance

Both generated snippets executed against the running local control plane with automatic local authentication: Python and TypeScript each preflighted, created a distinct new Session and printed its ID. Both Sessions closed. SDK source import path substituted for the installed TypeScript package during repository acceptance; generated UI code uses the public package name. Private source/output IDs: `.local/session-reuse/generated.py`, `generated.mts`, `sdk-live.json`.

GUI journey: opened a historical real Session initialization; generated/copy-switched Python/TS; followed reuse into Playground; preserved Pi 1.5.2, Vercel, SiliconFlow OpenAI connection and DeepWiki `wiki` binding; edited name and timeout; submitted one new request. A new cloud Vercel Sandbox executed the Run and returned exactly `REUSE_PLAYGROUND_OK`. Source Session remained closed; new Session closed after completion. This task requested no tool invocation; retaining the binding was verified in the new initialization, not presented as a new tool execution test. Resource IDs and full final Run/Session/snapshot stored privately in `.local/session-reuse/gui-final.json`.

Browser review: zh-CN and English; initialization-to-Playground navigation; malformed JSON disables code copying; selectors/JSON/code updates; keyboard language selection; copy success; narrow viewport shows no document horizontal overflow and actions remain scroll-reachable. Screenshots: `.local/session-reuse/playground-zh.png`, `playground-en.png`, `narrow.png`. Fixed empty inline-error decoration discovered during narrow review. Page-memory drafts intentionally do not survive reload.

Temporary acceptance ingress stopped; local control plane left running. No commit or publication.
