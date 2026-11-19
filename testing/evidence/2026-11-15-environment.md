# User-defined execution environment — 2026-11-15

Implemented Agent `env` defaults and Session `env` overrides in the shared API, Python SDK and TypeScript SDK. Values are merged and frozen per Session, encrypted in SecretStore with tenant/resource/purpose binding, and excluded from ordinary definitions and public resource responses. Responses expose `env_names`. Migration 010 adds encrypted-map references and name lists.

The worker applies the Session map to Harness installation through a provider-independent command overlay, then to every durable Run invocation before Runtime starts the Harness. Internal adapter values win. This does not configure provider VM boot/image builds or unrelated Sandbox processes. GUI editing was not added.

## Verified

- `npm run check`: passed.
- `npm run build --prefix sdk/typescript`: passed.
- `python3 -m unittest discover -s runtime -p 'test_server.py'`: 9 tests, 8 passed, 1 platform skip. Includes real child-process inheritance, Runtime management-token exclusion, supervisor environment isolation and existing output redaction.
- API/SDK regression verifies TypeScript Agent defaults, Session override, Python Agent and Session inputs, response omission, encrypted storage, tenant/purpose rejection and reserved-name rejection.
- Local real-shell initialization test verifies multiline/empty/literal values, no value interpolation into command arguments, file mode 0600, scope mismatch rejection and parent-process isolation. Its first run exposed a quoting error in the test's nested Python command; corrected test passed. No product execution failure was inferred from that fixture error.
- Real cloud command: `NODE_USE_ENV_PROXY=1 HEXAGON_SANDBOX=boat HEXAGON_HARNESS=custom HEXAGON_ENV_SMOKE=1 HEXAGON_MODEL=siliconflow npx tsx tooling/smoke-api.ts`.
- Cloud journal: `.local/evidence/api-smoke-43a1e671-24e9-49c5-87ba-5f32d3316c46.json`; state `verified`, product/resource cleanup `confirmed`.
- Cloud Session `21372b4e-d633-4f2b-a0c9-b7c2ce6fe701`, primary Run `52520358-66ed-415d-ae65-6fcfa3d10c01`, state `completed`. The uploaded custom Python Harness performs assertions before its actual model loop: Agent default inheritance, Session override, empty string, literal multiline value with shell syntax, and child-process inheritance. It then calls SiliconFlow and completes the existing task/artifact/follow-up/cleanup journey.

This cloud probe used one provider, one custom Harness and the TypeScript client/shared HTTP path. Python API behavior is covered by the interoperability test. Earlier full provider/Harness matrix acceptance remains separate evidence; this increment does not claim fresh env-specific cloud execution on every provider or both SDKs. Daytona remains deferred.

Final regression: `TEST_DATABASE_URL=postgres://hexagon@127.0.0.1:55432/hexagon HEXAGON_TEST_TS_MODULE=/Users/hexagon-maintainer/CodeProject/Hexagon/sdk/typescript/dist/index.js npm test` passed all 40 files / 113 tests, including built TypeScript distribution interoperability with Python. Log: `.local/evidence/environment-regression.log`. An earlier invocation used a relative SDK module path that resolved incorrectly in one nested test suite; rerunning with the absolute path fixed test discovery.

Local control plane was verified idle, stopped gracefully, migrated through 010, and restarted as PID 40413. Authenticated health reported API/database/credentials ready and worker running/idle. Existing owner credentials and master key were retained. Console remains at `http://127.0.0.1:8787/console/`.
