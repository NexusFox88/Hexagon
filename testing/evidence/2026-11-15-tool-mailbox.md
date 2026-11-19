# Tool broker and sandbox MCP mailbox

Implemented the worker-to-runtime tool mailbox: an MCP stdio bridge submits a stable call UUID to a Run-scoped local endpoint, the control-plane worker polls pending calls, ToolBroker enforces authorization and approval, and results are durably returned to the same call. Worker recovery can claim waiting authorization/approval Runs. HTTP JSON tools are registered in the control-plane assembly.

External tool credentials stay in the broker. The bridge receives the declared manifest and a Run-scoped mailbox token, not a provider/tool credential. The runtime management endpoint rejects that token. This is API scope separation, not OS-user isolation within the sandbox.

OpenCode configuration was checked against the pinned v1.2.27 source, since current V2 documentation uses a different MCP configuration shape:
https://raw.githubusercontent.com/anomalyco/opencode/v1.2.27/packages/opencode/src/config/config.ts
MCP stdio and tools protocol reference:
https://modelcontextprotocol.io/specification/2024-11-05/basic/transports
https://modelcontextprotocol.io/specification/2024-11-05/server/tools

Verified locally:
- `npm run check`: passed.
- `TEST_DATABASE_URL=postgres://hexagon@127.0.0.1:55432/hexagon npm test`: 19 tests across 8 files passed.
- `python3 -m unittest discover -s runtime -p 'test_*.py'`: 6 tests passed.
- Broker test uses a real localhost HTTP service and PostgreSQL: absent auth waits, no write before approval, one write after approval, cached replay does not write again, ambiguous non-idempotent write is not blindly retried, cancelled Run rejects a fresh call.
- New transport test launches the actual Python runtime and MCP bridge subprocesses, exercises initialize/list/call over stdio, polls a pending call over HTTP, delivers the result twice, rejects conflicting result replacement, checks management-token separation and cancellation.

Remaining evidence gaps: real OpenCode/MiniMax/cloud execution through this new tool path; full GUI onboarding; complete user-journey acceptance. The tests above are not evidence of those outcomes. Tool argument JSON Schema validation and explicit resolution for unknown writes remain to be completed.
