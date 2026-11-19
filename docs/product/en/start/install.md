# Install and start a local control plane

Start Hexagon from a source checkout. You will be able to open Console, configure cloud Sandbox/model connections, and let local SDKs discover the workspace.

## Prerequisites

- Node.js 22.19.0 or later.
- Running PostgreSQL and a role able to create tables in a dedicated database.
- Python 3.10 or later for the Python SDK.
- cloudflared for temporary development credential ingress; OpenSSH for Instabox.
- A cloud Sandbox account and model endpoint for subsequent real tasks.

Use the repository's local build/install paths. Do not assume similarly named npm/PyPI packages are publicly published. Installation does not install PostgreSQL or create provider accounts.

## Start

From the repository root:

```sh
npm ci
export DATABASE_URL='postgres://YOUR_USER@127.0.0.1:5432/hexagon'
npm run local -- doctor
npm run local -- start
npm run local -- status
```

Replace the connection string with your already-created dedicated database. Never reuse an unrelated application's database. Without DATABASE_URL, the development default is postgres://hexagon@127.0.0.1:55432/hexagon; that does not mean such a database exists.

Doctor checks prerequisites. The launcher applies migrations and manages the local service. On failure, inspect database connectivity and reported missing dependencies before retrying. Preserve data and its matching encryption key; deleting them does not resolve unknown cloud resources.

Open [local Console](http://127.0.0.1:8787/console/). Private data defaults to .local/control-plane, configurable through HEXAGON_DATA_DIR. A retained database must retain its matching encryption key.

## Configure execution

1. Create a provider connection under Infrastructure → Sandbox, validate, and enable.
2. Configure endpoint, model ID, protocol, and credentials under LLM, validate, and enable.
3. Select a compatible Harness/connections in API Playground to generate Python or TypeScript code.

An Agent template is optional. Cloud Sandboxes must reach the credential ingress. Opening Console does not prove cloud connectivity. Settings → Network & ingress controls saved deployment settings; restart after changing them. Use a stable external HTTPS ingress or an explicitly selected development tunnel as described in [networking](../operate/networking.md). Management-only disabled ingress does not enable protected cloud execution.

## Install SDKs

Use a separate Python virtual environment:

```sh
python3 -m venv .venv-docs
. .venv-docs/bin/activate
python3 -m pip install -e sdk/python
```

Build TypeScript from the repository:

```sh
npm --prefix sdk/typescript run build
```

Repository programs can import sdk/typescript/dist/index.js. Independent applications can use the [local package distribution process](../../../local-installation.md#local-package-distribution).

Python Hexagon.local() and TypeScript await Hexagon.local() discover the current workspace without manually copying an owner token. For multiple workspaces, pass data_directory in Python or dataDirectory in TypeScript. Hosted connections use an explicit URL/Token instead of local discovery identity.

## Completion and shutdown

Installation is complete when status reports availability, Console opens, and database/workspace identity are usable. Real execution additionally requires validated connections, cloud allocation, and a successful task. Do not record installation as full cloud acceptance.

Before planned shutdown, finish/cancel active Runs, close unused cloud Sessions, and confirm cleanup:

```sh
npm run local -- stop
```

Stopping the control plane does not delete cloud Sandboxes. Its expiry enforcement cannot run on schedule while stopped.

Next: [first Session](first-session.md). See [local operations](../operate/local-workspace.md) and the [launcher contract](../../../local-installation.md) for deployment, proxies, backup, and recovery. This page was checked against current documentation/scripts; no clean-machine installation or cloud journey was rerun for this translation.
