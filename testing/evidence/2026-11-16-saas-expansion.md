# SaaS connector breadth expansion — 2026-11-16

## User-directed scope

The user requested broad reuse/migration of mature open-source SaaS integrations and explicitly waived account authorization and live validation for this development batch. No account credentials were read, no OAuth consent was requested, no external SaaS action was executed and no Sandbox was allocated during this batch. Existing three-provider live evidence remains historical and does not cover these new providers.

## Implemented

Expanded the shared registry from 11 providers / 48 operations to **28 providers / 139 operations**. Added **17 providers / 91 operations**:

- Microsoft: Outlook Mail, Outlook Calendar, OneDrive, To Do, Teams.
- Google: Sheets, Contacts, Tasks.
- Work management: Asana, Airtable, ClickUp, Trello.
- Messaging: Discord, Telegram Bot.
- Files/CRM/scheduling: Dropbox, HubSpot, Calendly.

All use the existing credential storage, app catalog, Console connection editor, Session tool bindings and ToolBroker. The Python/TypeScript applications methods discover the expanded catalog without per-provider SDK changes. New operations have complete English/Simplified Chinese labels. Trello has structured credential metadata and separate password inputs; individual credential components are redacted. Invalid provider request construction fails before transport as an argument error rather than an unknown remote write.

Sources: 17 Activepieces community action snapshots and 2 OAuth auth snapshots (MIT). SHA-256 fingerprints retained in `third_party/activepieces/expansion/provenance.json`; all 13 snapshots with discovered upstream blob SHAs match the retained bytes. No upstream enterprise/runtime code or n8n/Pipedream implementation was imported. The root source survey and exact implementation limitations are in `docs/saas-source-survey.md` and `docs/application-connectors.md`.

## Local-only checks

- `npm run check`: passed.
- `node --check apps/console/app.js`: passed.
- `npx vitest run integrations/apps/expansion.test.ts integrations/apps/registry.test.ts testing/console-i18n.test.ts testing/console-ui-contract.test.ts`: **4 files / 13 tests passed**.
- Checks use stubbed transport, static catalogs and schema inspection. They cover credential placement/redaction, Telegram token materialization and no webhook takeover, Graph pagination restrictions, request-construction failure before dispatch, Sheets RAW append behavior, Google task due/parent mapping, Discord mention suppression, write approval metadata and localization parity.
- No full database regression, packaged dual-SDK cloud journey, browser acceptance or real account/provider acceptance was run for this batch, per the narrowed development scope.
- The local development service was restarted to load the catalog; no existing account configuration was changed.

## Scope limits

These are useful subsets of each provider's API, not complete upstream-piece ports. OneDrive/Dropbox file operations return metadata, not binary content. Teams uses delegated user permissions. Google/Microsoft app grants remain separate. Trello uses API key plus token; Airtable, ClickUp, HubSpot and Calendly currently accept personal/private-app tokens without native OAuth onboarding. Telegram uses Bot API and does not offer personal-message history or take over updates/webhooks. Feishu/Lark, generic remote MCP and additional applications remain unimplemented.
