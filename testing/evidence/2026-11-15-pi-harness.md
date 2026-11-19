# Pi as a second real open-source Harness

## Implementation and upstream contract

Registered `pi@1.5.2` alongside `opencode@1.2.27` in the same HarnessRegistry. The worker has no Pi-specific branches. The Pi adapter installs Node 22.19.0 and `@earendil-works/pi-coding-agent@1.5.2` inside the cloud sandbox, invokes JSON mode with a stable native session ID, and interprets the final assistant message and stop reason. Truncated, aborted and errored responses do not become successful results.

The package/version/engine requirements were verified with npm metadata. Implementation follows the official [Pi repository](https://github.com/earendil-works/pi), the packaged 1.5.2 `docs/cli.md`, `docs/extensions.md`, `dist/modes/print-mode.js` and `dist/modes/json-event.js`. The former `@mariozechner/pi-coding-agent` package is deprecated in favor of this package. Pi uses its registered Anthropic-compatible provider directly; this does not introduce a Hexagon LLM gateway.

The sandbox extension registers each bound Tool and forwards calls into the existing Run-scoped HTTP mailbox. Retries keep the same call ID and request body. Credential waiting, approval, side-effect deduplication and artifacts stay in the shared control plane. Discovered project extensions/skills/context files are disabled; only the explicit Hexagon extension loads.

## Failure discovered and corrected

First attempt: `.local/evidence/api-smoke-f01f3644-07fe-4d37-a688-305b8c2a55dd.json`.

The actual Web task, fixed tests, tool authorization/approval and primary response succeeded. Follow-up failed because Runtime redacts complete environment values and the adapter passed the Run ID as an environment value; Pi used that same value as its native Session ID, so the stored header became `[REDACTED]`. The follow-up was cancelled using the normal Run cancellation path, the acceptance attempt remained failed, and resource/template cleanup was confirmed.

Public Run metadata now travels in a JSON configuration object while the model key and mailbox token remain separately redacted. The corrected adapter preserves native session headers. A regression assertion covers the metadata boundary; the actual follow-up and cross-language continuation below provide the behavioral evidence.

## Successful real cloud journey

Command:

```sh
HEXAGON_WEB_SMOKE=1 HEXAGON_HARNESS=pi HEXAGON_BOTH_SDKS=1 npx tsx tooling/smoke-api.ts
```

Journal: `.local/evidence/api-smoke-e456265b-d7a8-4006-813c-8d209f9ff7ac.json`.
Retained isolated database schema: `hexagon_smoke_e456265bd7a84006813c8d209f9ff7ac`.
Process exited 0, without manual intervention.

- Both TypeScript and Python independently created a Pi Session in E2B, uploaded the Web fixture, and submitted a real MiniMax-driven task.
- Both read ACCEPTANCE-001 through the bound Tool, implemented filter.mjs, kept acceptance.mjs unchanged, and passed 8 independently executed assertions.
- Both waited for report authorization and API approval. Python's report delta was zero before approval and one after; the TypeScript primary report was also written once after approval.
- Final API responses contained actual assistant text and exported filter.mjs / test-report.txt artifacts with verified hashes.
- TypeScript resumed all 324 persisted events; Python resumed all 278 persisted events, with exact cursor replay checks.
- Same-Session follow-up worked. Python continued the TypeScript-created Session and TypeScript continued the Python-created Session.
- Agent-started Web previews were available after Run completion. Preview revocation and Session-close denial were verified over HTTP.
- Both clients cancelled a Run and closed their Session. Exported artifact bytes remained retrievable.
- Product lifecycle cleanup, provider resource absence and test-template deletion were confirmed.

This attempt used API-driven credential registration and authorization, not a new GUI run. It does not establish GUI initialization for Pi or another sandbox provider.

## Local regression

- `npm run check`: passed.
- Full isolated PostgreSQL suite: 31 tests in 15 files passed.
- Added Pi output/stop-reason/session tests and real mailbox retry simulation (identical call body after lost response; rejected tool result surfaces as an error).
- Added preflight rejection of Tool bindings on a Harness without `tools` capability; unknown versions remain rejected.

## Remaining scope

Custom Harness package registration, additional cloud Sandbox providers, complete GUI-first initialization, real external service credentials, failure recovery and network-policy coverage remain incomplete. This evidence proves a second actual Harness on the current E2B connector, not the entire product acceptance matrix.
