# Resource reconciliation visibility and fault acceptance

Date: 2026-11-15. Status: implementation and deterministic tests passed; real cloud attempt blocked before Sandbox creation by provider API connectivity.

Fleet now exposes tenant-scoped resource operation records: operation ID, create/delete kind, state, provider resource ID, a reason only while unknown, and update time. It does not expose arbitrary operation detail or credentials. Console shows creation/deletion confirmation separately from the last recorded Sandbox state and offers “重试清理” while the Session is closing. Provider deletion uncertainty has a specific user-facing explanation.

The existing PostgreSQL lifecycle regression was extended to prove:

- Lost create response produces an unknown operation.
- Zero lookup matches and multiple matches remain uncertain and never cause a second create.
- Exactly one lookup match recovers the original resource.
- Disablement preserves cleanup capability; dependent connection deletion stays blocked.
- Failure before delete leaves the resource and Session closing.
- Lost response after actual deletion also leaves Session closing until absence is confirmed.
- A subsequent retry inspects absence, completes the same delete operation, and does not issue another destroy.
- Fleet presents unknown reasons while unresolved, completed operations without stale error reasons, and no cross-tenant records.

Commands: `npm run check` passed; `node --check apps/console/app.js` passed; full isolated PostgreSQL `npm test` passed (20 files, 49 tests).

## Cloud attempt — not passed

Command: `HEXAGON_RESOURCE_FAULTS=1 HEXAGON_TOOL_SMOKE=1 npx tsx tooling/smoke-api.ts`.

Private journal: `.local/evidence/api-smoke-2c47fc34-5a3a-4945-bb42-f40775bbf94f.json`.

The command exited 1 at `build_template`, with `fetch failed`. No Session or Sandbox create operation was reached (create counter zero). Sandbox cleanup is confirmed from the empty test operation set. The test template is `hexagon-api-smoke-2c47fc34-5a3a-4945-bb42-f40775bbf94f`; its absence is **not confirmed**. A dedicated existence/delete/absence reconciliation attempt also failed. Credential-free requests to provider API endpoints failed at TLS establishment (curl exit 35). Do not report this template as removed or start a duplicate test based solely on the failed observation.

The acceptance-only `ResourceFaults` decorator executes the actual provider create then discards its response, injects one pre-delete transport failure, then executes deletion and discards its response. The smoke path checks public Fleet uncertainty and requires the same resource, one actual create, one actual delete, a successful agent result, preserved artifacts, and final provider-confirmed cleanup. This cloud scenario remains unverified until connectivity recovers and the previous template is reconciled.

Console browser inspection also remains pending. No commits made.

Update: provider connectivity recovered on the next goal turn. A dedicated lookup/delete-if-present/second-lookup reconciliation confirmed the failed attempt's named template absent. The private journal now records `template_cleanup: confirmed` and `cleanup_rechecked_at`. The earlier unconfirmed cleanup statement describes the original attempt, not the latest state. A fresh fault journey was started only after this confirmation; its results are recorded separately.
