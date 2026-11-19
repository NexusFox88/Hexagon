# Configure Sandbox resources and network policy

Declare requirements before creating a Session, then preflight the combination. Structural compatibility does not prove that a live cloud network policy has been enforced.

## Supported resource fields

Session `resources` currently accepts `timeout_seconds` and `idle_timeout_seconds`, not arbitrary CPU/memory fields. Timeout is 60–3600 seconds, default 600; idle is 15–3600, default 60. Effective idle eligibility is capped at timeout minus ten seconds. Provider templates, sizes, and quotas belong to the relevant Sandbox connection schema.

Do not interpret timeout as identical wall-clock billing behavior across Providers. Persistent-resource deadlines and suspension strategies differ; see [lifecycle semantics](../../../serverless-sessions.md).

## Preflight an allowlist

`credential_host` / `credentialHost` must be the hostname of the current protected credential ingress URL, without scheme, port, or path. Replace the illustrative target domain with your authorized destination.

```python
definition = dict(
    harness={'id': 'pi', 'version': '1.5.2'},
    sandbox_connection_id=sandbox_connection_id,
    model_connection_id=model_connection_id,
    resources={'timeout_seconds': 600, 'idle_timeout_seconds': 60},
    network={'mode': 'allowlist', 'allowed_hosts': [credential_host, 'example.com']},
    required_capabilities=['network_allowlist'],
)
check = client.preflight_session(**definition)
if not check['ready']:
    raise RuntimeError('Preflight did not establish readiness')
session = client.create_session(**definition)
```

```typescript
const definition = {
  harness: { id: 'pi', version: '1.5.2' },
  sandbox_connection_id: sandboxConnectionId,
  model_connection_id: modelConnectionId,
  resources: { timeout_seconds: 600, idle_timeout_seconds: 60 },
  network: { mode: 'allowlist' as const, allowed_hosts: [credentialHost, 'example.com'] },
  required_capabilities: ['network_allowlist'],
};
const check = await client.preflightSession(definition);
if (!check.ready) throw new Error('Preflight did not establish readiness');
const session = await client.createSession(definition);
```

Unsupported Providers reject `network_policy_unsupported`. Missing credential ingress produces `credential_proxy_not_allowed_by_network_policy`. Do not silently fall back to unrestricted networking. Recheck policy if a temporary ingress hostname changes.

## Know which layer enforces what

Sandbox egress policy constrains the cloud environment. Tool operation selection constrains business actions. Protected model/HTTP bindings constrain control-plane proxy destinations. Tool requests can originate in the control plane, so Sandbox allowlists do not establish filtering of every Tool destination.

`required_capabilities` requests capabilities; it does not grant new ones to adapters. Preflight also checks Harness/model protocols, Tools, initialization, and OCI compatibility. The combination's `verification.status` is currently unverified: preflight is not a fresh cloud acceptance run.

## Verify live enforcement

From a supported dedicated Sandbox, probe an allowed destination and a disallowed destination. Confirm success and rejection respectively, plus working model credential access. Record real observations and exact Provider/Harness versions. Accepted JSON alone does not prove enforcement.

Distinguish invalid schema, unsupported capability, blocked ingress, quota, and transport faults. Retain resource identifiers and confirm cleanup. Sources: [request schema](../../../../modules/execution/sessions.ts), [compatibility resolver](../../../../modules/execution/compatibility.ts). Next: [Tools](tools.md), [recovery](recovery.md).
