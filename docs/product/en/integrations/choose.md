# Choose an execution combination

Start with task requirements, select Sandbox/Harness/model/Tools, preflight structural compatibility, then verify a real journey. Product names alone do not establish compatibility.

## Selection order

1. Identify required tools, continuation, files, previews, network restrictions, and idle recovery.
2. Select an exact registered Harness id/version and supported model protocol.
3. Configure and verify the actual endpoint/model.
4. Choose a Sandbox capable of that distribution: OCI, private images, and allowlists are separate requirements.
5. Bind authorized Tools with explicit readiness and approval policy.
6. Preflight, execute, inspect output, and confirm cleanup.

Both SDKs expose catalog(); await it in TypeScript. Catalog entries declare capabilities, not live account health or cloud acceptance.

## Starting points and alternatives

Historical dual-SDK journeys include E2B/Pi 1.5.2/SiliconFlow and E2B/OpenCode 1.2.27/SiliconFlow. Check [exact records](../../../../testing/execution-matrix.md) for endpoint, protocol, scope, and date. These support selecting a trial starting point, not skipping verification of your current account/model.

Native OCI execution uses Modal or Fly Machines. E2B also prepares public OCI images through a Session-owned Template; verify build, execution, and template cleanup separately. Check private-image support independently. Built-in OpenCode success does not prove OCI OpenCode compatibility on that Provider.

For allowlists, choose an explicitly capable adapter and allow credential ingress. For idle recovery, consult the [separate lifecycle matrix](../../../../testing/evidence/2026-11-19-harness-serverless-matrix.json); normal execution does not establish recovery.

| Rejection | Action |
| --- | --- |
| unsupported_harness | Select the exact registered version |
| incompatible_model | Match Harness and protocol; no implicit conversion |
| harness_tools_unsupported | Select a Tool-capable Harness |
| sandbox_oci_image_unsupported | Select OCI-capable Provider |
| sandbox_private_image_unsupported | Check private image capability and access |
| missing_capability | Compare required and declared capabilities |
| network_policy_unsupported | Preserve requirements and select an enforcing Provider |
| connection_not_ready / tool_not_ready | Verify and enable required connections |

For example, codex-v1 requires Responses; pairing it with Messages fails. Renaming a connection does not change its wire protocol.

Quota, endpoint behavior, network, and initialization can still fail after preflight. Retain request/resource identity and use [recovery](../build/recovery.md). Next: [model connections](models.md), [protocols](model-protocols.md). Source: [resolver](../../../../modules/execution/compatibility.ts).
