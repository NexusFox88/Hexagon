# Fly Machines feasibility

Official sources: [Apps API](https://docs.fly.io/machines/api/apps-resource), [Machines API](https://docs.fly.io/machines/api/machines-resource), [OpenAPI](https://docs.fly.io/api/machines/openapi.json).

`NODE_USE_ENV_PROXY=1 npx tsx tooling/probe-fly-machines.ts` passed at 10:30:25–10:30:44 UTC. Private journal `fly-machines-09e13b51-b728-46b4-b465-575eb3b4367a.json` records a unique test App in personal, a unique isolated private network, one 2-CPU/2048-MiB Machine using node:24-bookworm, no public services, no restart, and auto-destroy after its bounded sleep. Actual Node 24.22.3 / Python 3.11.2 and 256 KiB binary write/read via exec stdin passed. Whole test App deletion was confirmed by 404. No existing App was modified; no public IP or volume was allocated.

The existing local fly/flyctl supports proxy and exact-Machine SSH. Its config directory must be isolated using FLY_CONFIG_DIR; credentials must remain in child environment, never command arguments or sandbox contents. Private transport, registration, GUI and full SDK journeys remain pending. This primitive probe is not full integration evidence.


## Private transport and Connector work

Actual SSH binary probe `fly-machines-0164545f-bd43-499b-8638-d0c773169131.json` passed and its App was deleted. Process inspection found the default flyctl background agent remained; that exact test-owned PID was terminated. Production transport therefore uses `FLY_AGENT_ISOLATED=1` and `FLY_WIREGUARD_TOKEN_MODE=1`, private temporary config, and credentials only in the child environment. The installed CLI is 0.4.111. The first isolated attempt (`157d4565-27ce-4d2d-8a57-9dcb4dc98e7b`) failed because this CLI requires config.yml to exist; its App was deleted. Creating an empty mode-0600 config fixed this: `9b00123d-a82b-429c-93ee-08714768101d` passed, and process inspection confirmed no remaining Fly agent/SSH processes.

`fly-machines-dd7f3553-e54b-43b5-96c8-9b8a7aa05c2e.json` passed at 10:39:53–10:41:23 UTC using the new request-scoped transport: 256 KiB SSH binary roundtrip, private HTTP with Content-Length and EOF-delimited binary bodies, and application-auth rejection (401). App deletion was confirmed. No public service was created.

The new Connector owns one App/private network per Session, retaining an empty App as a resource after partial creation. It does not classify a failed Machine list as App absence. It rejects stopped or ambiguous Machines before commands. Three targeted regressions and both existing tunnel tests passed (5 tests); the initial tunnel test attempt was denied localhost listen by the execution sandbox, then passed with localhost access. TypeScript checking passed before the final file-transfer adjustment.

Initial real Connector/Runtime attempt `fly-machines-b8d37e93-3dc2-425e-9465-65c6b17d1bac.json` passed provisioning and small files but failed Runtime upload with HTTP 413. Its App was confirmed deleted. File blocks now use exec stdin instead of embedding bytes in command arguments, matching the successful primitive probe. Runtime/expiry rerun is in progress. Registry/GUI and full SDK journeys are not yet complete.

Official lifecycle guidance for the isolated agent and token mode is documented in the [Fly agent package](https://pkg.go.dev/github.com/superfly/flyctl@v0.5.5/agent); command selection uses the [SSH console reference](https://docs.fly.io/flyctl/cmd/fly_ssh_console). Actual installed-version behavior is recorded above.


## Registered Connector and GUI

Fresh `fly-machines-d158ce8d-aee5-4188-b8b6-2e7f007c104b.json` passed after the stdin change: real file transfer, Runtime ready/protocol 1, missing bearer 401, natural 180-second durable expiry, and confirmed whole-App deletion. The extended 180-second deadline allows this provider's installation/SSH startup time; this is not a claim of 90-second acceptance.

The shared registry and Console now expose `fly-machines`, with organization/region fields and an explicit local flyctl prerequisite. Actual Console CRUD passed in the existing browser task: create with masked credential, validate, enable, read saved personal/iad configuration, edit region to ord, observe draft/disabled, and delete the test connection. The Console was left empty for the user's own configuration. The local service was reloaded as PID 15276 with API/database/credentials/worker ready.

`npm run check` passed. Full regression with the isolated local PostgreSQL test database passed 36 files / 97 tests. OpenCode, Pi and custom Harness dual-SDK cloud journeys are running; they remain pending until output/artifacts and provider cleanup are confirmed.


## Full-task latency failure and transport revision

The initial per-request SSH implementation failed all three TypeScript-first full journeys with `run_timeout`: OpenCode `api-smoke-bab59ed7-4971-44a0-a0e3-6ce0d66317ad`, Pi `api-smoke-6b829f78-8aa5-4459-8cdc-b9ff5bf9460b`, custom `api-smoke-76610776-1703-4ff0-992b-50932f83b267`. All three journals confirm resource cleanup. OpenCode reached tool authorization, but no full journey passed. These attempts are not superseded into success.

A real exact-Machine TCP proxy probe `fly-machines-202e9873-21a0-4f6b-933e-185674b47818.json` passed private binary Content-Length/EOF and authorization checks, with App cleanup confirmed. The Connector now leases and reuses this authenticated proxy instead of starting SSH for every Runtime request. Account credentials key the cache by hash; credential rotation gets another proxy. Two focused tests passed concurrent lease sharing, idempotent release, App cleanup and credential rotation isolation. A bounded guest IPv6 forwarder supports IPv4-only preview services. It is killed on proxy close with a unique command marker guarding PID reuse, and has a six-minute fallback timeout. Runtime and missing-auth checks passed in the current managed-expiry rerun; full reruns have started with the new transport.


Fresh pooled-proxy managed-expiry journal `fly-machines-abcae11a-e910-48cc-b14a-61f7ecaf3fa4.json` is verified: Runtime protocol/auth, files, natural 180-second deadline, whole-App deletion and final absence all passed. TypeScript checking passed, and the complete suite passed 37 files / 99 tests at 11:00 UTC. New full journeys are `api-smoke-9b7ca3d9-6d7b-4e9c-9d51-2295eb2b3348` (OpenCode), `api-smoke-d30869a1-ac7f-4be7-abc3-f10a1c03e567` (Pi), and `api-smoke-cf6c67a4-014a-4880-8750-78442f969003` (custom); all remain pending final results and cleanup.


## OpenCode and Pi dual-SDK results

OpenCode `api-smoke-9b7ca3d9-6d7b-4e9c-9d51-2295eb2b3348.json` and Pi `api-smoke-d30869a1-ac7f-4be7-abc3-f10a1c03e567.json` both reached verified with resource_cleanup confirmed. Each completed independent TypeScript/Python tasks, tools and approval, fixed assertions, binary artifacts, private previews, event replay, cross-language continuation, cancellation, Session closure and retained output. Pi ran 10:59:41–11:06:56 UTC and recorded 498 TypeScript / 999 Python primary events. Combined retained audit verified 2 journeys / 4 primary Runs with matching artifact bytes/hashes, fixed 8-assertion reports, terminal events and no unresolved resource operation.

Custom `api-smoke-cf6c67a4-014a-4880-8750-78442f969003.json` completed tasks but failed its Python first preview (502); the diagnostic private request then returned 200 and the guest IPv4 service returned the expected page. Cleanup was confirmed. The proxy previously reported ready on local TCP listen alone. It now waits for an actual remote HTTP HEAD response without credentials (401/404/405/501 are sufficient connectivity evidence). A new regression makes the first upstream connection fail and confirms readiness waits for the next successful HTTP response. Full suite passed 37 files / 100 tests after this change. Custom fresh journal `api-smoke-a855cc5f-580d-4619-9786-f7306f36e1df.json` is running and remains pending.


## Final fresh results

Custom `api-smoke-a855cc5f-580d-4619-9786-f7306f36e1df.json` passed at 11:08:54–11:15:53 UTC after remote-HTTP readiness was added. Both SDK main Runs emitted 17 events; first previews, tool authorization and exactly-once approved reports, fixed assertions, artifacts, continuation, cancellation and close all passed. Resource cleanup is confirmed. The earlier first-preview failure remains failed evidence.

OpenCode's successful journal ran 10:59:33–11:09:57 UTC with 1041 TypeScript / 876 Python primary events. The final combined retained audit verified all 3 successful journeys / 6 primary Runs. No outstanding Fly agent, proxy or SSH processes remained after all test processes exited. The local service is running the final readiness fix as PID 22686; API/database/credential/worker health are ready. No commits or publication were performed.


Final independent provider read-only audit `.local/evidence/fly-final-resource-audit.json` verified **20 exact test-owned App IDs**, collected from all Fly primitive/managed-expiry and full SDK attempt journals (successful and failed). Every App returned provider HTTP 404. No broad account cleanup or unrelated resource mutation was performed.
