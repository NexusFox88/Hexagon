# CLI and local management commands

Hexagon currently exposes npm scripts and a local management launcher. There is no standalone `hexagon deploy` command. Run source commands from the repository root after `npm ci`. The source of truth is [package.json](../../../../package.json) and [tooling/local.ts](../../../../tooling/local.ts).

## Invocation and environment

```sh
npm run local -- status
npm run local -- doctor
```

`npm run local` with no subcommand defaults to `status`. Arguments after npm's `--` reach the launcher. It uses positional arguments, not a general option parser. There is no dedicated `--help` branch: unknown subcommands print usage and fail. Do not treat ignored extra arguments as supported flags.

| Variable | Launcher behavior |
| --- | --- |
| `HEXAGON_DATA_DIR` | Data directory, resolved relative to the invoking directory; default `.local/control-plane` |
| `DATABASE_URL` | Database used by doctor, migrations, backup and restore; default `postgres://hexagon@127.0.0.1:55432/hexagon` |
| `PORT` | Local management health target; default `8787` on `127.0.0.1` |
| `CLOUDFLARED_BINARY` | Executable checked by doctor; default `cloudflared` |
| Proxy and credential-ingress environment | Applied with saved deployment settings when starting the managed service; explicit environment can override saved settings |

Use the same data directory, database and port across commands for one installation. The default database URL does not create PostgreSQL or its database. `TEST_DATABASE_URL` belongs to test scripts; it does not select the launcher's database. More deployment settings are covered in [networking](../operate/networking.md).

Every launcher invocation first creates the data directory if absent, including `status`. All subcommands except `status` also acquire an exclusive `operation.lock` there, released on normal completion. A lock conflict is not permission to remove the file: establish whether an operation is still active before investigating a stale lock.

## Managed-service commands

| Command | Output and effects | Failure or limitation |
| --- | --- | --- |
| `status` | Prints authenticated health JSON, or `state: stopped` / `unreachable` based on the recorded PID | A stopped/unreachable status can still exit zero; inspect the JSON. No authenticated health means no proof of readiness. |
| `doctor` | Prints Node, Python, OpenSSH, cloudflared and database checks; database probe is `SELECT 1` | Nonzero when Node or DB is not ready. Missing optional executables are reported but do not alone set failure. It does not verify every dependency version or cloud account. |
| `start` | Applies DB migrations, loads deployment settings, starts a detached process, appends private `service.log`, records PID and waits for authenticated health | Existing healthy service returns `already_running`. An existing inaccessible managed process blocks another start. Startup deadline is 90 seconds; timeout does not establish process termination. |
| `stop` | Checks health and process identity, sends SIGTERM, waits up to approximately 30 seconds | Active Runs/busy execution, unverified identity or still-running shutdown cause failure. No forced kill. It does not destroy cloud resources. |
| `restart` | Executes stop and then start | Stop failure prevents start; not a zero-downtime restart. |

Successful start output includes `state`, Console URL, the owner credential file/field location and credential-access status; it does not print the owner token. Source `npm run dev` starts the control plane in the foreground and is not the managed launcher or a file watcher. Use `npm run db:migrate` before that direct path. Do not run foreground and managed instances against the same dataset accidentally.

Caught launcher failures print a message to stderr and set exit code 1. Normal commands exit zero unless their check sets a failure code. npm also prints its own script wrapper, so the entire `npm run` stdout should not be assumed to be a single JSON document. Do not classify readiness or cleanup using exit code alone.

## Configure deployment settings

```sh
npm run local -- configure /absolute/path/deployment.json
```

The file contains the deployment config object, not an API envelope. For a development instance intentionally using no credential ingress:

```json
{
  "no_proxy": ["localhost", "127.0.0.1"],
  "ingress": {"mode": "disabled"}
}
```

This replaces the saved config after schema validation and revision checking; it is not a partial merge. Fields omitted from the file take schema defaults. Allowed ingress modes are `cloudflare`, `disabled` and `external` (with an HTTPS origin in `url`). `outbound_proxy` is optional; `no_proxy` defaults to an empty array. See [settings.ts](../../../../modules/deployment/settings.ts) for exact URL/schema constraints.

The result contains the revision and `restart_required: true`; the command does not restart the service. An explicitly supplied process environment may still override the saved file. Disabled ingress prevents protected cloud execution from reaching the control-plane credential service; it is not a substitute for configuring a working cloud connection. Use [networking](../operate/networking.md) for external ingress and proxy setup.

