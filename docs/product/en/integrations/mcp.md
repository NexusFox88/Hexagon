# Connect a Remote MCP service

Remote MCP connects service discovery/calls to Hexagon ToolBroker. Streamable HTTP (default) and legacy SSE use the official MCP SDK for initialization, paginated tools/list, and tools/call. You do not need to turn the server into an HTTP JSON Tool.

## Scope and prerequisites

Prepare a reachable public HTTPS MCP endpoint, authorized account, and controlled acceptance tool. The endpoint excludes userinfo, query, and fragment; supply credentials separately. authentication accepts none, bearer, or header. Header mode uses header_name, defaulting to x-api-key. Explicitly select none for public services rather than inventing a Token.

This interface does not expose stdio, local process launch, resources/prompts subscriptions, sampling, or elicitation. It does not automatically register arbitrary OAuth clients or refresh Tokens. OAuth-only services need an externally obtained suitable Bearer Token and manual renewal. MCP support does not imply every extension.

## Discover, select, and enable

Prepare a tool returning known content in a controlled service and set MCP_TOOL_NAME to its exact name. These examples retain approval=true. Review discovered names, descriptions, and schemas before saving selection. External descriptions are data, not instructions to expand access.

The examples use local management clients with private configuration; see [self-hosting](../operate/self-host.md) for hosted initialization. Each execution creates a connection; save/reuse its ID.

```python
import os
from hexagon import Hexagon
client = Hexagon.local()
connection = client.create_connection(
    kind="tool", provider="mcp-remote", name="Controlled MCP service",
    credential=os.environ["MCP_TOKEN"],
    config={"endpoint": os.environ["MCP_ENDPOINT"],
            "transport": "streamable-http", "authentication": "bearer"},
)
connection = client.discover_mcp_tools(connection["id"])
selected = {key: tool for key, tool in connection["config"]["tools"].items()
            if tool["name"] == os.environ["MCP_TOOL_NAME"]}
if len(selected) != 1:
    raise RuntimeError("Expected exactly one selected tool")
client.update_connection(connection["id"],
    config={**connection["config"], "tools": selected})
if client.validate_connection(connection["id"])["status"] != "ready":
    raise RuntimeError("Inspect MCP verification diagnostics")
client.update_connection(connection["id"], enabled=True)
```

```typescript
import { Hexagon } from '@hexagon/agent-sdk';
const client = await Hexagon.local();
const { MCP_TOKEN: credential, MCP_ENDPOINT: endpoint, MCP_TOOL_NAME: name } = process.env;
if (!credential || !endpoint || !name) throw new Error('Set MCP configuration');
let connection = await client.createConnection({
  kind: 'tool', provider: 'mcp-remote', name: 'Controlled MCP service', credential,
  config: { endpoint, transport: 'streamable-http', authentication: 'bearer' },
});
connection = await client.discoverMcpTools(connection.id);
const selected = Object.fromEntries(Object.entries(connection.config.tools)
  .filter(([, tool]) => (tool as { name: string }).name === name));
if (Object.keys(selected).length !== 1) throw new Error('Expected one selected tool');
await client.updateConnection(connection.id, { config: { ...connection.config, tools: selected } });
if ((await client.validateConnection(connection.id)).status !== 'ready')
  throw new Error('Inspect MCP verification diagnostics');
await client.updateConnection(connection.id, { enabled: true });
```

Keep the discovered key rather than treating the remote name as an operation ID. Stable mcp_ hash keys retain original names; duplicate tools/collisions fail instead of silently overwriting. Give separate connections different Session binding aliases.

Discovery is bounded to 100 tools, 20 pages, and 2 MiB responses. Input schemas must be locally compilable synchronous object schemas. Validation rediscovers and compares selected tools; it does not execute business operations. Name, description, or schema changes produce mcp_schema_changed. Rediscover, review, validate, enable, then create a new Session. Existing Sessions do not silently gain operations.

## Invoke from a Session

Follow [Tools](../build/tools.md), binding connection.id as `tools: {research: connection_id}` with a Tools-capable Harness, then preflight. Required Tools are checked for authorization during initialization; optional Tools still require authorization when used.

Submit a precise task reading a dedicated test object through the selected tool and reporting its known content. With approval=true, inspect the pending approval and follow [approval handling](../build/approvals.md). Confirm rejection produces no actual remote call. Read-only annotations do not disable approval automatically; an administrator explicitly reviews that policy.

Inspect Tool call records and actual content, not only the final natural-language answer. Handle changed/expired credentials through [authorization](../build/tool-authorization.md). Original Tokens remain in the control plane, not Sandbox environment.

## Network and retry boundaries

Socket-time DNS checks reject private/mixed addresses. Redirects and cross-origin SSE POST targets are rejected. Fake-IP DNS may fail validation; do not disable checks for convenience. Operators can configure the existing trusted egress proxy/exact-host mechanism described in [networking](../operate/networking.md).

Definitions are checked before invocation. One connection retry is allowed before tools/call begins; after dispatch, a lost response is never automatically replayed, including read-only-annotated tools. All MCP operations have replay=never.

A remote write may complete before its response disappears. Retain the original call/hash, verify remotely, and record the conclusion through [reconciliation](../operate/reconciliation.md). Cancellation does not undo writes. Rediscovery does not resolve unknown side effects; do not issue a new call to test whether the old one succeeded.

## Evidence and protocol versions

The SDK negotiates protocol during initialization; configuration does not expose an arbitrary protocolVersion switch. Record SDK dependency version, negotiated server version, transport, tool/schema, and scenario. Do not claim every protocol version is verified.

The [2026-11-18 acceptance record](../../../../testing/evidence/2026-11-18-mcp-lark-responses.md) scopes public DeepWiki Streamable HTTP through both SDKs and real cloud Harnesses. Its legacy SSE endpoint returned 410 then; SSE compatibility was separately checked with a deterministic protocol server. Do not present these as equivalent public-service live passes. This page did not revisit that service or rerun cloud tasks.

Verify your service independently: discovery-to-call, insufficient permissions, expired Token, schema drift, zero calls on rejection, lost write-response reconciliation, and Session cleanup. Sharing a transport with a historically verified service is insufficient.

Sources: [MCP adapter](../../../../integrations/mcp/remote.ts), [original contract](../../../remote-mcp.md). Next: [Tool binding](../build/tools.md), [authorization](../build/tool-authorization.md), [approvals](../build/approvals.md).
