# Durable Run artifacts

Implemented Runtime per-Run artifact snapshots, control-plane hash-verified byte storage, authenticated metadata/download endpoints, and Python/TypeScript SDK download methods. The Run's final output includes artifact references. Artifacts are exported from `artifacts/<run-id>/` in the workspace before completion and survive Session closure. Limits: 64 files, 4 MiB/file, 8 MiB/export. File and directory traversal uses directory descriptors and no-follow opens; symlinks and special files are rejected.

Real cloud command: `HEXAGON_TOOL_SMOKE=1 npx tsx tooling/smoke-api.ts`.
Successful private journal: `.local/evidence/api-smoke-427dc062-563e-47d7-9d9f-a8f851eb0a70.json`.

OpenCode/MiniMax ran inside E2B, fetched requirements over MCP, implemented the Python fixture, passed unchanged tests, waited for tool authorization and approval, and wrote the remote report. It produced:
- `calculate.py`, 32 bytes, SHA-256 `ba1a531f581d2e6094e978ed6f7aca7a8d92eeb62c6e7ad73ee692f7f18bc772`.
- `test-report.txt`, 20 bytes, SHA-256 `93c1fafc7d359ffb1147cab31ea7e7ed534163cdd94db5698d8ca9652e012acd`.

The API client downloaded and checked both hashes and content. Code matched the independently read workspace file; report contained the independently confirmed test output. Both remained downloadable with identical hashes after the product Session-close API and provider-confirmed sandbox deletion. The test template was also removed. All 547 events replayed correctly; a subsequent same-Session Run completed.

Local evidence:
- `npm run check`: passed.
- `npm --prefix sdk/typescript run build`: passed.
- `TEST_DATABASE_URL=postgres://hexagon@127.0.0.1:55432/hexagon npm test`: 23 tests / 10 files passed.
- `python3 -m unittest discover -s runtime -p 'test_*.py'`: 7 passed.
- Both SDKs download exact binary bytes through actual HTTP; another tenant receives 404; duplicate captures emit one artifact event; corrupt hashes and stale leases are rejected; synthetic closed Sessions retain bytes.
- Runtime tests confirm snapshots remain unchanged after workspace edits and reject file/directory symlinks.

A full-suite run initially exposed cross-file scheduler interference: parallel test files shared one database and could claim each other's Runs. Vitest files now execute serially; explicit within-test transaction concurrency checks are preserved. After cleanup, no nonterminal test Runs remained, and the suite passed.

Limits: this is still the arithmetic fixture, not the full Web filter journey. GUI, previews, all-client complete scenarios, additional providers/harnesses/custom packages and full fault coverage remain unaccepted. No full ledger item is marked complete solely from this partial evidence.
