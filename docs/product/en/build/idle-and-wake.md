# Let idle Sessions sleep and wake automatically

Between Runs, a Session can use an idle strategy and prepare execution automatically on the next submission. Keep the same Session ID; an explicit resume call is not required before each submit.

Select a compatible Sandbox/Harness lifecycle combination. A single successful turn does not establish recovery coverage. Check the exact combination and SDK in the [Harness serverless ledger](../../../../testing/evidence/2026-11-19-harness-serverless-matrix.json).

## Configure idle policy

```python
session = client.create_session(
    harness={'id': 'pi', 'version': '1.5.2'},
    sandbox_connection_id=sandbox_connection_id,
    model_connection_id=model_connection_id,
    resources={'idle_timeout_seconds': 60},
)
```

```typescript
const session = await client.createSession({
  harness: { id: 'pi', version: '1.5.2' },
  sandbox_connection_id: sandboxConnectionId,
  model_connection_id: modelConnectionId,
  resources: { idle_timeout_seconds: 60 },
});
```

The current default is 60 seconds, minimum 15, with eligibility polled every five seconds. This is not an exact suspension-completion deadline. Provider-managed standby can happen earlier on its own schedule.

Authorization and approval waits are active Runs, not idle time between turns. Expose an action to resolve the wait rather than trying to pause it away.

## Preservation boundaries

| Strategy | Current Provider examples | Dependency boundary |
| --- | --- | --- |
| Memory pause | E2B, Freestyle, Instabox | Memory and files under the current strategy; verify the exact combination |
| Filesystem retention / Runtime restart | Vercel, Upstash, Boat, Agent37 | Managed workspace, not arbitrary temporary paths or processes |
| Snapshot and recreate | Modal | Stable Session identity, changing cloud resource ID |
| Suspend with cold-boot fallback | Fly Machines | Filesystem is authoritative; memory is not guaranteed |
| Provider-managed standby | Blaxel, Sprites | Platform waiting time does not prove billing state |

Agent37 clears `/tmp`. Temporary files, sockets, background services, and arbitrary memory are not portable persistence guarantees. Original managed model/Tool keys are not added to snapshots as ordinary guest configuration; user-supplied environment values retain their normal readability boundary.

## Continue and verify

In turn one, write a managed workspace file and supply a recognizable conversation fact. Observe the lifecycle transition, then submit turn two to the same Session with a new idempotency key. Check file contents and conversation recall independently.

If the resource ID changes, use the Session's current binding instead of a cached Provider ID. Waking is not permission to replay an invocation with an unknown outcome.

Sleep differs from terminal close. Closing ends the Session and removes cloud resources. Sleeping may still incur storage costs and remains subject to retention/account limits. Explicitly close and confirm cleanup when finished.

Source: [Serverless strategies and evidence](../../../serverless-sessions.md). Next: [Recovery](recovery.md).
