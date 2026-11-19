# Harness expansion — work in progress

This record separates protocol registration, real CLI fixtures, real models, and cloud acceptance. No new Harness is claimed to have completed the cloud journey by this record.

## Model endpoint verification

Using existing locally stored credentials, without printing credential values:

- `https://api.minimaxi.com/v1/responses`, `MiniMax-M3`: HTTP 200, response object with output.
- `https://api.siliconflow.com/v1/responses`, `deepseek-ai/DeepSeek-V4-Flash`: HTTP 404. This is a SiliconFlow endpoint result, not a claim that DeepSeek's own API lacks Responses.

Private sanitized results: `.local/harness-expansion/model-probes.json`.

## Codex

`npx tsx tooling/build-harness-images.ts codex`: built local OCI image with upstream Codex 0.170.0.

`npx tsx tooling/smoke-harness-images.ts codex responses`: passed with the real CLI and deterministic Responses server. First turn, same native thread continuation, namespaced MCP tool execution, and container cleanup verified. The fixture initially failed to recognize Codex's Responses namespace tool declarations; it now handles the actual request structure and verifies the mailbox call occurred.

Private `codex-real.ts` repeats the test with the actual MiniMax endpoint. Passed initial reply, native thread continuation, and actual model-selected MCP fixture tool invocation. Upstream credentials stay in the host-side forwarding handler; the guest receives a test-scoped token. Test container cleanup confirmed. This is local Docker plus a real model, **not a cloud Sandbox or complete SDK acceptance**.

## Deterministic checks

- `npm run check`: passed after fixing a duplicate wrapper-install line.
- `TEST_DATABASE_URL=postgres://hexagon@127.0.0.1:55432/hexagon npm run verify`: 85 files / 255 tests passed at this checkpoint.
- Subsequent targeted API/adapter tests: 2 files / 15 tests passed. Both Python and TypeScript register all three new protocols over HTTP with immutable-version, application-role denial and tenant-isolation checks. Registry resolution is simulated in this suite; it is not a real registry/cloud run.

## Remaining work

- Hermes and OpenClaw actual CLI configuration and continuation/tool execution.
- Cloud Sandbox journeys and complete Python/TypeScript acceptance for each new adapter.
- Shared compatibility/evidence display and bilingual browser review.
- Fault/cancellation, runtime-event replay, and final full-suite checks after remaining changes.

Build failures are retained in `.local/harness-expansion`. Early apt/npm downloads failed transiently. Hermes rejects wheel builds and requires editable installation; the recipe was corrected. OpenClaw 2026.11.5 requires Node >=24.16.0 (<25) or >=26.1.0; its recipe was corrected to Node 24.16.0 before verification.

## Later checkpoints

- OpenClaw 2026.11.5 image built on Node 24.16.0. Real CLI plus deterministic Chat Completions fixture passed first turn, same native session continuation, MCP bridge invocation and cleanup. OpenClaw exposes selected MCP tools through its `dispatch_action` catalog; the fixture now exercises that actual dispatch shape.
- Final full suite at 18:12:51: **85 files / 264 tests passed**, including the added SDK protocol registration and malformed-result cases. Private command log: `.local/harness-expansion/verify-final.log`.

- OpenClaw also passed the real MiniMax Responses endpoint: initial response, same native session continuation, model-selected MCP tool call and cleanup. This remains local OCI execution, not cloud SDK acceptance.
- Hermes initial conversation and native continuation pass with lazy dependency installation disabled. Its first tool check exposed a missing optional MCP SDK in the image; the recipe now includes the pinned upstream MCP dependencies. This tool check is not yet marked passed.

- Hermes real CLI + deterministic Chat Completions fixture now passes initial response, same native session continuation, deferred `tool_call` invocation of `mcp__hexagon__fixture_echo`, and cleanup. Optional MCP dependencies are image-owned; lazy installation is disabled in the wrapper. Private log: `.local/harness-expansion/hermes-fixture-final.log`.
- No `hexagon-oci-fixture-*` containers remained after these checks. Cloud dual-SDK acceptance and Console browser review remain pending.

Current follow-up: [Harness delivery and real cloud journey](2026-11-18-harness-delivery.md).
