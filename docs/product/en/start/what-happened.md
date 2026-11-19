# Understand what happened

The [first Session tutorial](first-session.md) produces three distinct results: a durable Session identity, one Run execution record, and exported files from the cloud workspace.

## Follow the request

1. **Connections establish prerequisites.** The Sandbox connection identifies cloud access; the model connection identifies an endpoint, model, and protocol. Both must be verified and enabled.
2. **The Session pins configuration.** The selected Harness and connection configuration become its execution context. Direct creation does not require an Agent template.
3. **The Run represents one submission.** The example saves its input and idempotency key before submitting. Reusing that request after a lost response recovers the original Run instead of creating a second task.
4. **The control plane schedules execution.** It owns cloud resources and execution records. Inside the Sandbox, Runtime supervises the Harness process; the Harness uses the model to perform the task.
5. **State and events are persisted.** Observers read durable execution state. This example polls; an event-stream client can also reconnect to observe the original Run.
6. **Artifacts are exported before completion.** The Harness receives a Run-specific output directory. Ordinary workspace files are not automatically exported artifacts.
7. **Closing releases cloud resources.** Run completion and Session closure are separate actions. Exported artifacts remain in control-plane storage and can be downloaded after closure.

## Compare the records in Console

Use the printed IDs to find the Session and Run. Check pinned configuration, input, output, and resource operations. Sandbox state, Runtime reachability, and Run state describe separate objects. A completed Run does not mean its Sandbox was deleted; an unreachable Runtime does not prove that its process stopped.

For another turn, submit a new Run to the same still-open Session. The tutorial explicitly closes its Session, so a new experiment needs a new Session. Closure is terminal, unlike idle suspension.

| Object | Behavior in this tutorial |
| --- | --- |
| Session and Run records | Completed history remains queryable |
| Exported artifacts | Remain downloadable after closure |
| Original cloud workspace | Cloud resources are removed; continued workspace access is not guaranteed |
| Harness process and preview services | Do not persist merely because history exists |
| Private local journal | Remains under your control for recovery and investigation |

Idle suspension has different preservation rules from closure. Memory, filesystem, and process continuity also vary by Provider. Read [Serverless Sessions](../../../serverless-sessions.md) before depending on a particular behavior.

Next, use the [SDK guide](../../../../sdk/README.md) for uploads, follow-up turns, streaming, and previews. The [architecture](../../../architecture.md) explains implementation ownership.
