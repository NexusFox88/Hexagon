# Explicit reconciliation of uncertain Tool writes

Date: 2026-11-15. Deterministic integration evidence using real local HTTP side effects and PostgreSQL; not a new cloud acceptance run.

## Change

Previously, the broker correctly stopped unsafe unknown writes but exposed no way to deliver a caller-verified outcome to the waiting Harness. The new tenant-scoped query/resolution API and both SDK methods close that recovery gap. Resolution records an explicit success/error result and audit explanation, does not contact the remote service, and is idempotent for identical submissions.

Migration 009 stores the immutable resolution and the dispatch-time execution policy. An operation's original method, endpoint/path, connection version and replay policy are retained. Editing the connection cannot retroactively enable replay of an unsafe write. A changed connection version also prevents automatic retry of an otherwise replayable call. Existing unknown calls without policy metadata remain conservative.

## Verified cases

`modules/tools/broker.test.ts` runs a real HTTP fixture which increments its write counter and then returns 503. The broker invokes the operation exactly once before entering unknown. It remains unknown across repeated processing and after the live configuration is changed to advertise idempotency replay; the write counter remains one.

- Public authenticated GET lists the unknown call; POST resolution succeeds.
- Another tenant cannot list or resolve the Run.
- Wrong request hash is rejected.
- A concurrent broker advisory lock rejects resolution as `tool_call_in_flight`.
- Identical repeated resolution returns the same completed state without extra events or writes.
- A conflicting resolution is rejected.
- Original broker processing receives the stored verified result without another HTTP call.
- A failed resolution delivers `isError:true`, likewise without another HTTP call.
- A new resolution is rejected after Run cancellation.
- One `tool.outcome_resolved` event is persisted for the first resolved call.

The existing SDK interoperability test exercises Tool-call listing and resolution routing from both TypeScript and Python over actual HTTP. A missing call is correctly surfaced as `tool_call_not_found` in both clients.

## Commands

- Targeted broker test passed.
- Full PostgreSQL suite: 40 tests across 18 files passed.
- TypeScript initially flagged an implicit type in the new test's HTTP response parsing. The test was given an explicit response type; subsequent `npm run check` passed.
- Python SDK compilation passed.

The SQL migration is applied automatically in isolated test schemas. Existing development deployments must run `npm run db:migrate` before starting this version.

## Scope limits

The recovery evidence is controlled local HTTP plus database concurrency, not a model/Sandbox fault E2E. A caller's evidence is an attestation, not automatic confirmation by Hexagon. The Run currently uses the existing waiting-approval state alongside a distinct `tool.outcome_unknown` event; callers should inspect the Tool-call state. No dedicated reconciliation GUI was added. The broader recovery acceptance item remains open.
