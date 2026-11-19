# Combination contract — implementation increment

Scope: M1 first increment of `docs/plans/2026-11-19-orthogonal-agent-platform-completion.md`. This is not completion of the full plan, a cloud acceptance record, or Console browser review.

Implemented:
- Shared structural resolver with explicit ownership of Harness behavior and Sandbox infrastructure capabilities; approval requires every bound Tool adapter to declare approval support.
- Session creation and preflight use the resolver. Newly created Sessions pin schema-versioned requirements, effective capabilities and structural status.
- Preflight separately exposes a readiness check timestamp and `verification: unverified`. Historical matrix passes are not promoted to evidence for this changed contract.
- Worker rechecks a new invocation against the pinned requirements and current Harness definition. Persisted invocations retain the original recovery path; legacy Sessions without the new field remain supported.
- Python TypedDict and TypeScript interfaces expose the same preflight metadata.

Verification:
- `npm run check`: passed.
- `npx vitest run modules/execution/compatibility.test.ts modules/execution/harness.test.ts modules/execution/initialization.test.ts`: 3 files / 11 tests passed.
- `TEST_DATABASE_URL=<local database> npm test`: 103 files / 338 tests passed, isolated temporary database schema; deterministic provider fixtures, not cloud tests.
- After strengthening HTTP assertions: `TEST_DATABASE_URL=<local database> npx vitest run testing/execution-preflight.test.ts`: 1 test passed. Checks no Session allocation during preflight, pinned metadata consistency and initialization retrieval.
- Initial `npm run verify:packages` without TEST_DATABASE_URL failed the required environment guard before verification. Retried with the database configured; result recorded below.

Known incomplete work:
- Compatibility errors still preserve the existing error response contract; a rich rejected-combination response and Console presentation are not yet implemented.
- Worker uses pinned provider/Tool capability declarations; live connector capability revalidation remains incomplete. Existing connection enablement and Tool authorization checks still apply.
- Verification evidence matching/freshness, conditional support, architecture/resource preflight, OCI preparation, additional Harness initialization, limits/output/webhooks and expanded cloud/browser acceptance remain open.
- No new cloud resources created. Historical parked closing resources and Daytona unchanged.

OCI audit observations from installed SDK source, not a live provider test:
- e2b 2.64.x declares Template.fromImage with optional registry credentials and buildInBackground/getBuildStatus. Current Hexagon connector creates a configured Template; it does not prepare OCI templates.
- @vercel/sandbox 4.0.0 declares VCR-scoped image references. This does not establish support for arbitrary external OCI references. Import/build mapping and receipt reconciliation still need implementation and acceptance.

Installed SDK verification:
- `TEST_DATABASE_URL=<local database> npm run verify:packages`: passed; built and installed npm tarball and Python wheel, 4 files / 7 API/database tests passed. No publishing.
- npm tarball SHA-256: `cb67b19091658960e3bf664f5a940205309b25201f3278356d5a7993eec02073`.
- Python wheel SHA-256: `6709694acad444d14b35669a017e0e699cbf200607ac7f2135c6c98ed48f840a`.
- These are installed-package deterministic tests, not real cloud journeys.
