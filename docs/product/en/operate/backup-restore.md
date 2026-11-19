# Back up and restore the control plane

This page covers existing local offline commands. A bundle contains one database schema and matching private identity/key material, not a complete live Sandbox snapshot or hosted infrastructure backup.

## Prepare an offline backup

Install pg_dump/pg_restore and select the correct DATABASE_URL/HEXAGON_DATA_DIR. Settle Runs, close every cloud Session with confirmed cleanup, and stop the local service. The implementation rejects running services, unclosed Sessions, and mismatched identity/decryption.

```sh
npm run local -- stop
npm run local -- backup /absolute/private/new-backup-directory
```

The destination must be new. Bundles contain database.dump, master.key, owner.json, optional deployment.json, hashes, and migration metadata. Private permissions are used; do not commit or publicly upload bundles.

## Restore into a fresh target

Create an empty PostgreSQL database and an absent/empty data directory. Replace this illustrative connection with your dedicated target:

```sh
DATABASE_URL='postgres://YOUR_USER@127.0.0.1:5432/hexagon_restored' \
HEXAGON_DATA_DIR='/absolute/private/restored' \
npm run local -- restore /absolute/private/new-backup-directory
```

Restore validates the manifest, file types, and hashes, rejects a nonempty database, restores transactionally, then verifies owner identity and decryption of encrypted records. For a non-public returned schema, configure the subsequent connection search_path. Start with the target database/data directory rather than accidentally starting the old workspace.

Discovery and PID files are regenerated. If failure occurs after database restoration, the target may no longer be empty. Preserve diagnostics and inspect staging/database state instead of blindly repeating or removing data.

## Trust and consistency

Restore only trusted bundles. Hashes establish integrity against a manifest, not author trust. The database and key must match.

The local command requires closed Sessions to avoid resurrecting live operations. Independently restoring older or online database copies requires additional reconciliation of later cloud resources and external writes; do not assume safe replay.

Hosted external key storage, identity, TLS, and deployment configuration need their own backup process. Local restore success does not establish hosted recovery.

## Verify

In an isolated target, read history, initialization, events, and artifacts; verify decryption; run a fresh task and confirm cleanup; ensure old state did not unexpectedly recreate resources. Record commands, schema, scope, and failures without publishing backup files or secrets.

Implementation: [offline backup/restore](../../../../modules/deployment/backup.ts). Next: [upgrades](upgrades.md), [reconciliation](reconciliation.md).
