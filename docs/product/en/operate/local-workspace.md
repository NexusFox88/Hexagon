# Manage a local workspace

A local workspace contains deployment configuration, private identity, and encryption keys. PostgreSQL contains tasks and connection records. Recovery requires the matching components together.

Complete [installation](../../../local-installation.md), then run these commands from the repository root with the same DATABASE_URL and HEXAGON_DATA_DIR as the original deployment.

```sh
npm run local -- doctor
npm run local -- status
npm run local -- start
```

Doctor checks Node/database and purpose-specific Python, OpenSSH, and cloudflared prerequisites. Missing an optional dependency does not disable every feature. Management health and credential-ingress health are distinct.

The default data directory is `.local/control-plane`. Keep an explicit HEXAGON_DATA_DIR consistent. Select a workspace with Python `Hexagon.local(data_directory=...)` or TypeScript `Hexagon.local({dataDirectory: ...})` when needed.

Do not copy owner Tokens to frontend code. Console and SDKs have separate local discovery mechanisms. A new browser credential after restart does not imply lost database history.

## Save configuration

Use Console Settings → Network & ingress, or a credential-free configuration file:

```json
{"no_proxy":[],"ingress":{"mode":"cloudflare"}}
```

```sh
npm run local -- configure /absolute/path/deployment-config.json
npm run local -- restart
```

Revision checks prevent silent conflicting updates. Explicit process environment overrides saved network settings; bypass entries merge with loopback. Do not store Provider keys here. Save disabled ingress to keep it disabled; stopping a temporary tunnel does not change saved mode.

## Planned downtime

Settle active Runs, close unused cloud Sessions, confirm deletion, then run:

```sh
npm run local -- stop
```

The launcher refuses active Runs, verifies process identity/PID before signalling, and waits for graceful shutdown without unconditional force-killing. If a process exists but cannot authenticate, inspect private service.log and workspace/port selection instead of deleting PID files and starting duplicates.

Cloud deadlines cannot be enforced on schedule while the control plane is down. Unknown cleanup survives in database records and needs reconciliation after restart. Stopping local processes does not delete cloud resources.

Verify restart retains Sessions, connections, artifacts, and usable credentials, followed by a test task with confirmed cleanup. A listening management port alone is insufficient. See [backup/restore](../../../local-installation.md#backup-upgrade-and-restore).

Sources: [launcher](../../../../tooling/local.ts), [settings](../../../../modules/deployment/settings.ts). Next: [networking](networking.md), [self-hosting](self-host.md).
