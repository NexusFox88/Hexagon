# Observe execution and diagnose failures

Correlate business requests with Sessions, Runs, Runtime bindings, and cloud operations. Control-plane health, Runtime reachability, task completion, and confirmed deletion are separate observations.

## Start with identifiers

Persist business request ID, Session/Run IDs, idempotency key, and event cursor. In Console, inspect input, initialization, events, Tools, and resources. Run origin can carry request_id, message_id, and channel for correlation, not authentication or business authorization.

| Object | Inspect | Do not infer |
| --- | --- | --- |
| Control-plane health | Database, worker, credential ingress | Every cloud account works |
| Session | Pinned definition, lifecycle, resource binding | Process is continuously alive |
| Run | Stage, waits, terminal status, output/error | Completion means compute deletion |
| Runtime binding | Reachability and interruption/recovery | Unreachable means stopped |
| Sandbox | Last observed cloud state | Sleeping means absent |
| Resource operation | Create/delete intent, unknown state, review | Acknowledgement means cleanup |
| Tool call | Arguments, approval, dispatch policy, resolution | Timeout means no write occurred |

## Trace a silent task

Query the original Run before submitting again. For authorization/approval waits, inspect the actual invocation. For provisioning, inspect creation operations and stage. For unreachable Runtime, observe recovery of the existing invocation rather than starting another process. If the Run completed, inspect client cursor handling and final result retrieval.

SDK entry points include `run`, `events`/`stream`, `tool_calls`/`toolCalls`, and `session_initialization`/`sessionInitialization`. Event pages are bounded; drain subsequent pages. Empty data does not prove termination.

## Interpret diagnostics

Local startup logs reside in private service.log. Sanitized diagnostics retain category, numeric HTTP status, and allowlisted transport codes such as ECONNRESET and ETIMEDOUT. Arbitrary upstream messages, URLs, bodies, and codes are deliberately excluded to avoid leaking credentials/data.

Fields locate a layer rather than proving a root cause. A 401 can originate in different services; a reset does not establish absence of remote effects. Correlate stage, time, identifiers, and object states.

## Monitoring

Build checks around actual queries: prolonged waits, unreachable Runtime, unknown create/delete, unfinished closing, unhealthy credential ingress, and export failures. Set thresholds for your workload rather than assuming a universal SLA.

This guide does not assume existing Prometheus endpoints or OpenTelemetry exporters. Integrate available APIs and sanitized logs after checking stability and permissions.

Verify that one business request can be traced to its Run, execution stage, and related operation, without leaking secrets. Preserve original task identity and recovery evidence after repair. Sources: [diagnostic filtering](../../../../modules/diagnostics/failure.ts), [recovery architecture](../../../architecture.md). Next: [recovery actions](../build/recovery.md), [authorization](../build/tool-authorization.md).
