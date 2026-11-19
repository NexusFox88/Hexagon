# 接入 Agent37

Agent37 连接器使用云实例执行 Harness，支持文件、命令、私有预览和文件系统级 stop/start 恢复。当前不声明 OCI 镜像或网络 allowlist；如果任务依赖这两项，先看 [Sandbox 能力总览](../sandboxes.md)。

## 配置与资源规格

准备目标账户的 API key，连接 config 只有 region，接受 us / eu，默认 us。当前连接器固定使用 agent37-base 模板，并向 Provider 请求 `{cpu: 2, memory: 4, disk: 4}`，不允许通过 config 覆盖这些字段。实际资源与账户配额仍需在创建后核对，不能把固定请求写成任意规格可选。

创建禁用 Provider auto_sleep，公开端口列表为空；空闲与到期由 Hexagon 生命周期管理。提交的 budget 字段不是免费使用保证，不应由它推断账单或账户限制。

以下管理客户端示例使用本地工作区，hosted 初始化见[自托管](../../operate/self-host.md)。API key 来自私有环境，不进入 Agent env。示例会创建新连接，应保存返回 ID 后复用。

```python
import os
from hexagon import Hexagon
client = Hexagon.local()
connection = client.create_connection(
    kind="sandbox", provider="agent37", name="Agent37 workspace",
    credential=os.environ["AGENT37_API_KEY"], config={"region": "us"},
)
checked = client.validate_connection(connection["id"])
if checked["status"] != "ready":
    raise RuntimeError("Inspect Agent37 connection diagnostics")
client.update_connection(connection["id"], enabled=True)
```

```typescript
import { Hexagon } from '@hexagon/agent-sdk';
const client = await Hexagon.local();
const credential = process.env.AGENT37_API_KEY;
if (!credential) throw new Error('Set AGENT37_API_KEY');
const connection = await client.createConnection({
  kind: 'sandbox', provider: 'agent37', name: 'Agent37 workspace',
  credential, config: { region: 'us' },
});
const checked = await client.validateConnection(connection.id);
if (checked.status !== 'ready') throw new Error('Inspect Agent37 connection diagnostics');
await client.updateConnection(connection.id, { enabled: true });
```

验证执行 list_instances，不能证明实际分配、执行或清理权限全部可用。验证 ready 后明确启用。更改 region 或凭据会要求重新验证、启用，已有 Session 保留固定配置。

## 首次任务与文件

用返回的 connection.id 作为[首个 Session](../../start/first-session.md)的 sandbox_connection_id，选择兼容 Harness 和模型，分别用 Python / TypeScript 完成任务、产物检查和关闭。

文件传输由连接器分块完成。当前读取实现最多接受 64 MiB 单文件，每块读取后检查长度；这不是所有产品上传或产物接口统一的大小承诺。上层接口可能有更小限制。命令输出被 Provider 标记 truncated 时会失败，不把截断文本作为完整成功结果。大交付物应写入产物文件，并在限制内检查下载字节完整性。

## 私有预览与健康检查

通过[私有预览](../../build/private-preview.md)访问用户服务。控制平面在 Provider 入口使用 X-Agent37-Key，供应商边缘层剥离账户头后转发到 guest；浏览器不应收到该 key。这个头移除行为有历史实测记录，不能仅凭 URL 看起来私有就推断安全。

Provider 可能保留 `/health` 路由，不能用它代替 Hexagon Runtime 自身的健康检查。区分“Provider 入口可访问”“Runtime 已启动”“应用端口可用”和“用户已获得预览授权”。实例状态必须 running 才能执行或建立预览。

## stop/start 与持久目录

受管理根目录为 `/home/node/.hexagon`。工作区、Harness 缓存和对话恢复数据在持久 home 中安排；`/tmp` 在 stop/start 后会清空。把需跨轮保留的文件放在任务工作区，不要把 `/tmp/result.json` 当持久状态存储。

空闲停止后，下一次向原 Session submit 会触发 start 和 Runtime 恢复。文件保留不保证进程、内存或网络连接继续，开发服务器可能需要重启。Provider stopped 映射为 paused，不代表资源删除。等待授权或审批的 Run 仍然活动，不能视为空闲工作区。

验证恢复时在第一轮写入工作区文件并记录对话测试值，第二轮核对文件内容、实际工具输出和先前对话；需要预览时复核服务。可以将临时目录的测试文件作为反例，但不要依赖它继续存在。双 SDK 分别验证，参见[空闲与唤醒](../../build/idle-and-wake.md)。

## 关闭与故障处理

期限由控制平面持久管理；停掉本地服务不会自动证明云实例已清理。close 删除实例并轮询直到确认不存在。仅 stop、暂停状态或删除请求受理都不够。恢复或删除响应不确定时，保留原资源与 operation 记录。

创建对账要求精确名字和 metadata.hexagon_operation 同时匹配，不能随意绑定相似名称的实例。只有 Provider 404 被视为不存在，网络与鉴权错误不作这种推断。

| 症状 | 检查 |
| --- | --- |
| agent37_http_401 / 403 | key 与账户权限 |
| 创建失败 | region、账户额度、固定规格是否可分配 |
| agent37_sandbox_not_running | 原实例状态与正常 Session 唤醒流程 |
| agent37_command_output_truncated | 使用文件交付并检查大小，不接受截断输出 |
| agent37_file_size_unsupported | 当前读取上限与上层接口限制 |
| agent37_background_start_unknown | 原进程、Runtime 和端口，避免重复启动 |
| agent37_deletion_unconfirmed | 原实例删除状态，继续对账 |

本页基于当前实现，未新增云测试。历史 [Agent37 证据](../../../../../testing/evidence/2026-11-15-agent37.md)与[serverless 矩阵](../../../../../testing/evidence/2026-11-19-harness-serverless-matrix.json)分别说明原始旅程和恢复范围，不能由单轮成功外推所有 Harness 的恢复。

依据：[连接器](../../../../../integrations/sandboxes/agent37.ts)、[生命周期策略](../../../../serverless-sessions.md)。下一步：[持久化边界](../../concepts/persistence.md)、[清理对账](../../operate/reconciliation.md)。
