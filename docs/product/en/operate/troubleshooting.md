# Troubleshoot by symptom

Retain Session, Run, operation IDs, and the last cursor before investigating. Before retrying, determine whether an operation may already have taken effect. Do not attribute every failure to user credentials or recreate work by default.

| Symptom | Inspect first | Action / completion signal |
| --- | --- | --- |
| Startup fails | Doctor, database identity/port, private service.log | Repair the specific prerequisite; authenticated status works |
| Local SDK cannot discover | Data directory, current directory, descriptor permissions/loopback | Select correct workspace; read the original Session |
| 401 / 403 | Originating service, expiry/revocation, required role | Correct identity without giving owner Tokens to frontend |
| Connection cannot enable | Revalidation after edits, disabled Secret | Validate ready, then explicitly enable |
| Preflight rejects | Harness/model, Tool readiness, OCI/network capabilities | Resolve the reason without silently weakening policy |
| Creation remains unknown | Original operation and Provider handle | Reconcile; empty listing alone does not justify recreation |
| No Run output | Durable state, waits, provisioning stage | Act on the original Run, not another submission |
| Streaming UI stops | Saved cursor, transport, durable Run | Reconnect/deduplicate; match final query |
| Upload rejected | Path, size/encoding, whether first Run exists | Correct pre-execution inputs; use Agent work afterward |
| Empty artifacts | Run state, output directory, export failure | Verify actual export rather than assistant claims |
| Preview fails | Process/port, grant expiry, Session, origin/TLS | Working HTTP interaction and rejected invalid grants |
| Wake loses context | Managed path, Provider strategy, exact Harness | Verify files/conversation separately; do not replay unknown invocation |
| Closing persists | Original deletion, resource/endpoints | Confirm absence; acknowledgement is not completion |

## Example: no new events

Query the Run. For waiting_approval, inspect the approval and Tool call, then submit an authorized explicit decision. For completed, investigate cursor handling and read output. For unreachable Runtime, retain the binding/stage and observe recovery without launching another Harness.

All three can look like “no new text,” but need different actions. Recovered connectivity does not verify an external write; unknown Tool outcomes need [reconciliation](reconciliation.md).

## Report useful evidence

Include code/SDK version, Provider/Harness version, model protocol, stage, sanitized error, reproduction, expected/actual results, evidence location, and cleanup status. Keep real resource IDs privately for cleanup; use redacted references publicly. Exclude Tokens, database passwords, preview tickets, raw headers, and upstream bodies.

Record failed and later successful attempts separately. Distinguish simulation from real cloud reproduction. Do not erase failures to make the history appear uniformly successful.

## Relevant procedures

- [Identity](access-control.md), [credentials](credentials.md)
- [Networking](networking.md), [diagnostics](observability.md)
- [Application recovery](../build/recovery.md), [resource reconciliation](reconciliation.md)
- [Files](../build/project-context.md), [artifacts](../build/artifacts.md), [previews](../build/private-preview.md)

Use original states and sanitized diagnostics to select the procedure. Completion requires observed recovery and confirmed resource outcomes, not merely disappearance of an error message.
