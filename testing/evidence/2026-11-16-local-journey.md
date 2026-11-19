# Local GUI-to-SDK journey — 2026-11-16

Implemented a local start/stop/restart/status command, an identity-checked credential ingress health probe, GUI reachability reporting and Connection-ID copying, and complete TypeScript/Python quickstart programs. Secret values stay in the existing encrypted control-plane storage. The programs read only Connection IDs and the local API token (or explicit API environment configuration).

## Observed verification

- Full regression: 42 files / 118 tests passed with the active-Run stop guard; the ingress probe test covers missing configuration, network failure, a wrong listener identity, matching identity and coalesced/cached checks.
- TypeScript typecheck passed; Console JavaScript syntax check passed.
- Prepared two encrypted Secrets and three draft Connections via the management API using existing user-authorized credentials. Browser then validated and enabled all three Connections. The GUI displayed actual reachable ingress and confirmed Connection-ID copying. This is a combined API setup + actual GUI verification/enablement journey; do not claim the initial Secret creation happened through GUI in this run.
- Ran the shipped TypeScript quickstart: Session `9d14fde2-1151-414f-bac8-9691d82bba92`, Run `22ea4639-028c-4e01-9837-58ef9163e7b5`.
- Ran the shipped Python quickstart: Session `69d5bcfd-6fc5-426a-b82f-aeaf2f85702f`, Run `0776c58b-0899-4598-bf3f-7ed156ea91c2`.
- Both used Vercel cloud Sandboxes and SiliconFlow international through native delegated Header injection. Both verified the ordinary `APP_MODE` variable, made a successful protected HTTP request to `/v1/models`, returned actual nonempty model responses through SDK events/results, and closed their own Sessions successfully.
- Private program journals are `.local/manual-journey/typescript-9d14fde2-1151-414f-bac8-9691d82bba92.json` and `.local/manual-journey/python-69d5bcfd-6fc5-426a-b82f-aeaf2f85702f.json`. Logs are `.local/evidence/manual-typescript-20261116.log` and `.local/evidence/manual-python-20261116.log`.

The reusable Secrets, Connections and ID-only configuration are intentionally retained for the user's own walkthrough. The development control plane/ingress is intended to remain running at completion; cloud execution resources are not retained. The local health probe establishes reachability from the control plane to its public credential listener, not every supplier's outbound network reachability. The real SDK runs separately establish reachability from the tested Vercel Sandboxes.

Prior unrelated provider/Harness acceptance gaps remain recorded in the previous ledger; this task does not reclassify them as passed.


## Final checks

- Unified `stop` returned successfully; subsequent `status` reported stopped. `start` and `restart` both returned a reachable credential ingress. GUI later showed the new ingress and both completed, closed Sessions with destroyed Sandbox state.
- Independent Vercel API inspection confirmed both exact Sandbox IDs absent after cleanup.
- An additional isolated CLI safety test passed: a queued active Run prevents shutdown even when the worker is idle; a mismatched process identity also prevents shutdown.
- Reusable Connections (`My Sandbox`, `My Model`, `My HTTP`) and their Secret references remain enabled. The ID-only `.local/manual-journey/connections.json` is ready for either shipped example. No cloud Sandbox remains from these two runs.
