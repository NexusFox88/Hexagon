# 连接受保护的 HTTP API

Hexagon 有两个不同入口：让 Harness 发现并调用命名操作的 HTTP Tool，以及让 Sandbox 代码通过委托访问地址请求 API 的受保护 HTTP 连接。先按调用方式选择，不能把两者的审批和调用记录混为一谈。

| 入口 | Connection | Session 绑定 | 调用与控制 |
| --- | --- | --- | --- |
| Agent HTTP Tool | kind=tool，provider=http-json | tools | 固定命名操作，经 ToolBroker、授权和可选审批 |
| 受保护 HTTP | kind=http，provider=http | connections | guest 使用委托地址；精确路径/方法策略，不自动经过 Tool 审批 |

## 定义固定的读写操作

准备一个你控制的测试服务：验证路径接受 Bearer key；读接口返回已知测试报告；写接口保存 reference 和 text，并能按 reference 查证实际写入。返回值必须是 JSON。下面是配置模板，保存为 http-tool.json，**先替换占位 base_url 并实现相应接口**；这些路径不是 Hexagon 自带服务。

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

每个操作固定 path 和 GET/POST。GET 参数进入 query，字符串原样传递，其他值 JSON 编码；POST 参数作为 JSON body。不能由 Agent 参数指定任意 URL、header、HTTP 方法或路径模板。input_schema 必须是受支持的同步 object JSON Schema，建议禁止额外字段。路径不接受 query、fragment、反斜杠、双斜杠开头或 `..` 段。

adapter 注入 `Authorization: Bearer` 和稳定调用 idempotency-key，不提供自定义 header 映射。服务收到该 header 不代表它真的实现了去重，示例因此保留 replay=never；只有上游确实以该键去重并验证契约后才考虑 idempotency_key 策略。即便 GET 也不应仅凭方法名认定没有副作用。

## 创建、验证、启用与绑定

以下示例使用本地管理客户端，凭据由私有环境提供；hosted 初始化见[自托管](../operate/self-host.md)。保存返回 ID 后复用。

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

验证会请求固定 verify_path，不能让验证路径执行写入。验证成功不证明每个业务操作都可调用。随后按 [Tools 绑定](../build/tools.md)把连接 ID 放到 `tools: {reports: connection_id}`，选择支持 Tools 的 Harness，完成 Session 预检与创建。默认必需 Tool 在初始化时要求授权；optional_tools 不会绕过授权或审批。

让第一轮只调用 read_report 并核对真实报告内容；第二轮调用 save_report，审批界面检查 reference 与 text 后才允许写入。approval=true 控制调用审批，与连接是否已有凭据是两个状态。验证拒绝时上游没有写入，再用授权的专用测试记录检查批准后只有一次写入。参见[审批](../build/approvals.md)。

## 响应、错误和未知结果

当前单次请求超时 20 秒，不跟随重定向；401/403 进入鉴权错误路径。结果必须可解析为 JSON，响应文本超过 1048576 个 JavaScript 字符单元会失败。这是当前实现检查，不是字节级下载上限承诺。

调用可能已在远端写入，但响应丢失或解析失败。因此任务报错不证明没有副作用。Tool 调用记录保存请求 hash 和实际执行策略，未知结果进入对账；不要给相同业务操作生成新 reference 再试一次。

用 tool_calls / toolCalls 查看原调用，在远端按 reference 核对后用 resolve_tool_call / resolveToolCall 记录 completed 或 failed 和证据。解析结论不会再发送远端请求；仍未知时保留等待或取消 Run，不能编造成功。连接后续修改不能改变原调用的重放资格。完整流程见[对账](../operate/reconciliation.md)。

## 如果需要 guest 直接调用 API

使用 kind=http/provider=http，config 包含 endpoint、authentication 和 access.rules。例如：

```json
{"endpoint":"https://YOUR-TEST-SERVICE","authentication":{"type":"header","name":"X-Service-Key"},"access":{"rules":[{"methods":["GET"],"path":"/reports/read"}]}}
```

这个入口支持 bearer 或指定 header，可信后端注入原始凭据；要求公共 HTTPS 上游，规则是精确路径与方法。Session 通过 connections 绑定，guest 从 HEXAGON_CONNECTIONS 读取 base_url 与委托 headers。通用 HTTP 验证只检查结构和 header 安全，不远程认证。该通道没有 ToolBroker 的自动审批或逐 Tool 对账状态，需要写审批的操作应使用前面的 Agent Tool 入口。

原始 key 不进入新 Harness 调用；委托 token 仍然有权限，不能打印、放入模型上下文或产物。不要把委托保护理解成可任意调用上游全部 API。见[凭据边界](../concepts/security-boundaries.md)和[Secret 契约](../../../secret-management.md)。

本页核对了两类 adapter 和执行契约，没有新执行测试服务。完整验收应分别证明读结果、批准前零写入、批准后一次写入、丢失响应不重复写入、guest 不含原始 key、双 SDK 与资源清理，不能由文档示例推断这些测试已通过。

依据：[HTTP Tool](../../../../integrations/tools/http-json.ts)、[受保护 HTTP 策略](../../../../modules/access/policy.ts)、[Tool 对账契约](../../../tool-reconciliation.md)。
