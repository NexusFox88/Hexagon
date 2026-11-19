# Register a compatibility source Harness package

Use this page to maintain a source Harness using `hexagon-json-v1`. Prefer [OCI images](oci.md) for new integrations so the interpreter and dependencies have an explicit environment. Registration stores tenant-owned data; the control plane never imports or executes your source. Installation and execution happen in the cloud Sandbox.

## Prerequisites and format

Use a management client, validated and enabled Sandbox/model connections, and a Sandbox with `python3` or `node`. The current source-package schema only accepts `model_providers: ["anthropic-compatible"]`. Changing a declaration does not add Chat Completions or Responses support.

A package contains 1–32 UTF-8 source files totaling at most 512 KiB. Each content string also has a 262144 JavaScript code-unit limit. Paths are at most 240 characters and must be schema-compatible relative paths: no empty segments, `.`, `..`, duplicates, or file/directory conflicts. The entrypoint must be present in files.

The format does not orchestrate npm/pip lockfile installation or accept binary archives. Structural validation and byte integrity do not prove executable correctness. Dependencies must already exist in the Sandbox or be managed explicitly by your package.

## Register and select a version

These integration excerpts reuse an initialized client and connection IDs from the [first Session tutorial](../../start/first-session.md). Read the existing [Python Harness example](../../../../../examples/harnesses/python-agent/main.py) from the repository root. It uses the standard library to call a Messages model, with shell access, declared remote Tools, and conversation history.

```python
from pathlib import Path

harness = client.register_harness_package(
    id="custom.my-agent", version="1.0.0",
    protocol="hexagon-json-v1", interpreter="python3", entrypoint="main.py",
    capabilities=["conversation", "tools", "initialization"],
    model_providers=["anthropic-compatible"],
    files=[{"path": "main.py", "content": Path(
        "examples/harnesses/python-agent/main.py").read_text(encoding="utf-8")}],
)
definition = dict(
    harness={"id": harness["id"], "version": harness["version"]},
    sandbox_connection_id=sandbox_connection_id,
    model_connection_id=model_connection_id,
)
client.preflight_session(**definition)
# Persist create intent using the first-Session tutorial before provisioning.
```

```typescript
import { readFile } from 'node:fs/promises';

const harness = await client.registerHarnessPackage({
  id: 'custom.my-agent', version: '1.0.0',
  protocol: 'hexagon-json-v1', interpreter: 'python3', entrypoint: 'main.py',
  capabilities: ['conversation', 'tools', 'initialization'],
  model_providers: ['anthropic-compatible'],
  files: [{ path: 'main.py', content: await readFile(
    'examples/harnesses/python-agent/main.py', 'utf8') }],
});
const definition = {
  harness: { id: harness.id, version: harness.version },
  sandbox_connection_id: sandboxConnectionId,
  model_connection_id: modelConnectionId,
};
await client.preflightSession(definition);
// Persist create intent using the first-Session tutorial before provisioning.
```

Create a Session directly with definition; an Agent template is optional. Continue through Run submission, persistent Run IDs, events/results, artifact verification, and confirmed cleanup. Record the returned digest alongside id/version.

Registering identical canonical content within the tenant is idempotent. Changed content under an existing id/version, or a collision with an OCI registration, returns `harness_version_conflict`. Use a new version for changed code and select it in a new Session; existing Sessions remain pinned. There is currently no source-package deletion endpoint. Capabilities are author declarations, not certification of arbitrary uploaded code.

## stdin, credentials, and Tools

Runtime starts the entrypoint in the Session workspace and supplies one JSON object on stdin followed by EOF. It contains protocol, run_id, input, initialization, model, native_session, artifact_directory, and tools; native_session may be absent initially. Your Harness stores its own history and uses the returned opaque native_session to recover it on subsequent Runs.

Use the supplied `model.base_url` and `model.model`, not a hardcoded service URL. The current worker supplies `HEXAGON_MODEL_KEY` as delegated access to the protected model path; the original model account key stays in the control plane. `HEXAGON_TOOL_TOKEN` authorizes only this Run's local Tool mailbox. Never log these values, add them to model context, or export them as artifacts.

Call remote Tools at `http://127.0.0.1:8765/tools/<run_id>/call` with Authorization `Bearer <HEXAGON_TOOL_TOKEN>` and JSON `{"id":"<UUID>","name":"<declared name>","arguments":{}}`. Poll the same logical call with the same id and arguments until state is completed, then process result and isError. The control plane manages authorization and approval waits. Generating another UUID can create a new operation; it is not a safe retry for an unknown external side effect. Do not bypass the mailbox to obtain bound Tool credentials.

## Final output and failure

stdout must contain exactly one valid final result JSON line:

```json
{"type":"hexagon.result","text":"Actual completed result","native_session":"opaque-id","failed":false}
```

text must be nonempty; native_session is optional and must contain 1–512 characters when supplied. Arbitrary additional result fields are rejected. Ordinary logs do not substitute for this record. Missing, duplicate, invalid, failed:true, or nonzero-exit results cannot complete successfully. Success also depends on common artifact export. Write deliverables to artifact_directory; other workspace files are not automatically artifacts.

Runtime owns processes and cancellation. Disconnecting an event client does not cancel execution, and cancellation does not retract an external Tool write. Do not hide interruptions or model failures behind infinite retries.

## Completion checks

Verify two conversation turns, an actual Tool, initialization if declared, artifacts, failed results, cancellation, and confirmed cloud cleanup. Run the whole journey independently with Python and TypeScript clients; a Harness written in Python does not replace Python SDK validation. Retain exact versions, digest, combination, and scope.

This page was reviewed against the registration schema, SDK methods, delegated worker credential path, and sample source. No cloud task was rerun for this documentation change; a newly registered package is not thereby accepted.

Sources: [package implementation](../../../../../modules/execution/harness-packages.ts), [worker](../../../../../modules/execution/worker.ts). Next: [choose a Harness](../harnesses.md), [recovery](../../build/recovery.md), [artifacts](../../build/artifacts.md).
