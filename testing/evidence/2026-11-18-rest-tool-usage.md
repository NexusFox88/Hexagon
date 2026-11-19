# REST transparency, Hexagon loading, table surfaces and Tool usage

## Implemented

- Shared REST preview derives preflight, Session creation, Run submission, Run result and SSE requests from Playground inputs. Continuation omits creation requests. Includes JSON headers/body, copyable cURL, local same-origin bootstrap headers and hosted placeholders. Environment values are masked with named placeholders; harness runtime metadata is omitted. Repeated blur/change does not collapse an opened request.
- Shared hexagon outline pulse for route loading, refresh, common asynchronous actions and submission. Reduced-motion is respected.
- Shared table/record surface styles remove outer boxes and per-row grid lines; preserve column alignment, hover/focus indication, internal scroll, sticky headings and pagination. Usage timestamps retain a readable column.
- Tenant-authorized paginated `/v1/connections/:id/usage`: Agent defaults, all Session Tool assignments (including closed), and persisted broker calls. Recorded execution policy takes precedence over binding fallback. No arguments/results/credentials returned. Console Tool names and Usage actions open this view; call links target matching Session/Run.

## Verification

`TEST_DATABASE_URL=postgres://hexagon@127.0.0.1:55432/hexagon npm run verify`: 82 files / 244 tests passed (31.26s). Subsequent REST blur preservation, same-origin cURL headers, style cleanup and busy indicators were checked with targeted tests and browser review.

Final `npm run check` passed; targeted usage, REST projection and strict catalog suites: 3 files / 7 tests passed. Usage tests cover tenant isolation, closed Session assignment, Agent bindings, pagination, recorded connection precedence, fallback and payload exclusion. REST tests cover creation/continuation endpoints, shell quoting, safe environment projection and hosted/local auth examples.

Actual local HTTP bootstrap with generated-example headers passed. Authenticated Exa usage endpoint returned HTTP 200 and seven existing recorded calls, with arguments and results excluded. Secret values were neither printed nor saved.

Actual ego-browser review in TaskSpace 35:
- English and Chinese Tool assignments/call history rendered from persisted data. Agent-default empty state correctly reflects no default binding for Exa.
- Call link navigated to its Session/Run and selected conversation position (two turns; scroll 265.56).
- New and reused Session Playground display REST requests. After entering `REST_PREVIEW_MATCH`, expanded Run JSON contained that exact input. Request expansion survived form blur. Chinese and English reviewed.
- Throttled real requests showed `hexagon-pulse`; reduced-motion computed animation was `none`.
- Narrow viewport: document width 433 equals viewport 433; height 844 equals viewport 844. No document overflow.
- Re-ran populated Session wheel/Home/PageDown/refresh regression after shared table styling. Screenshots inspected for table alignment, REST view and loading outline.

Browser screenshots and logs: `.local/ui-rest-usage/`. No new cloud Run was submitted or provider resource provisioned for this UI/query acceptance. Existing persisted cloud execution records were used for reverse-usage review; they are not claimed as new provider acceptance.

Final browser follow-up: connection Usage buttons show complete Chinese labels (clientWidth and scrollWidth both 70); invalid reuse JSON disables cURL copying and restoring valid JSON re-enables it. Local API and worker remain ready; temporary development ingress was stopped after review.
