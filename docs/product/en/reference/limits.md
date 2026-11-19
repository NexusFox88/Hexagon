# Limits and configurable boundaries

This page lists API and execution bounds from the current source, not provider account quotas. MiB means 1048576 bytes; KiB means 1024 bytes. JS code units are JavaScript string-length units, not UTF-8 bytes; non-ASCII text may hit byte limits earlier. These values describe this source snapshot; check implementation when upgrading.

## Requests and execution

| Item | Bound / range | Scope and behavior |
| --- | --- | --- |
| HTTP request body | 12 MiB | Fastify body limit; JSON/base64 overhead counts. |
| Run input | 1–100000 JS code units | Also nonblank; combined input + compiled background context ≤120000 UTF-8 bytes. |
| Idempotency-Key | 1–256 JS code units | Reuse the same payload/key after a lost submission response. |
| Origin identifiers | message_id/request_id ≤256; channel ≤100 | Nonempty when supplied; part of submission identity. |
| Active Runs per Session | 1 | Another active Run causes session_busy (409); use application queuing. |
| Event query page | 500 events | Continue after the last ID; an empty page is not terminal-state proof. |
| Resource operation page | limit 1–100; default 50; offset ≥0 | Follow returned pagination; not an account resource quota. |

Primary source: [apps/control-plane/server.ts](../../../../apps/control-plane/server.ts).

## Session policy and initialization

| Item | Bound / range | Scope and behavior |
| --- | --- | --- |
| Session / Agent name | 1–200 JS code units | Optional Session name; required Agent name. |
| Idle threshold | 15–3600 seconds; default 60 | Configurable at definition creation; lifecycle support varies by provider. |
| Resource timeout | 60–3600 seconds; default 600 | This is not a universal model-response deadline or guaranteed wall-clock deletion. |
| Identity fields | name ≤200; description ≤4000; role ≤2000 | Name nonempty; behavioral text is not authorization. |
| Instructions / context.text | each ≤32768 JS code units | NUL rejected. |
| Inline context documents | ≤8; name 1–200; text ≤16384 | Aggregate initialization byte limits also apply. |
| Referenced context files | ≤8; path ≤500; each file ≤32768 bytes | Must match uploaded SHA-256 and valid UTF-8 without NUL. |
| Compiled initialization | ≤65536 bytes | Both serialized behavior and compiled system + context are checked. |
| Environment entries | ≤64; JSON ≤65536 bytes | Names ≤128, values ≤16384 JS code units; reserved names/NUL rejected. |

Primary source: [modules/execution/sessions.ts](../../../../modules/execution/sessions.ts).

## Input and exported files

| Item | Bound / range | Scope and behavior |
| --- | --- | --- |
| Files per upload request | 1–100 | Not a lifetime workspace file-count quota. |
| Upload path | 1–500 JS code units | Relative path; no traversal, empty segments, backslash or NUL. |
| Upload content_base64 | ≤2097152 characters per file | Canonical Base64; at most 1572864 decoded bytes (1.5 MiB) at this encoded bound. |
| Decoded upload total | ≤8 MiB per request | HTTP body limit still applies; upload_too_large (413). |
| Artifact manifest | ≤64 files; ≤8 MiB decoded total | Per captured manifest; duplicate names are rejected. |
| Single exported artifact | ≤4 MiB decoded bytes | Base64 field ≤5592408 characters; canonical bytes and SHA-256 verified. |
| Artifact name | 1–512 JS code units | Relative path without traversal, backslash or control characters. |

Primary source: [modules/execution/inputs.ts](../../../../modules/execution/inputs.ts).

## Preview and Harness distribution

| Item | Bound / range | Scope and behavior |
| --- | --- | --- |
| Preview port | 3000–8999, excluding 8765 | Integer; Runtime port is reserved. |
| Preview grant TTL | 30–3600 seconds; default 600 | Configurable per request; does not extend Sandbox lifetime. |
| OCI platform | linux/amd64 | Other architectures are not implied by a multi-platform image tag. |
| OCI image reference | 1–512 JS code units | Resolves to immutable digest; registry/provider constraints still apply. |
| OCI command argv | 1–32 items; each 1–65536 JS code units | NUL rejected; OS/runtime limits may be tighter. |
| Source package | 1–32 files; total ≤512 KiB UTF-8 | Each content ≤262144 JS code units; relative path ≤240. |
| Native continuation identifier | ≤512 characters in hexagon-json-v1 parsing | Source package requires a nonempty value if supplied; protocol-specific adapters have their own validation. |

Primary source: [modules/sandboxes/previews.ts](../../../../modules/sandboxes/previews.ts).

## Cross-check the sources

The tables also use [Run input/events](../../../../modules/execution/runs.ts), [initialization](../../../../modules/execution/initialization.ts), [environment](../../../../modules/execution/environment.ts), [artifacts](../../../../modules/artifacts/artifacts.ts), [OCI registration](../../../../modules/harnesses/images.ts), [image resolution](../../../../modules/harnesses/registry.ts) and [source packages](../../../../modules/execution/harness-packages.ts). Most schema bounds have no separate administration setting. Configurable Session timeouts do not make every implementation limit adjustable.

## Tool, provider and account limits

[Remote MCP](../integrations/mcp.md) currently bounds discovery to 100 tools, 20 pages and a 2 MiB response; see [remote.ts](../../../../integrations/mcp/remote.ts). Named application response bodies are bounded to 1 MiB in [the application transport](../../../../integrations/apps/registry.ts). These protocol limits are not workspace file-size limits.

Provider memory, CPU, creation concurrency, storage, image permissions and API quotas depend on connection configuration and the actual account. Consult the matching [Sandbox guide](../integrations/sandboxes.md); a trial account's concurrency limit is not a global Hexagon quota. Private OCI, network allowlists and pause/resume require declared connector support. Unsupported policy must not be silently weakened.

Some connectors impose tighter file or command bounds. A transport queue bound limits buffered data, not necessarily the total response length. Do not substitute it for an upload request, exported artifact or provider disk limit. See [capacity and cost](../operate/capacity-and-cost.md).

## Respond to a limit failure

Distinguish schema rejection from domain errors. Combined input/background overflow produces `input_too_large` (413), while initialization overflow produces `initialization_too_large` (413). Aggregate artifact size or duplicate names can produce `invalid_artifact_manifest`; single-file size, encoding or hash failures can produce `artifact_integrity_failed`. Repeating an identical request does not fix these conditions.

Reduce input, batch uploads, export only needed files or select a suitable execution combination. Batching does not bypass per-file bounds. Do not change a required allowlist to unrestricted merely to pass validation. Network faults and provider quota refusals are separate from Hexagon input limits; reconcile an unknown create outcome before attempting another allocation.

Values on this page were source-reviewed, not freshly boundary-tested or cloud load-tested. Unlisted account capacity, total throughput or price is not unlimited and does not imply a service-level guarantee.

Next: [project context](../build/project-context.md), [artifacts](../build/artifacts.md), [troubleshooting](../operate/troubleshooting.md).
