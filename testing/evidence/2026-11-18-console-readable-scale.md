# Readable Console scale, infrastructure navigation and API Playground

User request: stop shrinking every element to simulate density; revise all page bodies against Vercel/Geist sizes, spacing and content widths; place Harness in Infrastructure; include image identity on application creation choices; add a first-level API Playground.

## Delivered

- Inspected https://vercel.com/geist/typography. Implemented 14px body/labels/buttons, 13px secondary text, 12px tertiary metadata, 16px conversation prose and 24/32px page titles. Removed the previous 10–11px scale. No zoom/transform scaling.
- Shared content canvas uses 40px desktop gutters, 1440px max width (1600px on wide displays), 1120px conversation width, 64px two-line list rows, and consistent form/dialog typography. Narrow layouts stack configurations and internally scroll tables.
- Harness navigation is a child of Infrastructure, alongside Sandbox and LLM; removed its Settings entry.
- API Playground has a first-level navigation entry with its own active state. Existing Python/TypeScript generators remain. Send request uses the same public preflight, Session and Run APIs, then opens live conversation progress. Existing Session continuation is supported. Submission retry retains its idempotency key; uncertain Session creation is not blindly retried.
- All 29 current catalog choices (28 applications plus generic HTTP API) have locally served image artwork. Sources and licenses are in apps/console/brands/README.md. No external image requests at runtime. Some related Microsoft/Google services share their parent brand mark.

## Actual verification

- `npm run check`: passed.
- Focused Console localization, native-component contract, release and Playground tests: 4 files / 8 tests passed.
- `TEST_DATABASE_URL=… npm run verify`: 68 files / 197 tests passed, 28.18 seconds. Log retained in `.local/console-readable-review/verify.log`.
- Desktop browser review: 17 routes × English/Simplified Chinese, actual viewport width 1620. No page-level horizontal overflow or error notices. Screenshots and page snapshots retained privately. Contact sheet and full-size lists, Playground and conversation were inspected.
- Narrow review: same 34 route/locale combinations at actual CDP viewport width 390, no page-level horizontal overflow or error notices. Final header alignment adjustment reviewed separately.
- Catalog: all 29 images loaded, zero external image URLs. Search, ArrowDown/Enter selection, credential editor and Escape dismissal exercised. Notion configuration reviewed; no account authorization claimed.

## Real API Playground acceptance

Used existing authorized Vercel / SiliconFlow international / Pi configuration, without changing credentials. Clicked Send request in Console; platform automatically prepared credential access. Session `ef7082da-2b91-4a83-b134-713b8274f608`, first Run `3337c2d3-b8a5-4fdc-b5ca-883e967a31d1`, completed with `PLAYGROUND_READABLE_OK`.

Clicked Continue this session, submitted through Playground again, and Run `d1ca5b0d-212e-447a-8446-389b262cb6c9` completed with `PLAYGROUND_SECOND_TURN_OK` in the same Session. This is actual cloud execution, separate from deterministic retry tests. SDK program generation is preserved; the prior dual-SDK cloud journey was not reclassified as a new SDK execution in this increment.

Private cloud response/resource evidence: `.local/console-readable-review/cloud.json`. Cleanup result is recorded below after confirmation. No commits or publishing.

## Live-refresh defect found by actual use

The second turn exposed a stale queued UI even though the API had completed: the default-open execution trace matched the generic “open details pauses refresh” guard. Excluded the automatic execution-trace disclosure from that guard. A fresh GUI request in Session `f99ceed5-93a9-4655-b2e7-8cb31471b31c`, Run `fb99d6bc-2381-40a4-a5a8-f721d4672ac8`, then visibly updated from queued to running and completed with `PLAYGROUND_LIVE_REFRESH_OK` without manual refresh. The first observation of the marker was in the trace before the final reply, so that observation alone is not counted as completion; the completed reply and close action were subsequently observed.

Both test Sessions were closed through the application-owned confirmation flow. Independent API reread confirms both Sessions closed and all four associated create/delete operations completed. Exact provider resource IDs remain in private `cloud.json` and `cleanup.json`. No test-owned resource remains pending.

Final focused checks after refresh/header adjustments: 3 files / 7 tests passed. Final 390px header check placed title and refresh control on the same row (127px and 125px top), with no document overflow. English catalog and Chinese credential form were reviewed; all 29 images loaded in both locales. Browser left at the Chinese API Playground. No fresh full-provider matrix or dual-SDK cloud execution is claimed by this UI increment.
