# Manage and rotate protected credentials

Identify what you are changing: an application Token, upstream credential, registry Secret, or database encryption key. They have different lifecycle operations.

See [access control](access-control.md) for application Tokens. This page covers managed Secrets referenced by protected connections. Values are write-only through the API, not retrievable backups.

## Inventory dependencies

Query `secret(secret_id)` for metadata and dependent connections/Harnesses. Record readiness, enabled state, active Sessions, and cleanup responsibilities. Settle work before planned rotation. Upstream revocation remains an upstream operation; Hexagon does not automatically remove account permissions there.

## Replace and revalidate

With an owner client and private environment input:

```python
import os
client.update_secret(secret_id, value=os.environ['REPLACEMENT_SECRET'])
for connection_id in dependent_connection_ids:
    result = client.validate_connection(connection_id)
    if result['status'] != 'ready':
        raise RuntimeError('Dependent connection remains disabled')
    client.update_connection(connection_id, enabled=True)
```

```typescript
const replacement = process.env.REPLACEMENT_SECRET;
if (!replacement) throw new Error('Missing replacement secret');
await client.updateSecret(secretId, { value: replacement });
for (const id of dependentConnectionIds) {
  const result = await client.validateConnection(id);
  if (result.status !== 'ready') throw new Error('Dependent connection remains disabled');
  await client.updateConnection(id, { enabled: true });
}
```

Dependency IDs come from the prior reference inventory. Changing value or enabled state transactionally disables dependent connections, clears validation, and increments versions. Revalidating the list is not one transaction; retain partial progress on failure.

Create fresh Sessions for the new policy version. Do not assume old pinned grants migrate automatically. Already-admitted upstream operations may finish and cannot be undone through revocation.

## Disable, delete, and registry references

Disabling does not delete the upstream account. Undeleted connection or Harness image references prevent deletion with `secret_in_use`. Do not bypass this by editing database references.

Registry Secrets serve permitted image pull paths and are read for subsequent provisioning, not injected as ordinary Agent environment. Verify new pulls, private-registry capability, and existing registration references separately.

## Encryption key recovery

These APIs rotate upstream values, not the encryption master key. They do not expose a general master-key rotation workflow. Replacing master.key or hosted HEXAGON_MASTER_KEY can make existing encrypted data unreadable; do not try it as troubleshooting.

Back up matching database, key, and deployment identity privately. Logical Secret deletion may retain historical encrypted envelopes; it is not physical erasure.

Verify new Sessions can access the allowed service, old grants reject subsequent requests, dependencies are individually revalidated, and original secrets are absent from logs/guest environment. Sources: [managed Secrets](../../../../modules/credentials/managed-secrets.ts), [credential boundary](../../../secret-management.md). Next: [connection lifecycle](../build/connection-lifecycle.md).
