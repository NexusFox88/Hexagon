# 接入 Instabox

Instabox 提供文件、命令、私有访问和原生 suspend/resume。当前不声明 OCI、网络 allowlist 或原生 Org Secret 集成。账户验证、真实创建、任务执行和最终清理是独立检查，不能由其中一项成功推断其他项。

## 主机与账户前提

控制平面需要可运行的 OpenSSH `ssh` 和 `ssh-keygen`，支持 ed25519 密钥生成；连接验证会检查这些条件。管理端 HTTPS 与 SSH 入口必须可达。某个平台能启动 Hexagon，不代表其 SSH 工具与私有传输已验证。

准备有 machine 读取、创建和删除权限的 API key。config 只有 template，默认 agent-browser；可用的明确模板版本取决于账户。标识最多 128 字符，以小写字母或数字开始，其余允许小写字母、数字、点、@、下划线和连字符。

以下使用本地管理客户端，hosted 初始化见[自托管](../../operate/self-host.md)。保存返回 ID 后复用，不重复创建连接。

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

验证检查 OpenSSH 并列举 machines，不运行模型。ready 后明确启用。更新模板或凭据后重新验证并启用；已有 Session 保持固定配置。创建明确不选择账户 Vault/Org Secrets，API key 留在控制平面；用户主动配置的 Agent env 仍可被 guest 读取。

## 执行与私有预览

使用 connection.id，按[首个 Session](../../start/first-session.md)完成双 SDK 的实际任务与产物。当前创建要求 timeout_seconds 为 60—86400 的整数；控制平面承担期限管理，创建不请求 Provider 自动删除。

前台命令最多 600 秒、后台最多 3600 秒。命令返回截断或无效 UTF-8 时失败，不能把部分输出当完整回答。文件写入核对字节数和 SHA-256；读取要求有效 Content-Length 且最多 64 MiB，上层 API 仍可能更严格。

[私有预览](../../build/private-preview.md)使用短期 SSH 证书与本机私有隧道，证书目标、机器标识、host trust 和过期时间均需匹配。浏览器不获取账户 key 或 SSH 私钥。应用服务监听、Runtime 健康与用户授权分别检查；SSH 可连接不等于任务服务可用。

## suspend/resume 与清理

空闲使用原生 suspend，下一轮向同一 Session submit 自动 resume。当前策略保留内存与文件系统，但仍需按具体 Harness 验证文件、对话及服务恢复；不能从单轮成功推断休眠成功。

suspend/resume/create/delete 均有 Provider operation。只有目标机器、操作类型和成功状态匹配才认为操作完成。paused 不是已删除；关闭须完成 delete 并确认 machine 不存在。控制平面停机会影响其负责的到期工作，本地停止不证明远程清理。

## 明确拒绝与未知创建

只有同步 create 返回 HTTP 429，且结构化 `error.code=quota_exceeded`、没有 operation ID 时，当前实现才把它识别为明确未分配。平台记录 rejected，Run 报 sandbox_quota_exceeded；释放额度并关闭被拒绝 Session 后，才创建新的 Session。原被拒绝 Session 不会自动重试。

普通 429、速率限制、传输错误、操作轮询失败不具有相同含义。创建响应丢失后保留原 operation，并通过精确名字和 metadata 分页查询。**空列表或人工确认“已查看”不证明从未创建**，不能在结果未知时循环创建新资源。

仓库记录过 Instabox 管理连接间歇失败和未确认创建；历史成功旅程不能覆盖这些问题。当前账户状态应以实际查询和原始私有记录为准，不能从文档推断已无遗留资源。

## 排查与验收

| 症状 | 检查 |
| --- | --- |
| 主机预检失败 | OpenSSH 版本、ssh-keygen、临时目录权限 |
| 验证失败 | key、账户权限、管理网络 |
| sandbox_quota_exceeded | 是否属于明确拒绝，释放容量后按上述流程处理 |
| instabox_operation_unconfirmed | 原 operation 状态，不重复远程创建 |
| instabox_command_output_incomplete | 原任务输出与文件产物，不接受截断结果 |
| 私有访问失败 | 证书目标、信任、有效期、SSH 网络、应用端口 |
| instabox_deletion_unconfirmed | 原删除操作与 machine 查询 |

额度较小时串行验证两套 SDK，不删减任何 SDK 的旅程。完成条件包括实际任务、文件完整性、私有访问、两轮恢复、删除确认与产物留存。本页核对实现，没有新运行云任务；参阅[执行矩阵](../../../../../testing/execution-matrix.md)与[serverless 证据](../../../../../testing/evidence/2026-11-19-harness-serverless-matrix.json)。

依据：[连接器](../../../../../integrations/sandboxes/instabox.ts)、[SSH 传输](../../../../../integrations/sandboxes/instabox-transport.ts)。下一步：[对账](../../operate/reconciliation.md)、[故障排查](../../operate/troubleshooting.md)。
