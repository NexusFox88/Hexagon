# Pi with SiliconFlow international — both SDK Web journeys

Command: `HEXAGON_HARNESS=pi HEXAGON_MODEL=siliconflow HEXAGON_WEB_SMOKE=1 HEXAGON_BOTH_SDKS=1 npx tsx tooling/smoke-api.ts`.

Result: exit 0, state verified; product, provider resource and template cleanup confirmed. Finished 2026-11-15 04:54:53 UTC. Private journal `.local/evidence/api-smoke-ec4e9e16-514e-4aec-8426-67578d070196.json`.

Combination: Pi 1.5.2 in E2B, directly using `https://api.siliconflow.com` with DeepSeek-V4-Flash and the existing `siliconflow_api_key_polygala`. The control plane does not proxy model requests. No product code change was needed for this endpoint substitution.

- TypeScript Session `ce59b855-6a4a-44d8-90e3-81e4131d0691`, primary Run `44bb0b82-13af-404b-80c8-a910e06773c2` completed. Independent unchanged fixed test execution: 8 assertions passed. Durable events: 1,259, replay checked.
- Python Session `40a8609e-d0f0-4f44-bb2b-231b181715d5`, primary Run `adb6f696-d21d-4a14-a82f-be7b9833de80` completed. Required artifacts include filter.mjs and test-report.txt; the latter records 8 assertions passed. Durable events: 1,168, cursor resume checked.
- Both tasks performed actual requirement reads, implementation, authorization wait and approved report writes. Python records zero writes before its approval and one after; the suite checks two total reports across the two independent tasks.
- Authenticated previews worked after Run completion; anonymous, revoked and closed access checks passed as applicable in the shared journey.
- Same-Session follow-up and Python-to-TypeScript/TypeScript-to-Python continuation succeeded.
- Cancellation, close, retained artifacts/output and independent provider resource absence passed. No test-created template remains.

Scope: API-driven connection/credential setup using the shared Console-backed API. This is not a fresh GUI-first initialization run or a Pi-specific active-child cancellation test. Shared GUI and Linux Runtime evidence remain separate. Daytona is not covered, and the user explicitly deferred its network configuration while other acceptance continues.
