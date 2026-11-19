# Upgrade code and migrate data

An upgrade involves control-plane code, database schema, SDKs, and execution protocols. Identify the target source, retain the old distribution, and create a matching recoverable backup before replacing the environment.

## Before upgrading

Record source revision/distribution version, lockfile, SDK versions, migration inventory, and deployment configuration. A local build is not automatically a named public release.

Settle Runs, close Sessions, and confirm cleanup. [Reconcile](reconciliation.md) unknown outcomes first. Create an [offline matching backup](backup-restore.md) and retain the corresponding old code.

Do not assume a new worker can resume arbitrary historical invocations. Credential-boundary, Runtime-protocol, or Harness changes can require fresh Sessions; read their migration instructions.

## Apply the update

Prepare new code independently while retaining the old distribution. Install its locked dependencies. Managed local startup performs migrations:

```sh
npm ci
npm run local -- start
npm run local -- status
```

Compiled distributions follow their production installation instructions. Foreground deployments migrate with `npm run db:migrate` before starting; hosted identity/key prerequisites still apply. Do not improvise a mixed-version rollout over the same deployment.

Migrations run under a database transaction/advisory lock. Changed applied SQL checksums are rejected. Unknown newer migrations produce `database_schema_newer_than_code`. Do not delete migration records or edit historical SQL to bypass protection.

## Verify afterward

Confirm identity/database/key alignment and working management/credential ingress. Read historical initialization, Runs, events, and artifacts. Complete a fresh task using the intended combination. Check affected contracts in both SDKs and run each full cloud journey when the change requires it. Review previews, authorization/approval, and cleanup according to impact.

Type checking alone does not prove migration or cloud recovery. Record actual commands, versions, successes, and failures.

## Roll back

Database migrations are not promised to be reversible. Restore the old code with its matching old backup into a fresh target, then verify recovery. Do not simply run old code against the newer schema.

An older backup omits later writes. Inventory new business results, external side effects, and cloud resources before rollback. Preserve the post-upgrade database for investigation and never overwrite the only recoverable copy.

Sources: [migrator](../../../../modules/storage/migrate.ts), [launcher](../../../../tooling/local.ts). Next: [backup/restore](backup-restore.md), [diagnostics](observability.md).
