# First successful real OpenCode / MiniMax cloud task

Command: `HEXAGON_MODEL_SMOKE=1 npx tsx tooling/smoke-e2b.ts`.

Private journal: `.local/evidence/e2b-05cca71f-8356-42b0-9c4b-9963acedca30.json`.

## Observed success

- Built a test-owned E2B template with 2048 MiB memory, based on `base`.
- Created the sandbox, bootstrapped the Python runtime, and installed pinned OpenCode 1.2.27.
- OpenCode called the user-configured MiniMax-M3 endpoint from the sandbox.
- The actual harness emitted step/text/tool events and an assistant reply describing the implementation of `add(a, b)`.
- Independently executed `python3 test_calculate.py` after the harness exited: exit 0, stdout `2 assertions passed`.
- Native harness exit code was 0 and a native Session ID was captured.
- Sandbox deletion and test template deletion were both confirmed.

This is a real model/harness/provider integration test, not a scripted reply. It is still a small arithmetic fixture through the internal runtime client, not the full API/GUI/SDK acceptance journey.

## Diagnosed prior failure

Inspected the official `opencode-ai@1.2.27` npm package launcher. Its child `spawnSync` signal termination has `status: null`; the launcher maps a nonnumeric status to exit 0. Executing the native postinstall binary directly exposed exit -9 (SIGKILL) in the approximately 473 MiB default sandbox. Logs stopped during plugin initialization. The same integration succeeded with a 2 GiB template. This strongly supports memory pressure as the cause; no kernel OOM log was obtained.

The adapter now executes the native binary, checks known sandbox memory before installation, and rejects a known allocation below 2048 MiB. The E2B adapter exposes observed memory allocation and reuses sandbox connections instead of reconnecting for each file/command operation.

Additional direct validation: `npx tsx tooling/validate-model.ts` returned `verified` for the bounded Anthropic-compatible messages credential check.

## Verification limits and next steps

The successful run independently executed the test file but did not independently compare that file's bytes to its original value. The smoke script now includes that comparison and saves changed source; those additional assertions were added while the successful process was already running, so they were not part of this result. A subsequent run must exercise them.

The native-session continuation parameter is implemented but real follow-up execution has not been tested. Durable worker coordination, public API final output, tool broker/auth/approvals, artifacts, GUI, Python/TypeScript clients, alternate combinations and the complete original acceptance remain pending.

Project input upload API and PostgreSQL storage were also implemented this turn. Local integration assertions cover exact bytes, path traversal, tenant isolation and rejection of input changes after the first Run submission.
