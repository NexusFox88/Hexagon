# Change connections and manage existing Sessions

A connection holds a Provider, model, or Tool account configuration. Updating, disabling, closing dependent Sessions, and deleting a connection have different effects.

Use a management identity; ordinary execution Tokens cannot update or delete connections. Record the connection ID, affected Sessions, and execution evidence before changing it.

## Revalidate after changes

```python
import os
client.update_connection(connection_id, credential=os.environ['REPLACEMENT_CREDENTIAL'])
checked = client.validate_connection(connection_id)
if checked['status'] != 'ready':
    raise RuntimeError('Connection verification failed; keep it disabled')
client.update_connection(connection_id, enabled=True)
```

```typescript
const replacement = process.env.REPLACEMENT_CREDENTIAL;
if (!replacement) throw new Error('Missing replacement credential');
await client.updateConnection(connectionId, { credential: replacement });
const checked = await client.validateConnection(connectionId);
if (checked.status !== 'ready') throw new Error('Verification failed; keep disabled');
await client.updateConnection(connectionId, { enabled: true });
```

These are backend snippets; never log the replacement value. Configuration/credential changes invalidate verification and disable the connection. Setting enabled in the same update cannot bypass revalidation. Verification contacts upstream services and model verification can incur usage.

## Disablement

For Sandbox/model connections, disabling blocks new Sessions and new Runs on existing Sessions. The worker checks again before a new Harness invocation, including work queued before disablement. An identical already-accepted idempotency request can still return its original Run. Existing invocation recovery and resource cleanup remain necessary.

```python
client.update_connection(connection_id, enabled=False)
```

```typescript
await client.updateConnection(connectionId, { enabled: false });
```

Disablement does not terminate every dispatched request or revoke upstream credentials. Existing Sessions retain pinned configurations. Create new Sessions when you need a newly selected execution definition.

## Close dependencies before deletion

Inspect dependent Sessions, settle active Runs, close each, and confirm cleanup. Deletion with remaining dependencies returns `connection_in_use`. Reconcile unknown deletions rather than removing database records to hide dependencies.

Then use `delete_connection` / `deleteConnection`. This deletes the Hexagon connection, not the upstream account or its API key. Upstream revocation requires the corresponding Provider management action.

## Verify

On a dedicated test connection, demonstrate successful work, disablement, rejection of new work, continued ability to clean up old resources, and deletion after dependencies clear. Test invalid replacement credentials remaining disabled and valid credentials enabling only after verification. Check that old initialization snapshots remain unchanged.

Sources: [connection implementation](../../../../modules/connections/connections.ts), [execution boundaries](../../../architecture.md). Next: [Recovery](recovery.md).
