# Run tests and record acceptance evidence

Acceptance comes from the [user journey](../../../../testing/journey-source.md), refined by the [acceptance ledger](../../../../testing/acceptance.md), including the later minimal Session entry. A saved Agent is optional. Do not reduce acceptance to what the current implementation or a convenient runner already covers.

## Choose the right level

| Level | What it establishes | What it does not establish |
| --- | --- | --- |
| Unit and connector contract tests | Schema, request mapping, capabilities, failure classification | Provider availability or account permissions |
| Deterministic API/database/Runtime scenarios | Tenant checks, durable events, approvals, retries and recovery against controlled failures | Real model decisions or provider lifecycle behavior |
| Installed SDK tests | Built wheel/tarball imports and selected API journeys | Every SDK method or real cloud compatibility |
| Real cloud combination tests | Exact provider, Harness/version or digest, model protocol and client scenario | Untested combinations, all UI paths, or arbitrary custom packages |
| Browser and full user journey | Actual configuration, authorization, preview interaction and user-visible outcomes | Global resource absence without a provider audit |

A green fixture is evidence for its assertions. Registration, credential verification and a successful model answer are each narrower than a completed user task.

## Deterministic commands

Prepare dependencies and an isolated test database using [development setup](development.md). Export `TEST_DATABASE_URL` before both gates:

```sh
npm run verify
npm run verify:packages
npm run release:check
```

`verify` refuses to proceed without the database URL, then runs `check` and `test`. Running `npm test` alone without that URL can omit database-backed coverage; do not report it as the full gate. Vitest creates a random schema, applies migrations, and drops the schema during normal teardown. Test files are serialized because the global scheduler can claim another file's fixture Runs. Preserve explicit concurrency tests; do not turn file parallelism on casually.

`verify:packages` requires Python packaging dependencies, builds packages, installs them in temporary consumers, verifies imports, and runs the Harness API, SDK interoperability, local SDK and authorization-denial suites against the installed artifacts. It writes `.local/evidence/sdk-packages.json`, including artifact hashes and status. Temporary consumers must remain available for cloud runners that reference this record.

For a targeted iteration, use the actual test path:

```sh
npx vitest run testing/tenant-boundaries.test.ts
```

Run from the repository root with the same test database configuration. A targeted pass does not replace the broader gate. `release:check` writes a private inventory report; its pattern scan is not comprehensive secret detection, and it does not publish anything.

## Startup and backup have different prerequisites

| Command | Required preparation and side effects |
| --- | --- |
| `npm run verify:startup` | Uses `DATABASE_URL`, not `TEST_DATABASE_URL`; creates an isolated schema/data directory, starts and restarts child services, checks identity and wrong-key handling. Use a disposable database and inspect private evidence. |
| `npm run verify:backup` | Uses `TEST_DATABASE_URL` with a local fallback; requires PostgreSQL backup tools and a role allowed to create a database. Creates a schema and restore database plus sensitive local backup bundles. It does not remove those databases/bundles automatically. |
| `npm run build:local` | Builds a local distribution; this is not startup, backup or cloud acceptance. |

Never rely on fallback database addresses when running destructive or stateful checks. Inspect the script before use and retain sensitive evidence privately. Startup/backup output identifies its evidence location. Review and remove disposable resources deliberately after investigation; do not remove a real installation's identity or encryption key.

## Real cloud checks are an explicit separate step

They require a running control plane, ready cloud/model connections, correct ingress, quota, pinned Harness definitions and an installed-package verification record where required. They may incur provider and model charges. Connection IDs belong in a private configuration; provider keys stay in control-plane credential storage.

```sh
npm run verify:compatibility -- /absolute/path/to/private-config.json
```

Use the complete configuration and filters in the [compatibility runner guide](../../../../testing/compatibility-runner.md). This command runs installed SDKs and creates a new private journal. Selecting one client yields partial evidence; omitted cells do not pass. The narrower `npm run verify:cloud -- /absolute/path/to/private-config.json pi` uses its own configured Harness map and runs both clients; its configuration is not interchangeable with the compatibility runner's schema. Read [its implementation](../../../../tooling/cloud-matrix.ts) and the child journey inputs before preparing it.

`npm run verify:serverless -- <provider> <harness-key>` is a separate pause/resume test. It selects ready connections from the local installation and currently expects MiniMax-M3 model connections. Inspect [the runner](../../../../tooling/cloud-serverless.ts) before use: its private report name is provider/Harness-specific, so preserve earlier reports before rerunning. It is not a generic benchmark or the complete Web journey.

## Preserve the full journey

Each of Python and TypeScript must independently create a Session, upload and verify input, submit idempotently, observe/replay events, complete a real task, handle authorization and approval, retrieve artifacts, continue the conversation, cancel and close. Also continue each language's Session from the other language.

For the full Web task, use the fixed [filter application](../../../../testing/fixtures/filter-app/README.md). Do not edit its acceptance test to make the task pass. Confirm real file changes, test output, authenticated interactive preview, zero report writes before approval and exactly one afterward, final response/state agreement, retained exported artifacts after close, and revoked preview access.

Keep separate branches for connection rotation/disable/delete, Tool refusal/expiration, worker and Runtime failure, cancellation races, uncertain create/delete outcomes, tenant isolation, and actual allowed/denied network probes. Exercise supported pause/resume or other capabilities explicitly. A conversation-only Harness cannot be credited with Tools or previews. A successful compatibility row does not silently cover these branches.

## Evidence template

This is an unexecuted template, not a passing report. Replace each placeholder with an observation and retain failed attempts.

```yaml
status: planned
started_at: null
finished_at: null
source_revision_or_snapshot: null
command: null
exit_code: null
scope:
  level: null
  scenario: null
  provider: null
  harness_id_version_digest: null
  model_protocol_and_identifier: null
  sdk_language_version_artifact_sha256: null
assertions: []
failures: []
not_tested: []
cleanup:
  status: not_checked
  provider_absence_confirmed_at: null
  unresolved_operation_count: null
  private_journal_reference: null
```

Public evidence in testing/evidence contains sanitized commands, timestamps, scope, assertions, failures and cleanup conclusions. Keep actual Session/Run/resource/operation IDs, provider receipts, endpoint identifiers and useful correlation data in access-controlled local evidence. Do not publish keys, raw prompts, request bodies or backups. Do not strip the private IDs needed to retry cleanup.

A lost response is an unknown outcome. Reconcile the recorded operation and exact resource before retrying; do not create another resource or replay a write to make the report green. Successful task cleanup and global account cleanup are separate claims. Report unresolved operations even if every later task succeeds. Historical evidence remains dated and does not automatically certify changed code.

Next: [verified combinations](../integrations/verified-combinations.md), [reconciliation](../operate/reconciliation.md), [contribution review](proposals-and-prs.md).
