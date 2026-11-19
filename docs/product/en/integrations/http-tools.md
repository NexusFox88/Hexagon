# Connect a protected HTTP API

Hexagon exposes two distinct paths: named HTTP Tools discovered/called by a Harness, and protected HTTP connections called by Sandbox code through delegated access. Select by invocation model; their approval and call-record semantics are different.

| Path | Connection | Session binding | Control |
| --- | --- | --- | --- |
| Agent HTTP Tool | kind=tool, provider=http-json | tools | Fixed named operations through ToolBroker, authorization, optional approval |
| Protected HTTP | kind=http, provider=http | connections | Guest uses delegated URL; exact method/path policy, no automatic Tool approval |

## Define fixed read/write operations

Prepare a controlled test service: a Bearer-authenticated verification path, a read endpoint returning a known report, and a write endpoint storing reference/text that can be independently looked up by reference. Return JSON. Save this template as http-tool.json, **replace the base_url placeholder and implement the endpoints first**. These are not built-in Hexagon services.

```json
{
  "base_url": "https://YOUR-TEST-SERVICE",
  "verify_path": "/auth/check",
  "operations": {
    "read_report": {
      "path": "/reports/read", "method": "GET",
      "description": "Read a test report by ID",
      "input_schema": {"type":"object","properties":{"id":{"type":"string"}},"required":["id"],"additionalProperties":false},
      "approval": false, "replay": "never"
    },
    "save_report": {
      "path": "/reports/save", "method": "POST",
      "description": "Save a test report with a reconciliation reference",
      "input_schema": {"type":"object","properties":{"reference":{"type":"string"},"text":{"type":"string"}},"required":["reference","text"],"additionalProperties":false},
      "approval": true, "replay": "never"
    }
  }
}
```

Operations fix path and GET/POST. GET puts arguments into query parameters, preserving strings and JSON-encoding other values. POST sends JSON arguments. Agent input cannot select arbitrary URLs, headers, methods, or path templates. input_schema must be a supported synchronous object JSON Schema; reject additional fields where appropriate. Paths exclude query, fragment, backslash, leading double slash, and `..` segments.

The adapter injects Bearer authorization and a stable call idempotency-key. Custom authentication-header mapping is not exposed here. Receiving that header does not prove upstream deduplication, so this example uses replay=never. Consider idempotency_key only after verifying real upstream deduplication. GET alone does not establish absence of side effects.

## Create, validate, enable, and bind

These local management examples read private credentials; see [self-hosting](../operate/self-host.md) for hosted initialization. Retain/reuse the returned ID.

```python
import json
import os
from pathlib import Path
from hexagon import Hexagon
client = Hexagon.local()
config = json.loads(Path("http-tool.json").read_text(encoding="utf-8"))
connection = client.create_connection(
    kind="tool", provider="http-json", name="Test reports",
    credential=os.environ["REPORT_SERVICE_KEY"], config=config,
)
checked = client.validate_connection(connection["id"])
if checked["status"] != "ready":
    raise RuntimeError("Inspect Tool connection diagnostics")
client.update_connection(connection["id"], enabled=True)
```

```typescript
import { readFile } from 'node:fs/promises';
import { Hexagon } from '@hexagon/agent-sdk';
const client = await Hexagon.local();
const credential = process.env.REPORT_SERVICE_KEY;
if (!credential) throw new Error('Set REPORT_SERVICE_KEY');
const config = JSON.parse(await readFile('http-tool.json', 'utf8'));
const connection = await client.createConnection({
  kind: 'tool', provider: 'http-json', name: 'Test reports', credential, config,
});
const checked = await client.validateConnection(connection.id);
if (checked.status !== 'ready') throw new Error('Inspect Tool connection diagnostics');
await client.updateConnection(connection.id, { enabled: true });
```

Validation requests the fixed verify_path, which must not mutate data. Success does not prove every business operation. Follow [Tool binding](../build/tools.md), placing the ID in `tools: {reports: connection_id}` with a Tools-capable Harness, then preflight/create the Session. Required Tools need authorization during initialization. optional_tools does not bypass authorization or approval.

First call read_report and verify actual content. Then request save_report and inspect reference/text before approving. approval=true controls invocation approval independently of existing connection credentials. Confirm rejection causes zero upstream writes, then test one authorized write to a dedicated record. See [approvals](../build/approvals.md).

## Responses and unknown outcomes

Requests time out after 20 seconds and reject redirects. 401/403 take the authentication-error path. Results must parse as JSON; response text exceeding 1048576 JavaScript code units fails. That check is not a byte-level download-limit guarantee.

A remote write can succeed before its response is lost or fails parsing. A task error does not establish no side effect. Call records retain request hash and dispatched policy. Reconcile unknown outcomes instead of generating a new reference and repeating the business action.

Inspect tool_calls / toolCalls, verify the original reference remotely, then use resolve_tool_call / resolveToolCall with completed/failed and evidence. Resolution does not send another remote request. Leave genuinely unknown outcomes waiting or cancel; do not invent success. Later connection edits cannot change the original call's replay qualification. See [reconciliation](../operate/reconciliation.md).

## Direct guest HTTP access

Use kind=http/provider=http with endpoint, authentication, and access.rules, for example:

```json
{"endpoint":"https://YOUR-TEST-SERVICE","authentication":{"type":"header","name":"X-Service-Key"},"access":{"rules":[{"methods":["GET"],"path":"/reports/read"}]}}
```

This path supports bearer or a named header injected by the trusted backend. Upstreams must be public HTTPS; rules match exact paths/methods. Bind via connections; guest code reads base_url and delegated headers from HEXAGON_CONNECTIONS. Generic HTTP validation checks structure/header safety, not remote authentication. This channel has no automatic ToolBroker approval or per-Tool reconciliation state. Use Agent Tools when a write requires that approval flow.

Original keys do not enter new Harness invocations. Delegated tokens still convey authority: never log them or include them in model context/artifacts. Delegation does not grant the entire upstream API. See [credential boundaries](../concepts/security-boundaries.md) and the [Secret contract](../../../secret-management.md).

This page was reviewed against both adapters and execution contracts without fresh test-service execution. Acceptance must independently prove read content, zero preapproval writes, one approved write, no duplicate after lost response, absence of raw keys in guests, both SDKs, and cleanup. Examples are not evidence those checks passed.

Sources: [HTTP Tool](../../../../integrations/tools/http-json.ts), [protected HTTP policy](../../../../modules/access/policy.ts), [Tool reconciliation](../../../tool-reconciliation.md).
