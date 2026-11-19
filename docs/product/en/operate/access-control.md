# Manage identity, permissions, and application Tokens

Use application Tokens for configured execution and owner identities for administration. These identities belong to control-plane tenants; they are not automatically product users or team roles.

Local Console/SDK access uses protected discovery. Remote clients use explicit URLs and Tokens. Do not distribute discovery files or owner Tokens to browsers.

Application Tokens can read allowed task resources, create Sessions, submit/cancel Runs, upload initial files, close Sessions, and use permitted preview/access operations. They can create Agents but cannot infer permission to revise/archive them. Connection CRUD, Secrets, Token management, approval decisions, Tool refusal/reconciliation, and other management routes require appropriate owner access. See the exact [route allowlist](../../../../modules/credentials/application-tokens.ts).

Applications must still authorize business ownership within a shared tenant. A Session ID is not authorization, and an application Token is not inherently scoped to a single Session.

## Issue a Token

Through Console or an owner-authorized backend:

```python
issued = owner_client.create_token('application backend', expires_in_days=30)
# Store issued['token'] privately; retain issued['id'] for administration.
```

```typescript
const issued = await ownerClient.createToken('application backend', 30);
// Store issued.token privately; retain issued.id for administration.
```

Creation returns the usable plaintext value; listing returns metadata. The database stores a digest and cannot recover an old plaintext Token. Lifetime is currently 1–365 days, default 30. Do not log the whole response.

## Rotate and revoke

`rotate_token` / `rotateToken` atomically revokes the old Token and returns a new ID/value with the original expiry. It does not extend lifetime. Plan the client switch because the old Token is invalid once rotation succeeds.

For application-managed overlap, create a separate Token, deploy and verify it, then revoke the old one. That is different from atomic rotation, and you own the overlap window.

`revoke_token` / `revokeToken` revokes an application Token. last_used_at helps investigate usage but does not prove every client has migrated.

## Diagnose and verify

For 401, inspect format, expiry/revocation, and the intended control plane. A 403 `owner_token_required` means management permission is required, not necessarily an incorrect credential.

Verify allowed execution, denied administration, rejection of the old rotated Token, preserved expiry, and failed authentication after revocation. Also verify business-user isolation and cross-tenant read/binding denial.

Sources: [Tokens](../../../../modules/credentials/application-tokens.ts), [authentication](../../../../modules/credentials/api-auth.ts). Next: [credentials](credentials.md), [backend integration](../build/backend-integration.md).
