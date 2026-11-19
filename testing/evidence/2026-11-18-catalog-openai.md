# Connection catalogs, OpenAI protocol and application expansion

Date: 2026-11-18. No commits or image publication.

## Delivered behavior

- Sandbox creation opens a searchable 11-provider icon-card directory, then the selected credential editor. Tool and model directories share its scrolling/keyboard implementation. All identity images are self-hosted with source attribution in `apps/console/brands/README.md`.
- Model creation explicitly selects Anthropic Messages or OpenAI Chat Completions. OpenAI Responses remains unsupported. The model name remains a provider identifier, not a hardcoded routing choice.
- `openai-compatible` has bounded credential verification; ConnectionAccess injects Bearer account credentials and permits only `/v1/chat/completions`. Requests and SSE are forwarded without protocol conversion. The worker sends the pinned provider identifier to OpenCode/Pi adapters. New OpenCode/Pi OCI registrations advertise both protocols; existing immutable registrations remain unchanged.
- Five real request-mapping adapters: Firecrawl (scrape/map), Brave Search, Apify (Actors/runs/datasets), GitLab.com (projects/issues), Readwise Reader (list/save). Catalog: 33 named applications plus generic HTTP. Default selected operations remain read-only; Actor launches and other writes require approval and never automatically replay. Brave validation's quota use is shown.

## Verification

`TEST_DATABASE_URL=postgres://hexagon@127.0.0.1:55432/hexagon npm run verify`: **75 files, 223 tests passed**. Private log `.local/catalog-expansion/verify-final.log`. Initial run exposed stale SDK catalog counts and a test-only duplicate MockAgent close; both were corrected and the full run repeated.

Real Docker binaries against deterministic OpenAI SSE:

- `npx tsx tooling/smoke-harness-images.ts opencode openai`: passed, `OCI_FIXTURE_OK`, container removed.
- `npx tsx tooling/smoke-harness-images.ts pi openai`: passed, `OCI_FIXTURE_OK`, container removed.

These two are actual Harness programs, but their model responses are fixtures. Independent real acceptance below uses the configured SiliconFlow international account.

## Real cloud / both SDKs

Created and validated a separate `SiliconFlow · OpenAI` model connection using the existing managed Secret reference, without reading or displaying its value. The original Anthropic connection was preserved. Direct Chat Completions validation returned ready.

- TypeScript `Hexagon.local()` → Vercel cloud Sandbox → Pi 1.5.2 → SiliconFlow Chat Completions → `OPENAI_TYPESCRIPT_OK`.
- Python `Hexagon.local()` → Vercel cloud Sandbox → OpenCode 1.2.27 → SiliconFlow Chat Completions → `OPENAI_PYTHON_OK`.

Both Runs completed, both Sessions closed and their Sandbox resources were destroyed. Private connection/Session/Run/resource evidence retained in `.local/catalog-expansion/{live,typescript,python}.json`. The new model connection remains available for the user; no provider account or shared Secret was removed. Temporary credential ingress closed after testing.

## Actual browser checks

Ego TaskSpace 35, existing local Console:

- English and Chinese: Sandbox (11), model (2) and Tool (34) directory choices; every image loaded. Search → ArrowDown/End → Enter reached the selected editor. At 390×600, last cards remained reachable, no whole-page horizontal overflow and editor footers ended at 587px.
- All five added application editors in both languages, permissions expanded: localized operation labels and approval markers, no whole-page overflow, footer visible.
- Sandbox directory screenshot visually inspected; dialogs share the existing focus containment/Escape behavior. Private evidence: `browser.json`, `forms.json`, `sandbox-catalog.png` under `.local/catalog-expansion/`.

No third-party application account tests or outbound messages were performed for the five additions, following the user's previous scope waiver. Remote MCP discovery/OAuth, Feishu/Lark, self-hosted GitLab and messaging-channel hosting are not claimed as delivered. A larger application catalog is not equivalent to the full extension ecosystems of upstream personal agents.
