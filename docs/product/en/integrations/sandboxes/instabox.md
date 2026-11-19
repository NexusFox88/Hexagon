# Connect Instabox

Instabox supplies files, commands, private access, and native suspend/resume. OCI, network allowlists, and native Org Secret integration are not declared. Account validation, allocation, task execution, and cleanup are separate checks.

## Host and account prerequisites

The control-plane host needs working OpenSSH `ssh` and `ssh-keygen` with ed25519 generation. Connection validation checks these prerequisites. Management HTTPS and SSH ingress must be reachable. Being able to start Hexagon on an OS does not establish verified SSH transport there.

Prepare an API key with machine read/create/delete permissions. The only config field is template, defaulting to agent-browser. Explicit version availability depends on the account. Identifiers contain at most 128 characters, start with a lowercase letter/digit, and otherwise allow lowercase letters, digits, dot, @, underscore, and hyphen.

These examples use local management clients; see [self-hosting](../../operate/self-host.md) for hosted initialization. Retain and reuse the returned connection ID.

```python
import os
from hexagon import Hexagon
client = Hexagon.local()
connection = client.create_connection(
    kind="sandbox", provider="instabox", name="Instabox workspace",
    credential=os.environ["INSTABOX_API_KEY"], config={"template": "agent-browser"},
)
checked = client.validate_connection(connection["id"])
if checked["status"] != "ready":
    raise RuntimeError("Inspect Instabox connection diagnostics")
client.update_connection(connection["id"], enabled=True)
```

```typescript
import { Hexagon } from '@hexagon/agent-sdk';
const client = await Hexagon.local();
const credential = process.env.INSTABOX_API_KEY;
if (!credential) throw new Error('Set INSTABOX_API_KEY');
const connection = await client.createConnection({
  kind: 'sandbox', provider: 'instabox', name: 'Instabox workspace', credential,
  config: { template: 'agent-browser' },
});
const checked = await client.validateConnection(connection.id);
if (checked.status !== 'ready') throw new Error('Inspect Instabox connection diagnostics');
await client.updateConnection(connection.id, { enabled: true });
```

Validation checks OpenSSH and lists machines; it does not run a model. Enable explicitly after ready validation. Revalidate/enable after template or key changes; existing Sessions remain pinned. Creation explicitly selects no account Vault/Org Secrets. The API key stays in the control plane, while user-configured Agent environment remains guest-readable.

## Execution and private preview

Use connection.id in the [first Session](../../start/first-session.md) for independent dual-SDK task/artifact checks. Current creation accepts integer timeout_seconds from 60 through 86400. The control plane manages deadlines; creation requests no provider auto-deletion.

Foreground commands allow at most 600 seconds; background commands 3600. Truncated or invalid UTF-8 output fails rather than becoming a complete response. File writes verify byte count and SHA-256. Reads require valid Content-Length and at most 64 MiB, with potentially stricter higher-layer limits.

[Private preview](../../build/private-preview.md) uses short-lived SSH certificates and local private tunnels, validating target, machine identity, host trust, and expiry. Browsers receive neither account keys nor SSH private keys. Check service listener, Runtime health, and user authorization separately; SSH connectivity alone is insufficient.

## suspend/resume and cleanup

Idle uses native suspend, with automatic resume on the next submit to the same Session. The strategy preserves memory/filesystem, but exact Harness files, conversation, and service recovery still need independent verification.

Suspend/resume/create/delete have provider operations. Target machine, operation type, and success state must match. Paused is not deleted. Close must complete deletion and confirm machine absence. Control-plane downtime can delay its expiry work; stopping locally does not prove remote cleanup.

## Definitive refusal versus unknown creation

Only a synchronous create HTTP 429 with structured `error.code=quota_exceeded` and no operation ID is recognized as definitive non-allocation. The platform records rejected and reports sandbox_quota_exceeded. Release quota and close the refused Session before creating a new one. The refused Session is not automatically retried.

Generic 429s, rate limits, transport failures, and operation polling failures do not establish the same fact. Preserve the original operation after a lost response and reconcile exact names/metadata through paginated listing. **An empty list or operator acknowledgement does not prove allocation never happened.** Do not loop over new creates while the original outcome is unknown.

Repository history records intermittent Instabox management failures and unconfirmed creations. Historical successful journeys do not erase them. Current account state requires actual queries and original private records; the documentation does not claim no outstanding resources.

## Diagnose and verify

| Symptom | Check |
| --- | --- |
| Host preflight fails | OpenSSH, ssh-keygen, temporary-directory permissions |
| Validation fails | Key, account permissions, management connectivity |
| sandbox_quota_exceeded | Definitive refusal classification; release capacity and follow the flow above |
| instabox_operation_unconfirmed | Original operation; no duplicate remote create |
| instabox_command_output_incomplete | Original output and file artifacts; reject truncated results |
| Private access fails | Certificate target/trust/expiry, SSH connectivity, service port |
| instabox_deletion_unconfirmed | Original deletion operation and machine lookup |

For small quotas, serialize both SDK journeys without removing either. Completion includes real execution, file integrity, private access, two-turn recovery, confirmed deletion, and retained artifacts. This page is source-reviewed without new cloud execution. Consult the [execution matrix](../../../../../testing/execution-matrix.md) and [serverless ledger](../../../../../testing/evidence/2026-11-19-harness-serverless-matrix.json).

Sources: [connector](../../../../../integrations/sandboxes/instabox.ts), [SSH transport](../../../../../integrations/sandboxes/instabox-transport.ts). Next: [reconciliation](../../operate/reconciliation.md), [troubleshooting](../../operate/troubleshooting.md).
