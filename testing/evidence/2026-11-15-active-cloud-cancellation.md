# Cancellation after a real Harness and child process have started

The earlier cloud smoke cancelled immediately after submit and could exercise only queued cancellation. New `HEXAGON_ACTIVE_CANCEL=1` waits for a model-started foreground Python process to write its PID/process-group marker, checks the Runtime is actually running, calls the TypeScript SDK cancel twice, and inspects both Harness and child process state before accepting the API terminal state.

## Defect and fix

First command: `HEXAGON_ACTIVE_CANCEL=1 HEXAGON_TOOL_SMOKE=1 npx tsx tooling/smoke-api.ts`. Journal `.local/evidence/api-smoke-57114b6d-387b-4e98-8be9-175eba8c7e70.json`. It failed: API state was cancelled but child PID 1843 remained live. Resource and template cleanup were confirmed. This is a real product defect, not a failed model instruction: the Harness's command ran in a separate process group, outside the supervisor's original killpg scope.

Runtime now snapshots descendants before stopping the Harness, signals those processes independently, and escalates after five seconds if needed. Linux `/proc` start times fence descendant PID reuse. The collector waits for cancellation settlement before writing the terminal state, so a live captured child cannot be presented as cancelled. Repeated cancellation shares the same settlement event. This covers descendants present at cancellation; it is not a general-purpose security boundary against arbitrary adversarial daemonization or unrelated Session background services.

## Verified results

- Native macOS `python3 -m unittest discover -s runtime -p 'test_*.py'`: 9 tests, 1 Linux-specific test skipped, remaining 8 pass. Initial sandboxed attempt could not bind the test HTTP server; the authorized loopback rerun passed.
- `npx tsx tooling/test-runtime-cloud.ts`: actual E2B Linux instance, all 9 tests passed with no skips. The new regression creates a descendant with a separate session/process group and SIGTERM ignored, then verifies cancellation only becomes terminal after it has stopped. Journal `.local/evidence/runtime-linux-5a501568-a401-4c6d-b0fc-6c20ce2d03a1.json`; Sandbox `i3l7rr8r5v74zihp36pv0`; cleanup confirmed.
- `npm run check`: passed.
- Repeat real cloud command: exit 0, verified; journal `.local/evidence/api-smoke-59492484-8708-4c6e-abb8-3c94d4dcee57.json`; product/provider/template cleanup confirmed.

The repeated journey uses real E2B, OpenCode 1.2.27 and MiniMax. Session `c0abf6b2-731d-4f47-8c46-5282bec27300`. Active cancellation Run `f3a23552-1bba-4d42-a6f4-dc834ad9547b`: Harness PID 1821, child PID 1862 in its own group 1862. Before cancellation Runtime is running; afterward Runtime and API are both cancelled, both processes are stopped, and the delayed completion marker does not exist. The preceding implementation task, report authorization/approval/write, independent fixed tests, artifacts, event replay and follow-up pass. Subsequent queued cancellation, Session close and retention also pass.

No commits or publishing. Both failed and successful test-owned resources have confirmed cleanup.
