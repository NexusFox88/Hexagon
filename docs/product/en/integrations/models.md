# Connect your own model endpoint

A model connection specifies wire protocol, base URL, exact model ID, and credential. A vendor name is not a protocol; one vendor may expose multiple interfaces.

Use a management identity and an endpoint/model you are authorized to access. Console Infrastructure → LLM offers the same configure/verify/enable flow. The examples read deployment-specific values from private environment configuration.

## Configure Chat Completions

```python
import os
from hexagon import Hexagon
client = Hexagon.local()
model = client.create_connection(
    kind='model', provider='openai-compatible', name='Application model',
    credential=os.environ['MODEL_API_KEY'],
    config={'base_url': os.environ['MODEL_BASE_URL'], 'model': os.environ['MODEL_ID']},
)
checked = client.validate_connection(model['id'])
if checked['status'] != 'ready':
    raise RuntimeError('Model validation failed; inspect connection diagnostics')
client.update_connection(model['id'], enabled=True)
```

```typescript
import { Hexagon } from '@hexagon/agent-sdk';
const client = await Hexagon.local();
const key = process.env.MODEL_API_KEY;
const base = process.env.MODEL_BASE_URL;
const id = process.env.MODEL_ID;
if (!key || !base || !id) throw new Error('Set model configuration');
const model = await client.createConnection({
  kind: 'model', provider: 'openai-compatible', name: 'Application model',
  credential: key, config: { base_url: base, model: id },
});
const checked = await client.validateConnection(model.id);
if (checked.status !== 'ready') throw new Error('Inspect connection diagnostics');
await client.updateConnection(model.id, { enabled: true });
```

The base can end in /v1; do not append /chat/completions. Responses should not append /responses. Configure the appropriate root for Messages. See [protocol identifiers](model-protocols.md).

## Use and verify

Pass the connection ID as model_connection_id with a compatible Harness. Verification sends a bounded model request and can consume usage. It does not establish complete Agent Tool or continuation behavior.

Original keys remain in the control plane. Guests receive bounded grants or native placeholders through protected access, not account keys in ordinary environment. Do not repair networking by putting the original key into prompts.

Check URL, protocol, model ID, account permissions, and quota, then distinguish control-plane upstream access from Sandbox credential ingress. model_response_invalid means an unexpected validation response shape; HTTP 200 alone does not establish compatibility. Revalidate/re-enable after edits and account for pinned Session configuration.

Complete a real task, required Tools/continuation/streaming, and cleanup. Historical [model evidence](../../../../testing/execution-matrix.md) helps select a starting combination but does not replace fresh evidence.

Sources: [Chat Completions adapter](../../../../integrations/models/openai-compatible.ts), [Responses](../../../../integrations/models/openai-responses.ts). Next: [first Session](../start/first-session.md).
