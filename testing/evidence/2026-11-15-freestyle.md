# Freestyle VM acceptance

Official SDK `freestyle@0.2.23` is pinned. Sources: [VMs](https://www.freestyle.sh/docs/vms), [lifecycle](https://www.freestyle.sh/docs/vms/lifecycle), and the installed SDK source/types. This uses v5 VMs, not deprecated devservers.

## Real primitives and private HTTP

`NODE_USE_ENV_PROXY=1 npx tsx tooling/probe-freestyle.ts` passed, journal `freestyle-8f188e7a-a22d-4ace-a629-36dd953cd88e.json`: real VM, Node/Python, 256 KiB binary file write/read, exact slug reconciliation, deletion and explicit 404.

`NODE_USE_ENV_PROXY=1 HEXAGON_FREESTYLE_TRANSPORT=1 npx tsx tooling/probe-freestyle.ts` also passed, journal `freestyle-8df6dfd4-c2d3-48c7-86ee-b1cd3062dbcb.json`. The VM has outbound Internet only and no public inbound/domain rule. A provider-authenticated raw PTY carries the shared TCP relay: Content-Length and EOF 256 KiB binary delivery and missing app bearer 401 all passed. Remote startup explicitly switches the terminal to raw mode before a unique readiness marker; no line discipline/echo can corrupt HTTP. The 45-second remote bound and request-scoped kill/session close limit failed transports. SDK callbacks are bounded to 8 MiB queued output / 16 MiB input.

Both probe VMs were deleted. A separate exact-ID audit of the private-probe firewall rule returned 404 (`freestyle-8df6dfd4-c2d3-48c7-86ee-b1cd3062dbcb.json.firewall-audit.json`). No public network route was created.

## Registered Connector, Runtime and expiry

The API/worker registry and Console now support Freestyle base snapshots ubuntu-sm (2 vCPU / 4 GiB) and ubuntu (4 vCPU / 8 GiB). Provider TTL is backed by the shared persisted deadline/reaper. Automatic restart and idle pause are disabled; unsupported allowlists fail before allocation.

`NODE_USE_ENV_PROXY=1 HEXAGON_SANDBOX=freestyle npx tsx tooling/smoke-managed-expiry.ts` passed (`freestyle-c4bc5907-ff7d-4caf-9f08-ac8c78d51544.json`): real file delivery, authenticated Runtime protocol, anonymous 401, natural 90-second deadline, Session closure and provider-confirmed absence. This is managed-expiry evidence, not a native-TTL timing guarantee.

## GUI and regressions

Real ego-browser Console interaction passed provider selection, masked credential save, actual validation, enablement, snapshot read-back, changing ubuntu-sm to ubuntu causing validation invalidation and disablement, and deletion. The temporary connection was removed and Console retained for the user. Local control plane restarted idle/healthy at 10:23:41 UTC with configuration and credentials preserved.

Typecheck passed; the isolated full suite passed 35 files / 94 tests at 10:23 UTC. New regressions cover raw-marker fragmentation, binary/EOF fidelity, PTY cleanup, bounded output, unsupported egress before allocation and no implicit paused-VM execution. Provider-specific active cancellation, sleep/recovery and lifecycle fault injection remain separate verification work.

## OpenCode / SiliconFlow international: both SDKs

`NODE_USE_ENV_PROXY=1 HEXAGON_SANDBOX=freestyle HEXAGON_WEB_SMOKE=1 HEXAGON_BOTH_SDKS=1 HEXAGON_MODEL=siliconflow npx tsx tooling/smoke-api.ts` passed at 10:22:59–10:28:03 UTC, journal `api-smoke-14b5f6bb-6a91-45d7-9b0b-352ecc33fdcc.json`. Both independent tasks passed fixed unchanged assertions, requirement/report Tools, authorization/approval and actual writes, required artifact bytes, private preview, exact event replay (894 TypeScript / 830 Python), bidirectional continuation, queued cancellation, retention and confirmed cloud cleanup. Independent retained-record audit passed 1 journey / 2 primary Runs.

## Pi and custom Harness

Both SDK journeys also passed for Pi (`api-smoke-776c4c1b-b4fb-4a2f-b321-3817d639fad5.json`) and custom.python-agent (`api-smoke-da95cdef-78d3-4556-99f2-8085754bd4e2.json`). Both preserve all full-journey assertions: fixed tests, Tools/authorization/approval, preview, files, replay, bidirectional continuation, queued cancellation, retention and confirmed cleanup. Combined independent audit passed 2 journeys / 4 primary Runs. This completes the three current Harness combinations on Freestyle; it does not certify arbitrary custom source packages.
