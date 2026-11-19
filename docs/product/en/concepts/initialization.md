# Initialization, preflight, and pinned configuration

Preflight checks known configuration and compatibility. Session creation pins the selected definition. Execution still depends on cloud quota, networking, model availability, and Runtime readiness. These phases establish different facts.

## Checks before creation

The control plane verifies tenant ownership and connection types, enabled/verified Sandbox and model connections, required Tool readiness, Harness version/protocol, initialization support, OCI/private-image capabilities, network policy, and required capabilities.

| Request | Meaning |
| --- | --- |
| Ready connections with compatible Harness | Returns readiness and combination metadata, not proof of future cloud allocation |
| OCI Harness on unsupported Provider | Rejected before execution; no silent built-in Harness fallback |
| Required Tool not ready | Initialization fails until authorization/readiness is corrected or optionality explicitly chosen |

Optional Tools still need valid, correctly typed, tenant-owned connection bindings. Optionality permits missing readiness, not arbitrary missing connections.

Preflight does not persist a new Session or allocate its Sandbox. It may check or restore credential ingress, so absence of Sandbox creation does not mean absence of all network preparation.

## What becomes pinned

A Session records Harness identity/version and optional image metadata, behavior, Tool/protected-API aliases, resource/network policy, connection versions/configuration, and optional Agent revision. Effective merged environment values are encrypted separately; reads expose names only.

Behavioral `identity` is not an authenticated account or permission grant. Instructions/context guide the Harness but do not override platform authorization. Referenced context files are checked again for existence, hash, and encoding at submission.

## Inspect history

Python `client.session_initialization(session_id)` and TypeScript `await client.sessionInitialization(sessionId)` return the versioned snapshot displayed by Console Initialization. It remains readable after closure. A current Agent definition is not a substitute for historical configuration.

The snapshot omits credentials/environment values and is not a complete replay backup. Creating from it resolves connection IDs against current configuration and permissions. Identical IDs do not reproduce historical cloud conditions; preflight again.

## Pinning is not freezing the outside world

Template revision does not rewrite existing Sessions. Disabling Sandbox/model connections still blocks new Runs. A pinned definition cannot bypass current availability checks or prevent upstream deletion, quota exhaustion, or credential expiry.

Sources: [Session creation](../../../../modules/execution/sessions.ts), [initialization contract](../../../session-initialization.md). Next: [templates](../build/agent-templates.md), [connection lifecycle](../build/connection-lifecycle.md), [file context](../build/project-context.md).
