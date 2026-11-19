# Add a Harness adapter

A Harness adapter connects an agent implementation to Hexagon's existing Runtime, model access and Tool broker. It translates launch configuration, results and continuation state. Runtime owns the processes; the control plane owns Session/Run, durable events, credentials, approvals and cloud resource cleanup. Do not start a second control-plane service or put Harness execution in the API process.

Read [the integration contract](../../../harness-integration-contract.md) and [architecture](../../../architecture.md). The following workflow extends a real implementation; registration alone does not establish compatibility.

## Choose distribution and protocol separately

Prefer an [OCI image](../integrations/harnesses/oci.md) for a new integration. It pins the interpreter and dependencies and resolves to a linux/amd64 manifest digest. A Dockerfile recipe is not a published image, and a published image is not an executed combination. Private registry support also depends on the Sandbox provider.

The [source-package format](../integrations/harnesses/source-package.md) remains a compatibility path for Python/Node source using `hexagon-json-v1`. It does not orchestrate dependency installation. Both paths store tenant-owned registrations and pin versions; the control plane does not import uploaded source. Reusing an existing id/version with changed content conflicts. Select a new version and create a new Session when changing the pinned definition.

Check [protocols.ts](../../../../modules/harnesses/protocols.ts) for model protocols, Tools and continuation semantics. For example, the current Codex adapter declares Responses, Hermes declares Chat Completions, and Aider does not declare remote Tools. An image label cannot add executable protocol support. Extending a protocol requires implementation and rejection tests, not just another catalog value.

## Trace the three adapter methods

[HarnessAdapter](../../../../modules/execution/harness.ts) is the authoritative interface:

| Method | Responsibility | Review question |
| --- | --- | --- |
| `install(connector, sandbox)` | Place required adapter/bridge files in the guest | Are dependencies pinned and installed in the Sandbox rather than executed in the control plane? |
| `invocation(...)` | Return command argv, environment, optional stdin and Tool definitions | Are input, model access, native Session and initialization mapped without shell interpolation or credential leakage? |
| `result(stdout)` | Interpret the real final response, native identifier and failure flag | Do missing, malformed, duplicate or upstream-error results fail honestly? |

Use [OCI runtime-adapter.ts](../../../../modules/harnesses/runtime-adapter.ts) for the existing dispatch and [managed-cli.ts](../../../../modules/harnesses/managed-cli.ts) for managed CLI result handling. OCI supplies dependencies; the adapter installs bridge/configuration support rather than silently replacing the pinned CLI. Keep argv as separate strings and test actual upstream flags at the pinned version. Do not rely on a daemon entrypoint when the contract expects one supervised invocation.

Model access comes from the worker's scoped configuration. Preserve its proxy URL and delegated authentication arrangement; do not replace it with a vendor endpoint or account key. Where required by the CLI, retain the proxy's `/v1` prefix. Raw upstream model/provider keys stay in the control plane. Never log environment credentials, place them in artifacts, or enable unrelated account integrations implicitly.

## Build from the minimal Python Harness

The existing [Python Agent](../../../../examples/harnesses/python-agent/main.py) is a real model-driven loop with shell execution, Tool mailbox access, bounded steps and local conversation history. Its [OCI Dockerfile](../../../../examples/harnesses/oci/custom-python/Dockerfile) pins the base image and selects `hexagon-json-v1`. Read both before adapting them. Shell execution is part of the guest's power, not a new isolation boundary.

An OCI build from the repository root can be prepared with:

```sh
docker build -f examples/harnesses/oci/custom-python/Dockerfile -t hexagon-custom-python:dev .
```

This command requires Docker and may download dependencies. It creates a local image only; cloud providers cannot generally consume that local tag. Image publication is a separate action. Use an accessible immutable image reference when following the bilingual registration examples in the [OCI guide](../integrations/harnesses/oci.md); do not invent a digest for this local build.

