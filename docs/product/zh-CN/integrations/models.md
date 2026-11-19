# 连接你自己的模型端点

模型连接包含协议类型、base URL、准确模型 ID 和凭据。模型品牌名称不能代替 wire protocol；同一供应商可能提供多个协议入口。

需要管理身份，以及你获准使用的端点和模型。Console Infrastructure → LLM 可以完成同样的配置、验证与启用。以下代码使用环境占位输入，实际地址按供应商接口填写。

## 创建 Chat Completions 连接

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

base URL 可包含末尾 `/v1`，不要附加 `/chat/completions`。Responses 不附加 `/responses`；Messages 按对应端点根地址配置。协议 provider 值见[协议表](model-protocols.md)。

## 验证后的使用

把返回连接 ID 作为 Session 的 model_connection_id，选择兼容 Harness。验证会发送有界模型请求，可能消耗模型额度；它不等于完整 Agent Tools / 多轮验收。

模型原始 key 留在控制平面。运行时使用受保护通道，向 guest 提供限定授权或原生占位，而不是复制账户 key 到普通 env。不要为了修复网络失败把原 key 填入 Agent prompt。

## 失败定位

先检查精确 base URL、协议、模型 ID、账户权限与余额，再区分控制平面到上游网络和 Sandbox 到凭据入口。`model_response_invalid` 表示返回形状不符合该验证器预期；不能仅凭 200 判定兼容。配置或凭据更新后重新验证、启用，并考虑新 Session 的固定配置。

完成接入需真实 Run 产生预期回答，按需要执行 Tool、连续第二轮和流式结果，最后清理。参考[历史模型记录](../../../../testing/execution-matrix.md)选择已验证试验组合，但保留新测试独立证据。

依据：[模型适配器](../../../../integrations/models/openai-compatible.ts)、[Responses](../../../../integrations/models/openai-responses.ts)。下一步：[首个 Session](../start/first-session.md)。