## Export diagnostics

```sh
npm run local -- diagnostics /absolute/path/new-diagnostics.json
```

The destination must not exist and its parent directory must exist. The command writes a mode-0600 JSON file and prints `{"written":true}`. It uses the allowlisted [support projection](../../../../modules/diagnostics/support.ts): timestamp, platform/architecture/Node, reachability and service-state indicators. It does not bundle raw logs, arbitrary health fields, tokens or user prompts. An unreachable service can still produce a useful report and a successful command exit; check `reachable` and the state fields. Review the report before sharing.

## Offline backup and restore

```sh
npm run local -- backup /absolute/path/new-private-backup
```

Stop the service and close all Sessions first. Select the matching source database and data directory explicitly. The destination must be new; its parent must exist. Backup checks local identity and encryption compatibility, dumps the selected database schema with `pg_dump`, and includes `master.key`, `owner.json`, optional deployment settings, a database dump and integrity manifest. Output reports directory, schema, files and `state: verified`. The bundle contains secrets and must remain private. A failed attempt can leave a partial destination; do not reuse it as a verified backup.

```sh
DATABASE_URL='postgres://hexagon@127.0.0.1:5432/hexagon_restore' \
HEXAGON_DATA_DIR='/absolute/path/empty-restored-data' \
npm run local -- restore /absolute/path/private-backup
```

The destination database must already exist and contain no user tables/views/sequences. The data directory must be absent or empty apart from the launcher's lock. Restore verifies the manifest/hashes, uses `pg_restore`, validates the restored identity, and returns `requires_start: true` and the restored schema. It does not start the service or recreate cloud resources. Configure the restored schema's search path when it is not the default. Backup/restore require PostgreSQL client tools and suitable privileges.

Do not blindly retry a failed restore: database or staging changes may remain. Inspect the failure and use the recovery procedure in [backup and restore](../operate/backup-restore.md). Errors such as `backup_close_sessions_first`, `backup_identity_mismatch`, `restore_database_not_empty` and `restore_integrity_failed` identify distinct corrective actions; never bypass them by deleting the source identity.

## Source development and verification scripts

| Script | Purpose / side effects |
| --- | --- |
| `npm run check` | TypeScript type check without emitting code |
| `npm test` | Vitest; full DB coverage requires test database configuration |
| `npm run verify` | Requires `TEST_DATABASE_URL`; runs check and tests |
| `npm run verify:packages` | Requires test DB and Python packaging dependencies; builds/installs SDK packages in temporary consumers and runs selected API tests |
| `npm run verify:startup` | Uses `DATABASE_URL`; creates isolated schema/data, launches and restarts services |
| `npm run verify:backup` | Uses test DB; creates a restore database and private backup material; requires create-database privileges |
| `npm run build:local -- <new-directory>` | Builds a local distribution and SDK output; default target is a new `.local/releases/local-<uuid>` directory; parent must exist |
| `npm run release:check` | Checks source inventory/provenance and writes `.local/release-audit/latest.json`; does not publish |
| `npm run release:public-check` | Also fails on configured public-release blockers; does not publish |

The release checker accepts `--artifact <directory>` after npm's separator to inspect an artifact. Its pattern scan is not comprehensive secret detection. See [testing](../contribute/testing.md) for evidence scope, private artifacts and required checks.

Real-cloud scripts are separate: `verify:cloud -- <private-config> [harness ...]`, `verify:compatibility -- <private-config>` and `verify:serverless -- <provider> <harness-key>`. They may create resources and incur cloud/model charges; their inputs and scope differ. Read [testing](../contribute/testing.md) before use. Internal fault-injection scripts are not installation steps.

A distribution produced by build:local has a different generated package manifest: `local`, `start` and `db:migrate`. Install its dependencies with `npm ci --omit=dev`, then use `npm run local -- start` or `npm start`. Do not expect source verification commands to exist in that distribution. No public package/download availability is implied by a successful local build.

## Verification scope

The command inventory was checked using `npm run` (exit 0), which lists scripts without executing them. Operational semantics above were reviewed against the launcher, settings, backup, diagnostics and build implementations. This documentation check did not start/stop a service, apply migrations, restore a database or run cloud acceptance. Historical operational evidence has its own scope and date.

Next: [installation](../start/install.md), [local workspace](../operate/local-workspace.md), [testing](../contribute/testing.md).
