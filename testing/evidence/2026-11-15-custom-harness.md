# Registered custom Harness — real cloud acceptance

Date: 2026-11-15. Status: custom source package registration and both API-driven SDK Web tasks verified on E2B.

## Implementation

`POST /v1/harness-packages` and both SDK registration methods persist tenant-owned immutable source packages. Migration 008 stores the version, content digest and source. The tenant-aware Harness registry supplies both the catalog and actual worker resolution. Custom code executes only in the Sandbox, through the shared connector and Runtime; no source is imported by the control plane.

The package adapter checks uploaded bytes, accepts an explicit interpreter and source entrypoint, passes Run/model/tool metadata through stdin, supplies scoped credentials through environment variables, and parses exactly one final result. Same-version content replacement is rejected. The protocol and limitations are documented in `docs/custom-harnesses.md`.

The tested package is `custom.python-agent@1.0.0`, SHA-256 `14a14055414a49d4c1e179fe56831f4e5e2bf717fdb8d11637b31202ed1f262a`. Its source is `examples/harnesses/python-agent/main.py`: an actual model-driven tool loop, not a canned task implementation. It calls SiliconFlow international DeepSeek-V4-Flash directly and exposes workspace commands plus the Run-scoped external-tool mailbox.

## Real execution

Command:

```
HEXAGON_HARNESS=custom HEXAGON_MODEL=siliconflow HEXAGON_WEB_SMOKE=1 HEXAGON_BOTH_SDKS=1 npx tsx tooling/smoke-api.ts
```

Exit 0, state verified. Private journal: `.local/evidence/api-smoke-bd3fa042-fa5c-47fc-bff6-dbf73cb4a07c.json`.

- The TypeScript SDK registered the package through HTTP, then selected it in the usual AgentDefinition. Session `b6ba5431-f498-456f-b765-a3a21efd9dc2`; primary Run `3f0a37fb-c19a-459d-b574-770cc3c6f761`.
- Python independently created Session `e4c790b0-692b-403a-95a8-f34a9207d040`; primary Run `7f8fc2b3-92ec-47b8-82f6-e30ad672d50c`.
- Both tasks completed. Independent execution of the unchanged fixed tests reported 8 assertions passed for each task.
- Both performed authenticated requirements reads, waited for report authorization and approval, and wrote once after approval with zero writes before it.
- Both exported and downloaded artifacts, checked Web previews, replayed event cursors, completed follow-up Runs and cross-language continuation in both directions.
- Cancellation and Session close completed. Artifacts remained available. Python checked revoked/closed preview access denial.
- Product cleanup, provider resource deletion and test-template deletion were confirmed. Finished 02:37:10 UTC.

## Local checks

`npm run check` passed. Full PostgreSQL regression: 40 tests across 18 files passed. After extending SDK protocol coverage to registration, the targeted SDK/package suites passed all 4 tests. Python source and SDK compiled successfully.

Package tests cover invalid paths, absent entrypoint, file/directory conflicts, byte corruption, strict result interpretation, tenant isolation, exact-version resolution, immutable content and reconstruction from persistent storage. The SDK protocol test calls registration from TypeScript and Python and verifies the same content digest.

## Limits

This evidence establishes the required custom-package cloud execution branch on E2B. It does not prove GUI-first onboarding, a custom package on Daytona, arbitrary package authors' claimed capabilities, binary package distribution or all fault/network branches. The example emits a final response and shared external-tool events; it does not emit detailed progress for every internal shell/model step. There is no additional isolation boundary between a custom Harness and other code inside its assigned Sandbox.
