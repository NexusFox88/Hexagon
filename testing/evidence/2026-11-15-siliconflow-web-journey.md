# SiliconFlow international model — both SDK Web tasks

Date: 2026-11-15. Status: real API-driven Web journeys verified; this run did not exercise GUI onboarding.

The user clarified the credential belongs to an overseas account. The [official international quick start](https://docs.siliconflow.com/en/userguide/quickstart) specifies `https://api.siliconflow.com/v1`. The existing `siliconflow_api_key_polygala` returned HTTP 200 for the model list at this endpoint. A previous domestic-endpoint 401 does not mean this international key is invalid.

Bounded Anthropic-compatible requests for `MiniMaxAI/MiniMax-M3` returned service HTTP 500. `deepseek-ai/DeepSeek-V4-Flash` returned HTTP 200 and a genuine assistant response using the existing x-api-key authentication. No LLM gateway or credential-auth workaround was introduced.

Command:

```
HEXAGON_MODEL=siliconflow HEXAGON_WEB_SMOKE=1 HEXAGON_BOTH_SDKS=1 npx tsx tooling/smoke-api.ts
```

Exit 0. Private evidence: `.local/evidence/api-smoke-1d1327d5-3a78-42f0-b852-aeb207818c5b.json`.

Combination: OpenCode 1.2.27, E2B, SiliconFlow international DeepSeek-V4-Flash. The Harness calls the user endpoint directly from the sandbox.

- TypeScript Session `b4998b47-f23b-465f-8a4b-9f0d4baa1c4b`, task Run `a77181d3-ba00-40f3-a3f5-753668d9ca75` completed. Independent fixed acceptance tests reported 8 assertions passed; original test file remained unchanged. 897 durable events and cursor replay were verified.
- Python independently created Session `0e16edd6-bd4c-4522-9a94-3674e15ea319`, task Run `daee6fda-9fbb-4ea0-b9f2-14f96fef2023` completed. The independent test passed, artifacts were captured and 882 events were replayed.
- Each task read authenticated requirements, waited for report authorization, required approval and wrote exactly once after approval (zero before).
- Follow-up Runs and bidirectional cross-language continuation completed in the same respective Sessions.
- Web preview content and access checks passed. Python verified revoked and closed preview access denial.
- Cancellation, Session close, artifact retention and product cleanup passed. Provider resource cleanup and the test-created template cleanup were both confirmed.

This expands model/provider-combination evidence on E2B only. It does not establish Daytona connectivity, GUI-first setup, custom Harness registration or all fault and network branches.
