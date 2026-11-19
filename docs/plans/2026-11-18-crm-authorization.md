# CRM and application authorization completion

## Delivery contract

A user selects a CRM, connects an account using a token or OAuth, sees the actual verification scope, binds it explicitly to a Session through either SDK, and the Agent calls only allowed operations through the control plane. Original provider credentials never enter the guest. Writes require approval and unknown writes never replay. Account/config changes must not silently widen an existing Session's access.

## Work packages

1. **CRM adapters:** HubSpot OAuth plus existing private token; Attio token/OAuth and bounded record operations; Salesforce token/OAuth with validated instance origin and bounded Contact/Account/Opportunity operations. Fixed API mappings, no arbitrary SOQL or arbitrary authenticated destination. Preserve source references. Live-account status stays unverified without authorized credentials.
2. **Shared verification:** separate local allowed operations, granted provider scopes and per-operation permission evidence. Never perform a write to test permission. Missing introspection means unknown, not verified. Preserve actionable authentication/permission/rate-limit diagnostics. OAuth callback uses the same verification as token onboarding.
3. **Credential lifecycle:** persist expiry/refresh status safely; invalidate revoked credentials, bind grants to OAuth client identity, avoid reuse of an uncertain rotating refresh. Explicit local disconnect removes reusable connection credentials, cancels pending OAuth flows and invalidates approval/config versions; distinguish local disconnect from provider-wide revocation. Support both SDKs and Console.
4. **Authorization continuity:** pin verified remote account identity into Session snapshots and reject a later identity swap. Keep current selected-operation intersection and tenant checks. Test managed-secret disable/rotation and stale approvals.
5. **UX:** CRM icon catalog, Salesforce instance configuration, precise permission/verification status, reauthorization and disconnect actions, complete English/Chinese copy. Reuse existing dialogs and keyboard/scroll ownership.
6. **Evidence:** deterministic provider/protocol fixtures, database lifecycle and tenant tests, Python/TS API journeys against a controlled upstream fixture (explicitly not real CRM acceptance), full regression, real bilingual Console review. Existing cloud matrix proves runtime transport only, not new CRM credentials or permissions.

## Explicit limits

No new LLM gateway, credential injection into Sandbox, billing setup, external KMS product, arbitrary CRM workflow builder, or automatic write probes. Provider-level revoke is not inferred from local disconnect; user can revoke in the provider console. Missing external account consent is recorded as unverified, not a pass. No commits or publishing.

## Sources

- https://docs.attio.com/rest-api/endpoint-reference/meta/identify
- https://docs.attio.com/rest-api/tutorials/connect-an-app-through-oauth
- https://developers.hubspot.com/docs/api-reference/auth-oauth-v1/guide (v1 deprecation: use current token endpoint)
- https://developer.salesforce.com/docs/atlas.en-us.api_rest.meta/api_rest/intro_understanding_authentication.htm

## Progress

All six work packages are implemented. Final verification: TypeScript check and 93 test files / 297 tests passed. Python/TypeScript controlled-upstream journeys, bilingual browser review, narrow-screen form review and local disconnect were completed. The disabled UI fixture was removed and the local service restarted.

See [actual evidence](../../testing/evidence/2026-11-18-crm-authorization.md) for command results and exact coverage. Live CRM account consent and real CRM operations remain unverified; no fixture is represented as cloud acceptance. Provider-wide revoke and external KMS remain outside this scope.
