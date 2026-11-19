# Bind Tools and MCP services

Configure and authorize an external connection in the control plane, then bind it by name when creating a Session. Sandbox settings, model endpoints, protected HTTP access, and Agent Tools serve distinct purposes.

## Choose an integration

| Connection | Use when | Review |
| --- | --- | --- |
| Application connector | The target application has a supported operation | Account, selected operations, OAuth/Token, write approval |
| HTTP Tool | You need a fixed protected API request mapping | Input schema, mapping, authentication, side-effect policy |
| Remote MCP | The server exposes MCP discovery and calls | Transport, discovered schemas, selection, approvals |

Catalog presence describes implementation scope, not acceptance for every account or model combination. Consult [application connector evidence](../../../application-connectors.md).

## Configure a read operation

Add a connection in Console Tools, select its account and permitted operations, authorize, verify, and enable it. Begin with a read against a dedicated test document whose expected contents are known.

For MCP, discover and review tool names, descriptions, and schemas before selecting them. Tools default to approval-required, even if they advertise read-only behavior. External descriptions are data, not authority to grant access.

Supported transports are Streamable HTTP and legacy SSE. Generic stdio, resources/prompts subscriptions, sampling, and elicitation are not exposed. Arbitrary MCP OAuth browser registration and automatic refresh are also outside this interface. See [Remote MCP](../../../remote-mcp.md).

## Bind the connection

With initialized clients and verified IDs, select a Harness supporting Tools:

```python
session = client.create_session(
    harness={'id': 'pi', 'version': '1.5.2'},
    sandbox_connection_id=sandbox_connection_id,
    model_connection_id=model_connection_id,
    tools={'research': tool_connection_id},
)
```

```typescript
const session = await client.createSession({
  harness: { id: 'pi', version: '1.5.2' },
  sandbox_connection_id: sandboxConnectionId,
  model_connection_id: modelConnectionId,
  tools: { research: toolConnectionId },
});
```

Use `research` in task instructions to explain the bound capability. The connection ID identifies account configuration; the alias names its Session binding. Tools are required at initialization by default. Add the alias to `optional_tools: ['research']` only when missing authorization is acceptable. Optional status does not authorize access or bypass approval.

## Execute and maintain

Submit a task explicitly reading the test object. Inspect the Tool call record and returned content rather than relying on an assistant claim. Original protected credentials remain in the control plane.

MCP names, descriptions, and schemas are rechecked at invocation. Rediscover, review, and create a new Session after relevant changes; existing Sessions do not silently gain operations. Lost responses may become unknown outcomes and must not be blindly replayed.

Verify the real call, expected content, denied unselected operations, authorization/approval branches, and confirmed cleanup. Record live combination acceptance separately from this contract guide.

Next: [Authorization](tool-authorization.md) and [approvals](approvals.md).
