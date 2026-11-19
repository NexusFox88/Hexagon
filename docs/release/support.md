# Developer preview support and evidence

Catalog availability, compatibility, readiness and verification are separate. There is no universal Sandbox × Harness support promise, stable-release SLA or cross-provider zero-cost-pause promise.

An earlier cloud run has scoped evidence: E2B public OCI OpenCode 1.2.27 pinned to the image in [E2B OCI evidence](../../testing/evidence/2026-11-19-e2b-oci-preparation.md), using installed Python with MiniMax Chat and installed TypeScript with MiniMax Messages. Initialization, same-session continuation, file-byte/native-session restoration, MCP, artifact retention and cleanup passed. Earlier failures remain recorded. These two paths do not establish the entire SDK/protocol cross-product, private images or every application account.

**Latest release-candidate attempt failed:** the fresh installation journey encountered an unknown E2B image-preparation outcome and unavailable credential ingress for TypeScript. It is not release-certified; see [release preparation evidence](../../testing/evidence/2026-11-19-open-source-preparation.md). The earlier pass above does not supersede this failure.

Other existing integration evidence is in [the matrix](../../testing/execution-matrix.md), [provider scope](../sandbox-providers.md), [Harness recovery](../../testing/evidence/2026-11-19-harness-serverless-ui.md) and [headless plan](../plans/2026-11-19-orthogonal-agent-platform-completion.md). Historical results keep their date/version/scope. Daytona is excluded. Known user-deferred historical resource outcomes are not claimed cleaned.

## Claim policy

- **Verified scenario**: exact provider configuration, Harness version/digest, model protocol, SDK, assertion list, date and cleanup evidence exist.
- **Partial**: only a subset of that journey passed. Name it explicitly.
- **Unverified / experimental**: implementation or recipe exists but matching evidence is missing.
- **Failed**: a recorded attempt failed; a later pass does not erase it.
- **Stale**: the relevant implementation/version changed and matching evidence has not been rerun.
- **Unsupported**: a documented contract cannot be satisfied by the current adapter; distinguish adapter gaps from provider impossibility.

Current fresh-install host coverage is not a certified OS matrix. macOS development evidence does not prove Linux/Windows packaging. Linux CI configuration only becomes evidence when run on a repository host. Windows remains unverified.

## Compatibility and upgrades

During preview, breaking API/SDK/schema changes require explicit release notes and migration guidance. Pin control-plane and SDK release artifacts together; pin Harness versions and OCI digests independently. Additive fields should preserve old readers. Never silently substitute another provider/Harness/model or change a Session's pinned definition.

Back up the database plus matching key/config before upgrading. Migration checksums reject incompatible state; rollback uses the matching old release and backup in a fresh target, not destructive reverse migrations. See [installation](../local-installation.md).
