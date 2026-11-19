# Cloud resource create/delete response-loss journey

Date: 2026-11-15. Status: passed. Real E2B + OpenCode + user MiniMax execution; controlled failures at the connector boundary around actual cloud operations.

Command: `HEXAGON_RESOURCE_FAULTS=1 HEXAGON_TOOL_SMOKE=1 npx tsx tooling/smoke-api.ts` (exit 0).

Private journal: `.local/evidence/api-smoke-67917c2b-badf-492a-ad2f-0a096a88340c.json`. Finished 04:08:25 UTC.

Session `cc14228c-1684-4f52-b7eb-3b94a6a927b8`; original Run `2e32a32d-f720-4a89-90e9-ad8e35518ba3`; Sandbox `i491crhce6hh7tcduu3pv`.

1. The acceptance decorator performed one actual E2B create and then discarded its successful response. Fleet exposed the original create operation as unknown, with no bound Sandbox and Run provisioning. The worker waited for normal recovery; no test edits to leases or Run states were used.
2. Lookup by the original operation metadata found the actual Sandbox. The worker bound that same resource, installed Runtime/Harness and executed the task. Create count remained one; lookup count was one.
3. The model read the authenticated requirement, implemented the calculation project, passed the unmodified independent test (2 assertions), waited for report authorization and approval, wrote one report, and returned a completed assistant result. 595 events and resumed event replay were checked; artifacts, follow-up and cancellation also passed.
4. The first close attempt injected a transport failure before provider deletion. The API returned `sandbox_deletion_unconfirmed`; Fleet showed Session closing and the same delete operation unknown. Independent provider inspection confirmed the resource still existed.
5. The second close attempt performed actual deletion and then discarded its response. The same API/Fleet uncertainty remained. Independent provider inspection now confirmed absence.
6. The third close request confirmed absence, completed the existing delete operation and closed the Session without another destroy call. Exactly two delete attempts reached the decorator, and one actual provider deletion occurred. Both persisted operations were completed with no stale reason.
7. Retained artifacts and completed result were still available. Connection deletion succeeded after dependency cleanup. Product cleanup, provider absence and test-template absence were all confirmed.

This uses intentional response loss around real provider actions; it does not claim an unplanned provider outage. Console browser rendering of the new operation summaries/retry control remains pending. The prior failed template build was separately reconciled before this run: `.local/evidence/api-smoke-2c47fc34-5a3a-4945-bb42-f40775bbf94f.json` now confirms template absence. No known test-owned resources from either attempt remain. No commits made.
