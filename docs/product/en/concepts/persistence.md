# Workspace, conversation, artifacts, and persistence

Stateful work includes several data classes. Before choosing retention behavior, identify whether you need files, conversation, execution history, or process memory.

| Data | Main location | Purpose |
| --- | --- | --- |
| Sessions/Runs, events, initialization | Control-plane PostgreSQL | Queries, observation recovery, audit |
| Uploaded inputs | Control-plane input storage, then Sandbox preparation | Initial workspace |
| Modified workspace | Managed cloud Sandbox directory | Continuing project work |
| Harness conversation | Harness-managed Session files/native identifiers | Multi-turn context |
| Exported artifacts | PostgreSQL in the current implementation | Deliverable snapshots independent of compute |
| Services and memory | Cloud processes | Previews, temporary computation, connections |

## Lifecycle effects

| Action | History / exported artifacts | Workspace / conversation | Processes / memory |
| --- | --- | --- | --- |
| Client disconnect | Retained | Not deleted by disconnect | Not cancelled by disconnect |
| Normal Run completion | Result and exports persist | Available for subsequent work | Run state does not establish every background process state |
| Planned idle transition | Control-plane history persists | Restored by Provider/Harness strategy | May survive, restart, or disappear |
| Runtime failure | Durable records remain investigable | Depends on interruption/reachability diagnosis | Safe automatic recovery is not guaranteed |
| Session close | History and exports remain | Former cloud workspace access is not guaranteed | Resources are cleaned up |
| Database/key loss | Requires matching backup recovery | Cloud files are not a control-plane backup | Running processes cannot reconstruct all control records |

A project file is not automatically an Artifact. Export deliverables into the Run artifact directory and verify metadata, size, and hash. Later Runs do not overwrite earlier exported snapshots.

File retention alone does not prove conversation recovery. Test a known file and a prior conversation fact separately. Temporary directories are not portable storage guarantees; Agent37 clears `/tmp` on its recovery path.

For continuing edits, retain a Session and verify the idle strategy. For delivery, download artifacts or store an authorized application copy. For archival, manage database capacity, backups, and retention policy; current retention is not an unlimited-duration SLA. For a running service, manage process and preview authorization lifecycle rather than saving a URL alone.

Sources: [artifacts](../../../../modules/artifacts/artifacts.ts), [serverless strategies](../../../serverless-sessions.md). Next: [downloads](../build/artifacts.md), [multi-turn verification](../build/multi-turn.md), [backup/restore](../../../local-installation.md#backup-upgrade-and-restore).
