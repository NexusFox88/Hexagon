# OpenCode integration work; real model acceptance remains failing

Implemented an OpenCode 1.2.27 adapter with a pinned npm installer, user-provided Anthropic-compatible endpoint configuration, JSON event decoding and native-session continuation parameter. Added a bounded model-connection credential validator, but its real credential validation has not been run. The production harness catalog remains empty until the execution worker is implemented and the harness is verified.

Read the official version-pinned [run implementation](https://raw.githubusercontent.com/anomalyco/opencode/v1.2.27/packages/opencode/src/cli/cmd/run.ts), [config implementation](https://raw.githubusercontent.com/anomalyco/opencode/v1.2.27/packages/opencode/src/config/config.ts), and [MiniMax OpenCode guide](https://platform.minimax.io/docs/m-plan/opencode). Current OpenCode website documentation describes a newer configuration generation; the adapter deliberately uses the pinned 1.2.27 configuration.

Local checks passed: TypeScript compilation, 12 Vitest tests (including PostgreSQL tests and runtime transport recovery), and 4 Python supervisor tests. Runtime event ingestion atomically updates its durable cursor and deduplicates replayed events. Added explicit stdin delivery, final event draining in the smoke client, private preview target caching, and bounded retries only for idempotent runtime operations.

Real command: `HEXAGON_MODEL_SMOKE=1 npx tsx tooling/smoke-e2b.ts`.

Real attempts have NOT passed. OpenCode installs and starts, but the captured result is exit code 0 with only database initialization messages, no JSON model events and no final answer. Attempts 40beb736-f591-41a5-bbe8-c9648263b65f, bfc670bd-1305-4a26-9682-5a2d974a2cbc, e2985ba1-d4f9-44cb-aef4-29f55c38ab58 and fee08486-e006-4ee5-a31e-a2470182cceb show this behavior. Attempt 32739f25-1a94-4def-a3d4-4bbbcf60d474 encountered a runtime HTTP timeout. Every listed attempt confirmed sandbox cleanup. Exact private journals are under `.local/evidence/e2b-<attempt>.json`.

The stdin and transport changes did not establish the cause of the empty OpenCode result. There is no evidence yet that a successful MiniMax request occurred or that an Agent edited the fixture. The next diagnostic adds collection of the harness's own redacted log before resource cleanup; that collection has not been executed yet. Do not mark the model or harness journey complete.

The credential reader found authorized literal assignments in `.zshrc` for MiniMax, Tavily and DeepL without printing them or executing the shell file. No credentials were committed or included in public evidence.
