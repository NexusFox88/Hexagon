# Real cloud harness with authorization and approval

Command: `HEXAGON_TOOL_SMOKE=1 npx tsx tooling/smoke-api.ts`

Successful private journal: `.local/evidence/api-smoke-5ca16773-b9fb-4780-bd33-dd45d58b3073.json`.
Real components: public HTTP API, TypeScript SDK transport, PostgreSQL, worker, E2B 2048 MiB cloud sandbox, Python Runtime/MCP bridge, OpenCode 1.2.27, user MiniMax endpoint. External requirements/report services are controlled localhost HTTP fixtures reached only by the control-plane broker.

Verified:
- Model called the requirements MCP tool, edited the uploaded Python implementation, and ran its fixed tests.
- Independent execution returned exit 0; original test file was unchanged.
- Report tool was initially uncredentialed. Same Run entered waiting_authorization; API credential registration, verification and enablement resumed it.
- Same Run entered waiting_approval. Report writes before approval: zero. Repeated approval decision remained idempotent; final report count: one.
- Final assistant output and completed Run were available through the API.
- All 548 persisted events were read across pages; cursor replay matched the full suffix.
- Follow-up in the same Session completed.
- Product Session-close API cleaned the sandbox; independent provider inspection confirmed absence. Test template removal was also confirmed.

Earlier attempt `.local/evidence/api-smoke-48efa4de-07ee-492b-8e23-3f974f264a20.json` completed the tool/task path but failed the test script's event comparison. It compared two 500-row pages instead of the complete suffix. The script now drains all pages. Earlier sandbox/template cleanup was confirmed; the failed attempt remains recorded as failed.

Additional changes: Ajv validates Tool argument schemas at registration and actual arguments before authorization/approval/remote execution, without coercion. Invalid arguments produce an MCP tool error and no approval or HTTP write. Waiting Runs may fail if their harness exits, and an expired lease can be recovered in either waiting state.

Validation after the successful cloud process stopped:
- `npm run check`: passed.
- `TEST_DATABASE_URL=postgres://hexagon@127.0.0.1:55432/hexagon npm test`: 22 tests across 9 files passed.

Limits: this uses an arithmetic fixture, not the complete Web filter application; credential onboarding is automated through API, not GUI. Fleet, preview, artifact export, both-SDK full tool journey, additional harnesses/providers, custom harness, and full fault/security branches remain outstanding. No full acceptance ledger items are claimed complete by this partial journey.
