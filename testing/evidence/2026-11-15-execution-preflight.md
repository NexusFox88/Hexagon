# Capability discovery and pinned Session policy

Command: `TEST_DATABASE_URL=postgres://hexagon@127.0.0.1:55432/hexagon npx vitest run testing/execution-preflight.test.ts` passed. `npm run check` passed. The complete suite subsequently passed 20 files / 44 tests; after adding explicit `tool_bindings` to the snapshot, the preflight and SDK-interoperability tests were rerun and passed.

This test uses an actual local HTTP server, the public TypeScript SDK and isolated PostgreSQL persistence. It uses the product E2B/Daytona/model/HTTP Tool configuration schemas and capability declarations, and the real OpenCode/Pi Harness registry definitions. Only credential validation is replaced with a controlled successful check. No cloud task or model execution is claimed by this test.

Verified:

- Catalog contains the exact registered OpenCode/Pi versions, E2B allowlist support, Daytona's lack of that capability, and HTTP Tool approval support.
- Unknown Harness versions, a conversation-only Harness with tools, an incompatible model provider, missing required capabilities, an unsupported Sandbox network policy, missing tool bindings and undeclared bindings are rejected through HTTP.
- Failed combinations leave no Session rows and perform zero provider operations.
- An E2B/OpenCode/Anthropic-compatible/HTTP Tool combination explicitly requiring files, commands, preview, conversation, tools and approval is accepted.
- The resulting Session returns the exact Harness version, 180-second resource timeout, selected domain allowlist, resolved capability set, tool-name/connection-ID binding and each selected connection's version/configuration.
- Editing the live Sandbox template leaves the persisted Session definition unchanged.
- Neither successful nor rejected preflight creates resource-operation rows or accesses a cloud connector. The accepted, unprovisioned Session closes normally through the public API.

A real defect was corrected: Session compatibility previously merged only Sandbox and Harness capabilities, so requiring `approval` rejected otherwise working HTTP Tool combinations. It now derives approval support from bound Tool adapters and Harness tool support. New Sessions also expose the resolved capabilities and explicit tool bindings rather than making callers infer bindings from an unordered set of connection records.

Actual execution, approval, continuous conversation and Web preview remain supported by the separate E2B/OpenCode/Pi/custom-Harness cloud journeys. This preflight test does not certify untested provider/Harness combinations or prove cloud network enforcement; those remain separate entries in the acceptance ledger.
