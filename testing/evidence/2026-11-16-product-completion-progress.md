# Product completion — incremental evidence

Historical incremental record, superseded by [final implementation and verification evidence](2026-11-16-product-completion-final.md). The outstanding list below records the earlier checkpoint, not current delivery status. Source scope: `docs/product-completion-plan.md`; ledger: `testing/product-completion.md`. Original cloud user journey remains required.

## Deterministic verification (2026-11-16, local time)

- `npm run check`: passed after deployment, resource review, Agent revisions, query APIs and application-token changes.
- `npx vitest run testing/deployment-settings.test.ts`: 4 passed. Private atomic config persistence, optimistic concurrency, environment precedence, nonblocking ingress failure/retry and shutdown.
- `TEST_DATABASE_URL=postgres://hexagon@127.0.0.1:55432/hexagon npx vitest run modules/sandboxes/lifecycle.test.ts modules/sandboxes/expiry.test.ts testing/console-i18n.test.ts`: 7 passed (16:34). Dedicated isolated database schema, not development data.
- `TEST_DATABASE_URL=... npx vitest run modules/sandboxes/operations.test.ts modules/execution/worker.test.ts modules/execution/worker-prepare.test.ts`: 10 passed (16:34). Backoff, unknown acknowledgement, tenant isolation, late resource discovery without another create; existing worker recovery cases.
- `TEST_DATABASE_URL=... npx vitest run modules/sandboxes/operations.test.ts modules/sandboxes/expiry.test.ts testing/console-i18n.test.ts testing/console-ui-contract.test.ts`: 7 passed (16:35).
- `TEST_DATABASE_URL=... npx vitest run testing/execution-preflight.test.ts testing/tenant-boundaries.test.ts testing/sdk-interoperability.test.ts`: 3 passed (16:38). Added definition-only preflight, Agent revision conflict, copy/archive, Session pinning and foreign bindings.
- `npx vitest run testing/console-session-code.test.ts testing/console-i18n.test.ts`: 6 passed (16:43). Generated Python and TypeScript programs execute with actual SDKs against simulated HTTP; lost submission response is recovered with the same key through the other language. Shared journal, stream cursor, no automatic close, explicit close verified in both directions.
- `TEST_DATABASE_URL=... npx vitest run testing/application-tokens.test.ts testing/execution-preflight.test.ts testing/sdk-interoperability.test.ts testing/tenant-boundaries.test.ts testing/console-i18n.test.ts`: 8 passed (16:47). Hash storage, one-time return, administration restriction, expiry, rotation/revocation, tenant isolation; regression tests above.

These are deterministic tests, not new cloud matrix acceptance. The i18n check found a hardcoded command and later a helper-signature false positive; both fixed and subsequently passed.

## Local service and browser observations

- Persisted `api.instabox.sh` under deployment `no_proxy`, restarted the managed service. Management returned ready while credential ingress was still not configured/starting. This confirms the new startup decoupling on the real local service, not successful guest connectivity.
- Network configuration rendered in zh-CN and en; GUI save succeeded. A nonsecret domain draft survived language switching. Commands and diagnostics appeared localized; URLs/identifiers retained.
- Resource operations page showed the historical Instabox unknown create with three reconciliation attempts and `needs_review`; provider returned no matching resource. It remains unknown, not closed. Session ID retained in original private evidence and product ledger.
- Browser review is partial: full narrow-screen/keyboard coverage, Agent/tokens/run UI and final screenshots remain to be completed.

## Outstanding

All milestones remain subject to their full acceptance checklists. In particular: remaining GUI polish and error paths; network retry evidence; complete setup journey; HTTP examples; provider capability/evidence presentation; fresh SDK package installs; real cloud continuation and original journey regression; cleanup and private evidence audit.
