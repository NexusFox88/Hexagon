# Exact cloud workspace input delivery and durable receipt

Command: `HEXAGON_WEB_SMOKE=1 npx tsx tooling/smoke-api.ts`.

Result: exit 0, verified, resource and template cleanup confirmed. Private journal: `.local/evidence/api-smoke-57b3ff48-0087-4efd-aa72-db24b202c584.json`.

The actual E2B/OpenCode/MiniMax task uploaded all seven application fixture files through the public API. The initial Run submission was repeated with the same idempotency key and returned the same Run ID: `ddab6f28-3ae8-46e1-a406-9f01ecfc42f2`.

Before starting the Harness invocation, the cloud Runtime writes the inputs, reads each resulting workspace file and calculates SHA-256 from those disk bytes. The worker compares every expected path/hash with that receipt. Only after they match does a fenced database transaction set the Runtime ready and append `workspace.inputs_verified`, containing the Session ID and each input's path, SHA-256 and size. File contents and credentials are excluded from the event.

The acceptance script fetched persisted events and found exactly one receipt, event ID `4`. It independently calculated the expected digest and size from every uploaded file and compared the complete manifest:

| File | Bytes |
| --- | ---: |
| acceptance.mjs | 919 |
| app.mjs | 1317 |
| filter.mjs | 141 |
| index.html | 1136 |
| README.md | 759 |
| serve.py | 425 |
| style.css | 1544 |

All seven matched, including the initial implementation file before the agent modifies it. The agent subsequently completed the actual task; independent execution of the unchanged fixed tests passed all 8 assertions. Authorization, approval, one report write, final response, artifacts, preview, event replay, follow-up, cancellation and cleanup continued to pass.

## Regression checks

- Runtime write-fault injection changes bytes during `Path.write_bytes`; the returned digest reflects the changed disk bytes rather than the original request. This allows the worker comparison to detect the discrepancy.
- Runtime binary input test checks NUL/non-UTF8 bytes and rejects replacing a workspace after execution starts.
- PostgreSQL execution test rejects a stale lease and wrong Session when marking Runtime ready, preserving the reserved state and absence of a success receipt.
- Repeating a valid ready/receipt transaction produces one persisted event.
- `python3 -m unittest discover -s runtime -p 'test_*.py'`: 8 passed (requires loopback permission for the Tool bridge test).
- `TEST_DATABASE_URL=postgres://hexagon@127.0.0.1:55432/hexagon npm test`: 20 files / 45 tests passed.
- `npm run check`: passed.

Scope: initial input delivery verified before Harness execution. The receipt does not claim files remain unchanged after the agent starts; workspace edits are the agent's intended task. Historical Sessions created before this change are not backfilled with a receipt.
