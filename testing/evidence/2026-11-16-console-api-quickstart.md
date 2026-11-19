# Console navigation and complete API/SDK invocation — 2026-11-16

User requirement: regroup functionality into infrastructure, runtime management and Agent capabilities; make the path from configuration to API invocation clear and actionable.

## Implemented

- Navigation: Infrastructure (Sandbox connections, Secrets), Operations (Fleet), Agent capabilities (models, Tools, protected APIs, API & SDK). Existing routes remain stable.
- `#quickstart`: actual ready/enabled connections, catalog Harness versions, model compatibility and Tool-capability filtering. Explicit required selections, optional Tool/HTTP bindings, editable task and named binding mapping. Server preflight remains authoritative.
- Connection-row invocation actions seed this page. The previous incomplete-fragment dialog was removed.
- Complete Python/TypeScript source, local installation/run commands, copy/download and HTTP endpoint reference. Only public IDs enter code. Token comes from environment or local owner.json at execution time.
- Generated programs create Agent/Session, preflight, submit once, poll a single Run, print output, surface approval/authorization waits and recovery error codes. Failure cleanup cancels active work, waits boundedly for terminal state and only then closes. Unconfirmed cleanup retains IDs for Fleet reconciliation. No automatic approval or blind submit retry.
- Python source uses readable native dictionaries and booleans. Source generation is a browser-neutral module; rendering/state is separate from main Console orchestration.

## Deterministic verification

`npx vitest run testing/console-quickstart.test.ts testing/console-i18n.test.ts testing/console-ui-contract.test.ts`: **3 files / 17 tests passed**, 15:46:48 Asia/Shanghai.

Twelve new tests execute generated programs as separate Python/Node processes through the actual repository SDK clients against a local simulated HTTP service. Both languages cover completed, failed, preflight refusal (no Session created), waiting approval, polling failure (cancel before close), and unknown cleanup. Assertions check literal quotes/backslashes/newlines/Unicode/template-like task input, actual binding payloads, one idempotent submission and resource-close ordering. This is simulation, not cloud evidence. The TypeScript test package delegates to the real SDK source; package installation was tested separately below.

`npm run check`, JS syntax checks, and type-checking the GUI-generated `.local/console-quickstart/accepted.mts` against the built locally installed SDK passed.

Actual local-source installs passed: `npm --prefix sdk/typescript run build`, `npm install --prefix .local/console-quickstart --no-save ./sdk/typescript`, Python venv creation and `pip install ./sdk/python`. Product instructions additionally state repository-root execution and existing npm dependencies.

## Browser review

Ego space 21, local authenticated Console:

- Both-language navigation and invocation page; initial incomplete selection does not generate/copy a program.
- Sandbox-row action seeds the corresponding connection. Model, exact Harness version and task generate runnable source.
- Selecting a Tool after a conversation-only Harness clears the incompatible Harness and blocks generation until a compatible Harness is chosen.
- Locale changes preserve selected connections, Harness, Tool checkbox and user task.
- Copy succeeded; downloaded `hexagon-example.py` bytes exactly matched displayed source.
- English/Simplified Chinese desktop and narrow layouts inspected. Requested 390px emulation reported 433px layout viewport; measured document width 421px. Selector and code scrolling remain application-owned.
- Screenshots: `applications/quickstart-zh.png`, `quickstart-en.png`, `quickstart-zh-narrow.png`, `quickstart-en-narrow.png`.

## Real execution and local environment

Initial generated Python attempt: Session `147d4b5c-5d25-4ce3-bcff-e5dd95690454`, Run `5dbdec2e-cc49-4581-9a68-2bcbb1e20062`. Instabox create hit ECONNRESET and remained uncertain. Direct unauthenticated endpoint checks returned 401 normally; Node with the existing environment proxy returned ECONNRESET. Setting `NO_PROXY` to include `api.instabox.sh` restored direct connectivity. The managed service was restarted with that runtime environment override; no provider credential changed. One tunnel startup failed, the subsequent startup became reachable. This host environment workaround is not a provider adapter code change.

The initial Run was cancelled through the API. Session close still returned `sandbox_creation_unconfirmed` after the provider list returned no matching machine; the existing conservative reconciliation rule was preserved. Do not classify that attempt as successful or its unknown creation as definitively settled. Private evidence: `.local/console-quickstart/python-run.log`, `python-evidence.json`, `initial-cleanup.json`.

This attempt also exposed an initial example defect: active Runs must be cancelled before Session close. The source generator was corrected and the new polling-failure/cancellation tests passed before the fresh programs were executed.

### Fresh real cloud programs passed

With the direct Instabox endpoint exception in the local service environment, the complete GUI-generated programs ran through locally installed SDK packages against actual Instabox / Pi 1.5.2 / the configured SiliconFlow model connection, sequentially for the account quota:

| Client | Session | Run | Result |
|---|---|---|---|
| Python | `1f634443-eda1-4118-95b5-d9fd4f959bee` | `6465380c-5566-42a6-aeed-56038e5eb020` | completed, Chinese Agent reply, script exit 0, Session closed |
| TypeScript | `55bddf57-350f-4206-9b2d-06d49a987328` | `44e9089e-d6d4-400c-835b-1a23d2327aaa` | completed, Chinese Agent reply, script exit 0, Session closed |

Python experienced a recoverable runtime transport error; the same Run subsequently completed. No duplicate submission was made. These were first-conversation invocation tests with no Tool or protected API selected, not a rerun of the full historical Web/artifact/approval journey.

Commands: `.local/console-quickstart/venv/bin/python .local/console-quickstart/accepted.py` and `node --import tsx .local/console-quickstart/accepted.mts`, from the repository root, with output retained in the corresponding `*-accepted.log` files. Source bytes/hashes, exact Session/Run/event records and answers are in `.local/console-quickstart/accepted-evidence.json`.

Independent provider reconciliation after both successful programs: both recorded machine IDs were absent and both operation-name lookups found no remaining machines. Both Sessions were closed. The initial uncertain attempt also had no matching machine, but remains `closing` with an `unknown` creation operation; this is intentionally not reclassified as confirmed cleanup. Exact IDs and audit observations are retained in `.local/console-quickstart/resource-audit.json`.

Final `npm run local -- status` at 07:50:05 UTC: API/database/credential store ready, credential proxy reachable, worker running, no active Runs. Console is retained on the Chinese API & SDK page with usable selections. The `NO_PROXY` exception is a process environment workaround for this launch, not a persisted change to the user's shell or provider adapter.