For `hexagon-json-v1`, the program receives one JSON object through stdin followed by EOF. It contains `run_id`, `input`, scoped `model` endpoint/name, optional `native_session`, the Run's `artifact_directory`, and declared `tools`; current adapters can also pass initialization. Consume the supplied configuration, preserve history under the Session workspace and write exports only to the supplied artifact directory.

The successful final record is one JSON line:

```json
{"type":"hexagon.result","text":"The actual assistant response","native_session":"opaque-session-id","failed":false}
```

Emit exactly one final result. Keep `text` nonempty and the optional native identifier bounded to 512 characters. For source packages the parser uses a strict schema, so do not add diagnostic fields to this record. The example's exceptional output currently includes diagnostic fields; that is rejected by the source parser and must never be treated as successful execution. Review and test failure reporting when deriving your implementation. Ordinary logs are not an assistant result. Common worker handling additionally requires a successful process outcome and artifact export; a valid-looking JSON line alone does not complete the Run.

## Use the Tool bridge and continuation contract

Bound Tools use the existing mailbox/bridge, not direct upstream credentials. A custom loop calls `http://127.0.0.1:8765/tools/<run_id>/call` with the Run-scoped `HEXAGON_TOOL_TOKEN`, a stable call ID, declared name and arguments. Continue polling the same call ID and arguments through authorization/approval waits, then inspect the result including `isError`. Creating a new call ID during a wait can create a different invocation. Native MCP-capable CLIs use [tool_bridge.py](../../../../runtime/tool_bridge.py) through the adapter's configuration.

Return the actual native continuation identifier when supported, and pass it back on the next Run. Do not fabricate one from the Run ID if the upstream CLI expects its own Session identifier. The generic Python example owns its own history, so its identifier has a different implementation contract. Verify a follow-up that depends on previous context, including after supported filesystem resume. Initialization support also needs deliberate first-turn/follow-up behavior; declaring a capability does not implement it.

Cancellation remains Runtime's responsibility. The adapter must not detach an independent agent daemon that escapes process supervision. Inspect [Runtime](../../../../runtime/server.py) and test descendants, cancellation during Tool waits, and late output. Client event disconnection does not cancel a Run. Preserve uncertainty after process loss rather than starting another invocation blindly. Native action visibility differs by CLI; expose actual events and never manufacture hidden reasoning.

## Registration and verification changes

For a new OCI protocol, review protocol declarations, image schema/registration, runtime adapter, result parser, catalog/templates and evidence records together. Existing protocols can often reuse the registry without a new built-in branch. Relevant sources include [images.ts](../../../../modules/harnesses/images.ts), [catalog.ts](../../../../modules/harnesses/catalog.ts), [templates.ts](../../../../modules/harnesses/templates.ts) and [verification.ts](../../../../modules/harnesses/verification.ts). Source registration is in [harness-packages.ts](../../../../modules/execution/harness-packages.ts). Tenant ownership must be checked for definitions, registry secrets and Session bindings.

Start with deterministic parser/configuration tests:

```sh
npx vitest run modules/harnesses/runtime-adapter.test.ts modules/harnesses/managed-cli.test.ts modules/harnesses/managed-cli-config.test.ts
```

Add tests for your adapter rather than assuming these existing suites cover it. Test malformed/missing/duplicate final output, nonzero exit, upstream error, unsupported model binding, initialization and native-state mapping. Actual upstream binaries with fixture model responses add evidence about CLI flags and bridge behavior; they still do not prove real model or cloud compatibility.

Finally, each SDK must independently register the image, create a cloud Session, complete two turns with retained context, call assigned Tools, export/download an artifact, cancel an active turn, and close with provider-confirmed cleanup. Include authorization/approval waits where declared, durable events and cross-language continuation. For a conversation-only contract explicitly exclude unsupported Tools/artifacts without crediting them as passed. Record exact digest, command, provider, model protocol/name, SDK, scenario and date using [the testing guide](testing.md). Preserve failures and unresolved resource IDs. Only matching evidence can update the verified-combination record.

Next: [OCI registration](../integrations/harnesses/oci.md), [source-package compatibility](../integrations/harnesses/source-package.md), [testing and evidence](testing.md).
