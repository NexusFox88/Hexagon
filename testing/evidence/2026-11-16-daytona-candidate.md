# Daytona moved to future candidates

The user explicitly requested removing Daytona from the compatibility list and keeping it as a future candidate on 2026-11-16. This replaces the previous deferral/blocker, rather than marking any Daytona attempt passed.

Changes:

- Removed Daytona's Connection adapter from the shared supported Sandbox registry. It is absent from `/v1/catalog`; creating a new Daytona Connection fails with `unsupported_connection_provider`, and Session preflight cannot select an existing Daytona connection because its supported adapter is absent.
- Removed Daytona from the Console's new Sandbox selector. Existing records and prototype code are not deleted. The internal connector factory retains historical resource inspection/reconciliation/cleanup capability.
- Moved Daytona out of the current execution matrix and provider table into a future-candidate section. Updated README, architecture status, credential-backend documentation and the acceptance ledger. Historical test evidence remains historical, including failed and unexecuted Daytona cases.
- Replaced the preflight test's alternate-provider fixture with current supported Instabox, preserving its unsupported-network-policy assertion. Added checks for eleven supported providers, absent Daytona catalog entry and rejection of new Daytona connections.

Verification:

- `npm run check`: passed.
- Focused PostgreSQL preflight, retained Daytona adapter regressions, Console UI contract and localization: 4 files / 10 tests passed.
- Restarted the local service with its active-Run guard; returned `running` and credential ingress `reachable`.
- Actual authenticated `/v1/catalog` returned exactly eleven Sandbox providers and no Daytona.
- Actual Console new-provider selector in both Chinese and English showed E2B, Modal, Boat, Instabox, Vercel Sandbox, Blaxel, Fly Sprites, Upstash Box, Agent37, Fly Machines and Freestyle VMs. Drafts were cancelled; no account configuration or cloud resources were created. Restored Chinese and retained the Console.

The full source-to-evidence audit remains `2026-11-16-delivery-scope-audit.md`, including 35 verified combinations / 70 primary Runs, the fresh current-code dual SDK journey and installed SDK checks. Its sole outstanding current acceptance condition was Daytona. The user's explicit removal resolves that condition for the current scope. Broader future integrations remain unimplemented extensions; no extra capabilities or Daytona success are implied. No code was committed or published.
