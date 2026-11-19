# Understand model protocol compatibility

The connection provider identifies a wire protocol, not a vendor. The proxy forwards allowed paths without converting Messages, Chat Completions, and Responses or guessing a fallback protocol.

| Connection provider | Request interface |
| --- | --- |
| anthropic-compatible | /v1/messages |
| openai-compatible | /v1/chat/completions |
| openai-responses | /v1/responses |

## Current Harness contracts

| Harness / Runtime protocol | Messages | Chat Completions | Responses |
| --- | --- | --- | --- |
| Built-in Pi 1.5.2 / OpenCode 1.2.27 | Declared | Declared | Declared |
| pi-v1 / opencode-v1 / openclaw-v1 | Declared | Declared | Declared |
| codex-v1 | Unsupported | Unsupported | Declared |
| hermes-v1 | Unsupported | Declared | Unsupported |
| claude-code-v1 / deepseek-v1 / aider-v1 / hexagon-json-v1 | Declared | Unsupported | Unsupported |

This describes Hexagon adapters, not all upstream project functionality or live acceptance for every image/endpoint. OCI registrations pin versions and compatibility metadata. Existing registrations do not automatically expand when adapters change; inspect the actual registration and create a new version where required.

## A shared protocol is only one requirement

Tasks depend on streaming, tool calls/results, continuation, errors, and actual model capability. A greeting response does not establish functioning Tools. An endpoint's compatibility claim does not establish every optional field or mode.

Responses validation currently uses store:false. It does not promise server-hosted built-in tools, background polling, WebSocket mode, or other protocol extensions. Harness Tools continue through the platform mailbox and approval system.

Some OpenCode/Pi Responses tests use actual binaries with a deterministic endpoint. That validates those protocol branches, not every live account. Cloud evidence must identify endpoint, model ID, Harness version, SDK, and task scope.

## Select and diagnose

Intersect the endpoint's actual protocol with Harness support. codex-v1 requires a real Responses endpoint; renaming a Messages connection cannot convert it. Do not append the final operation path to the base URL.

For incompatible_model, inspect protocol selection before credentials. For validation failure, check network, permissions, exact model ID, and response shape. Revalidate/re-enable after correction, then execute the required real journey.

Sources: [Runtime protocols](../../../../modules/harnesses/protocols.ts), [Pi](../../../../integrations/harnesses/pi.ts), [OpenCode](../../../../integrations/harnesses/opencode.ts). Next: [model configuration](models.md), [combination selection](choose.md), [matrix](../../../../testing/execution-matrix.md).
