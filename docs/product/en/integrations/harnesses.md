# Choose and configure a Harness

A Harness executes Agent logic, model interaction, conversation, and Tools. Runtime supervises its process; the control plane manages tasks, authorization, and cloud resources.

| Distribution | Selection | Boundary |
| --- | --- | --- |
| Built-in | Exact catalog id/version | Installer adapter; no implied OCI requirement |
| OCI | Register image, use returned id/version | Requires OCI capability and pinned digest |
| Legacy source package | Dedicated package API | Compatibility source distribution, not image registration |

Built-in Pi 1.5.2 and OpenCode 1.2.27 currently declare conversation, Tools, initialization, and all three model protocols. Query catalog() for the actual deployment.

## Template index

See the [image catalog](../../../harness-images.md) for source/version and published-image versus recipe status. Names here do not establish complete cloud acceptance.

### Codex

codex-v1 uses Responses, MCP-bridged Tools, and native continuation. Verify the registered image source/digest and execution evidence.

### Hermes

hermes-v1 uses Chat Completions, MCP Tools, and native continuation.

### OpenClaw

openclaw-v1 declares all three protocols and MCP Tools. Evidence for one protocol does not certify the others.

### DeepSeek Harness

deepseek-v1 currently uses Messages and a build recipe. Do not declare unsupported initialization. Build, distribution, and cloud execution are separate steps.

### OpenCode

opencode-v1 declares all three protocols and Tools. Built-in and OCI OpenCode have different distribution/Provider requirements.

### Aider

aider-v1 uses Messages and restored history. Its current adapter has no connected Tools and does not accept initialization capability.

### Pi

pi-v1 supports three protocols and extension-based Tools. A buildable recipe is not automatically a published image.

### Claude Code

claude-code-v1 uses Messages and MCP Tools. Respect actual permissions rather than assuming root-incompatible bypass modes.

### Python Agent

hexagon-json-v1 is a Messages-based example with mailbox Tools and custom continuation. Custom code owns correct conversation persistence.

## Select and verify

Match [model protocols](model-protocols.md), Tools/initialization needs, and Sandbox OCI/private-image/recovery capabilities. Verify two turns, Tools, artifacts, cancellation, cleanup, and idle recovery when required.

Capabilities cannot create missing adapter behavior. Registering Tools for Aider cannot implement them, and changing a version label cannot change image behavior.

Next: [OCI](harnesses/oci.md), [source packages](harnesses/source-package.md). Sources: [protocols](../../../../modules/harnesses/protocols.ts), [registration](../../../../modules/harnesses/images.ts).
