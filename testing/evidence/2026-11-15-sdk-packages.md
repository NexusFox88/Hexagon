# Locally packaged SDK verification

The final delivery review found the TypeScript `dist` output was older than the workspace source and lacked recently added API methods. Existing source-import cloud tests did not prove those stale distribution files worked. Added `prepack` to rebuild before `npm pack`, rebuilt the current output, and added a repeatable package consumer check.

Command: `TEST_DATABASE_URL=postgres://hexagon@127.0.0.1:55432/hexagon npx tsx tooling/verify-sdk-packages.ts`. Exit 0; finished 2026-11-15 04:57:35 UTC. Private record `.local/evidence/sdk-packages.json` includes artifact hashes and temporary consumer directory.

Actual operations:

- npm prepack ran TypeScript compilation and produced `hexagon-agent-sdk-0.1.0.tgz` containing dist/index.js, dist/index.d.ts and package.json.
- pip built `hexagon_agent_sdk-0.1.0-py3-none-any.whl` with locally available setuptools, without build isolation.
- Installed the npm archive offline into a temporary consumer, with install scripts disabled; installed the wheel to a separate target with no index/dependencies.
- Verified Node import through `@hexagon/agent-sdk` package exports and Python's installed module path. New authorization-refusal and Harness-registration APIs are present.
- Ran the existing actual HTTP/PostgreSQL interoperability and authorization-refusal suites with the installed TypeScript module and installed Python target. Both test files passed, covering both-way Session continuation, upload, persisted SSE replay, custom package registration, Tool-call inspection/error routing, successful refusal through both clients, cached result delivery, tenant/hash/concurrency/stale-state guards and zero external writes.

The test fixture supports optional installed-module paths but defaults to source imports for normal development tests. `npm run check` also passed. README and SDK documentation were reconciled with implemented Console/preview/authorization behavior and still explicitly leave the Daytona matrix incomplete.

No npm/PyPI publication, git commit, cloud resource creation or model request occurred. This check verifies packaging and public protocol behavior; it does not replace the separately recorded full cloud task journeys.
