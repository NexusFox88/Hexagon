# Open-source preparation verification — 2026-11-19

Verdict: engineering preparation implemented; **not approved or ready for public release**. Apache-2.0 was selected by the owner. No commits, uploads, repository creation, package publication or support messages were performed.

## Implemented

- English/Chinese README, accurate local identity and model protocol guidance; contributor, security, third-party notice, support scope and release checklist documents.
- Apache-2.0 root and SDK licenses. Actual npm archive and Python wheel were inspected for license inclusion.
- Source/artifact inventory with SHA-256 hashes, retained upstream provenance checks, private-file/symlink rejection and narrow secret-pattern checks. This is not a comprehensive secret/history/license audit.
- Public release policy gate: missing private security contact, ownership confirmation, legal/artwork review, artifact review, successful fresh cloud journey and publication authorization block publication.
- PostgreSQL CI workflow for deterministic tests, installed SDKs, production build and startup. The workflow was not run on a remote CI provider; this directory has no Git repository.
- Safe support diagnostics: allowlisted health states only, no credentials, endpoints, identifiers or arbitrary provider messages; restrictive permissions and no overwrite.
- Production packaging excludes stale Python build trees. The compiled release includes SDK licenses and retained third-party notices.
- Image preparation errors now retain allowlisted error category/status for diagnosis without storing raw exception messages. This does not recover receipts already lost by a previous operation.

## Commands actually executed

| Check | Actual result |
| --- | --- |
| `TEST_DATABASE_URL=… npm run verify` (final source) | Passed: 107 files, 347 tests; includes TypeScript check |
| `npm run verify:packages` | Passed: 4 files, 7 tests using installed npm/wheel artifacts |
| `npm run verify:backup` | Passed in isolated database/data |
| Compiled release startup via `HEXAGON_TEST_RELEASE_ROOT` | Passed startup/restart/credential preservation/wrong-key rejection on candidate r2 |
| `npm run build:local -- /tmp/hexagon-release-preview-20261119-r5` | Passed |
| `npm run release:check -- --artifact /tmp/hexagon-release-preview-20261119-r5` | Passed narrow scanner: 429 files, zero findings before dependency installation |
| `npm ci --omit=dev --ignore-scripts` in r5 | Passed: 400 packages |
| Managed r5 start and stop with isolated persisted data | Passed; used for final bilingual browser inspection |
| `npm run local -- diagnostics …` | Passed; private file produced with allowlisted fields |
| `npm run release:public-check` | Intentionally blocked; pending release prerequisites |

Host: macOS. Linux/Windows installation and hosted control-plane deployment are not certified by these results. Deterministic provider simulations do not count as cloud acceptance.

## Fresh release browser and real cloud journey

Used an independent schema, local identity, data directory and ports. Existing user service was not replaced. Real credentials were read privately, never printed in evidence.

Browser-created and verified: E2B connection, MiniMax Chat Completions model, public DeepWiki remote MCP with only read_wiki_structure exposed. Initial model verification required the existing local outbound proxy; retry passed. The second Messages model and pinned OpenCode OCI harness were registered through the API, not the browser. Playground REST/SDK views were inspected. English/dark and Chinese/light modal rendering were visually inspected; dropdown keyboard selection, internal scroll, fixed footer and Escape/focus return were exercised. This is scoped browser evidence, not a claim that every page was re-certified.

Installed Python/TypeScript SDK cloud runner attempted E2B + OpenCode OCI:

- Python: image preparation never returned a durable template/build receipt. Run was cancelled, while Session remains `closing` and image_prepare remains `unknown`. Exact-operation alias lookup returned no matches; absence from the list is not proof of remote deletion. No blind retry or fabricated cleanup was performed.
- TypeScript: stopped at `credential_proxy_tunnel_unavailable`; no successful model conversation, pause/resume or result delivery is claimed.

Therefore **fresh release cloud acceptance failed**. Prior successful E2B evidence remains historical and does not override this result. Root cause of the lost E2B receipt is not established. The new safe diagnostic persistence improves future evidence but is not labelled a fix for this occurrence.

Private operation IDs, database/schema and raw reports remain under `.local/release-journey/` and `.local/headless-cloud/`; retain these for reconciliation. The isolated test service was stopped; its database was deliberately preserved because remote outcome is unknown. This is a new unresolved operation, separate from previously parked historical resources.

## Remaining release blockers

1. Resolve new E2B operation outcome and repeat fresh Python/TS cloud journey with working credential ingress.
2. Complete third-party artwork/recipe and full artifact review; narrow automated scanning is insufficient.
3. Configure an actual private vulnerability reporting channel.
4. Confirm repository/package ownership and explicitly authorize publication.
5. Run remote CI and platform-specific installation checks before making those platform claims.
