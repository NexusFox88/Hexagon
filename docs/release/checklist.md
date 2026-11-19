# Public release checklist

The owner must approve publication separately. This repository has no automatic publishing workflow. `npm run release:check` checks engineering preparation; `npm run release:public-check` also requires all explicit policy decisions. Passing a scanner is not a license review or cloud acceptance.

1. Choose project license, install the actual LICENSE text and record its identifier. Review adapted source, assets and upstream Harness redistribution. Fill the private vulnerability reporting URL/contact. Confirm repository/package ownership. Keep all unresolved policy flags false.
2. Reconcile README, localized entry, API/SDK examples and scenario-specific support claims. No manual local Token instructions or blanket compatibility promises.
3. Run locked-dependency database checks, installed SDK tests, startup/restart and backup/restore. Run a fresh production-only install in the intended OS matrix.
4. Perform blank-workspace Console → configured cloud provider/model → installed Python/TS → Tools → pause/wake → retained result → confirmed cleanup. Inspect both languages/themes, keyboard, focus and scrolling. Keep private IDs out of public artifacts.
5. Build with `npm run build:local -- /absolute/new-directory`; inspect that directory with `npm run release:check -- --artifact /absolute/new-directory`. Keep the SHA-256 manifest. Install production dependencies separately; never distribute a working data directory.
6. Review archive contents, SDK package contents, dependency inventory and secret findings; review sanitized evidence and screenshots manually. Scan git history once a repository exists; filesystem checks do not scan history.
7. Record the exact candidate, checksums, scenario evidence, known issues and migration/rollback path in release notes. Complete `release-policy.json` only with evidence, then run `npm run release:public-check`.
8. Owner approves publishing code/packages/images. After publication verify consumer installs from the actual endpoints; local tarball tests do not establish published-package availability.

Temporary development ingress should be stopped after isolated tests. Preserve user services. Cloud testing uses account quota and must not be scheduled or enabled on arbitrary external PRs. A vulnerability report and maintenance policy must have a real owner before public release.
