# Self-host the control plane

Run your own control plane, database, and ingress with your own cloud Sandbox/model accounts. The repository provides source startup and local compiled distribution; this guide does not assume published Docker images, Helm charts, or SaaS onboarding.

## Choose a mode

Use local mode and the managed launcher on a trusted single-user machine. Use hosted mode for an explicitly addressed deployment with configured identity, storage, and stable credential ingress. Publicly binding local management is not a substitute for hosted identity setup.

A deployment needs Node 22.19+, PostgreSQL, the matching encryption key, API/Console, worker, separate preview ingress, and a separate credential listener. The current main entry assembles API and worker together; there is no assumed separate worker CLI.

## Source and compiled distribution

Install source dependencies with `npm ci`. Maintainers can build:

```sh
npm run build:local -- /absolute/new-release-directory
```

In that directory, `npm ci --omit=dev` installs production dependencies. Local-mode management uses the included local scripts. The artifact includes compiled code, Runtime/Console assets, and locked dependencies, not your database or credentials. Building does not publish it.

## Hosted prerequisites

| Setting | Requirement |
| --- | --- |
| HEXAGON_DEPLOYMENT_MODE | `hosted` |
| DATABASE_URL | Provisioned and migrated database |
| HEXAGON_MASTER_KEY | Canonical base64 32-byte key matching encrypted data |
| HEXAGON_BOOTSTRAP_TOKEN | Valid Token for an existing database owner identity |
| HEXAGON_ACCESS_URL | Stable HTTPS origin without userinfo, query, fragment, or extra path |
| HEXAGON_ACCESS_TUNNEL | Temporary tunnels are rejected in hosted mode |

Supply secrets through private deployment configuration. Do not put actual values in examples or shell history. The bootstrap Token is not an arbitrary string: startup authenticates its existing owner identity. Hosted mode has no complete organization/login provisioning service; prepare identity through an appropriate supported migration or deployment process. An empty database and random Token are insufficient.

With identity, key, ingress, and database prepared, a source deployment runs:

```sh
npm ci
npm run db:migrate
npm run dev
```

The foreground dev entry does not provide process management, TLS, or backup. Configure those in your deployment environment and retain database/key storage. Configure [separate ingress](networking.md) before exposing services. SDKs use explicit URLs and Tokens.

## Acceptance

Verify migrations, authentication, API/worker health, Sandbox-to-credential connectivity, model execution, private previews, retained artifacts, and confirmed cleanup. Verify records and decryption after restart. Test multi-replica, high availability, and capacity in the actual topology rather than inferring them from lease support.

Before upgrades, settle work and back up matching database/key material. SaaS organizations, billing, and managed operations are not automatically supplied by hosted mode. Sources: [mode validation](../../../../modules/deployment/mode.ts), [entry](../../../../apps/control-plane/main.ts), [distribution](../../../local-installation.md).
