# Resource lifecycle and sandbox runtime

## Implemented

- Persist create/delete intent and uncertain results in resource_operations.
- Serialize remote mutations per Session with a database advisory lock.
- Reconcile a lost create response by operation metadata without submitting another create.
- Reject a close while a Run is active; retain closing state and deletion uncertainty until provider absence is confirmed.
- Keep cleanup available after connection disablement; expose authenticated Session close API.
- Python sandbox runtime supervises arbitrary pinned harness commands, persists state and cursor-addressable events, rejects concurrent workspace writers, supports cancellation, and quarantines a workspace after an unobserved supervisor restart.
- TypeScript runtime client uploads/bootstrap code and authenticates through private provider preview transport.

## Verification

- `npm run check`: passed.
- PostgreSQL-backed `npm test`: 3 files / 8 tests passed, including new lost-create-response, deletion failure, disabled-connection cleanup and tenant-boundary assertions.
- `python3 -m unittest discover -s runtime -p 'test_*.py' -v`: 3 tests passed using actual local subprocesses. Covers command effects, idempotency, cursor replay, persistence, cancellation and restart quarantine.
- Real E2B runtime smoke passed: `.local/evidence/e2b-764a367f-c539-4cee-bbf9-18ca99b731f7.json`. Bootstrap, actual Python child execution, duplicate-request PID identity, persisted stdout events, actual workspace output, and rejection of missing runtime Authorization were verified. Cloud resource destruction was confirmed.

The first cloud runtime attempt failed with a TypeError and cleanup succeeded (`e2b-02728364-827a-4b95-8bf9-0fe3d4d2fa1b.json`). Additional safe diagnostics were added; the next attempt passed without reproducing that failure. Its original cause is not established. This is not evidence of a repaired or fully reliable transport.

The cloud smoke uses the adapter/runtime client directly, not the full control-plane worker or SDK journey. Its Python child is a process fixture, not a model-driven Agent or supported production harness. Model integration, built-in/custom harness packages, GUI, Python/TS public SDKs, artifact upload/download, broker authorization and approval continuation, network enforcement and full recovery acceptance remain pending.
