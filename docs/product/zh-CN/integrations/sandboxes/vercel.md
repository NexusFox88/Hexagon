# 接入 Vercel Sandbox

本页使用 Vercel 的持久 Sandbox 执行 Hexagon Harness，不涉及将应用发布成 Vercel 网站。Session 管理任务和工作区；平台私有预览不等于公开部署。

## 凭据与项目绑定

准备有目标 team/project 访问和 Sandbox 操作权限的 Vercel Token。连接 config 必须同时提供真实 project_id 与 team_id，不能使用项目显示名或浏览器当前团队代替。

| 字段 | 约束 |
| --- | --- |
| project_id | `prj_` 后接字母或数字 |
| team_id | `team_` 后接字母或数字 |
| vcpus | 默认 2；允许 1 或 2—32 内的偶数整数 |

字段名是 vcpus；schema 不接受自行添加 image、memory_mb 等字段。Token 留在控制平面，不能作为普通 Agent env 注入。下面是本地管理客户端示例，hosted 初始化见[自托管](../../operate/self-host.md)。重复运行会创建新连接，应保存 ID 后复用。

```python
import os
from hexagon import Hexagon
client = Hexagon.local()
connection = client.create_connection(
    kind="sandbox", provider="vercel", name="Vercel workspace",
    credential=os.environ["VERCEL_TOKEN"],
    config={"project_id": os.environ["VERCEL_PROJECT_ID"],
            "team_id": os.environ["VERCEL_TEAM_ID"], "vcpus": 2},
)
checked = client.validate_connection(connection["id"])
if checked["status"] != "ready":
    raise RuntimeError("Inspect Vercel connection diagnostics")
client.update_connection(connection["id"], enabled=True)
```

```typescript
import { Hexagon } from '@hexagon/agent-sdk';
const client = await Hexagon.local();
const credential = process.env.VERCEL_TOKEN;
const projectId = process.env.VERCEL_PROJECT_ID;
const teamId = process.env.VERCEL_TEAM_ID;
if (!credential || !projectId || !teamId) throw new Error('Set Vercel account configuration');
const connection = await client.createConnection({
  kind: 'sandbox', provider: 'vercel', name: 'Vercel workspace', credential,
  config: { project_id: projectId, team_id: teamId, vcpus: 2 },
});
const checked = await client.validateConnection(connection.id);
if (checked.status !== 'ready') throw new Error('Inspect Vercel connection diagnostics');
await client.updateConnection(connection.id, { enabled: true });
```

验证只列举指定 team/project 的 Sandbox，不证明完整任务或恢复成功。验证 ready 后单独启用。更改 Token、项目或资源配置后重新验证与启用，已有 Session 保留固定配置。

## 执行和私有预览

将 connection.id 用于[首个 Session](../../start/first-session.md)的 sandbox_connection_id，选择兼容 Harness 与模型。分别以 Python / TypeScript 完成任务、实际产物检查和关闭。连接器创建 persistent=true 的 Sandbox，不暴露公开 ports；如果资源不是持久类型或存在公共 routes，会拒绝不符合预期的资源。

预览经鉴权命令通道访问内部端口，由[Hexagon 预览授权](../../build/private-preview.md)控制。浏览器不持有 Vercel Token；不要为了访问任务中的开发服务器额外创建公开路由。服务监听、命令通道、Runtime 健康与用户授权需要分别诊断。

## 网络和原生凭据注入

当前能力包括 native_credential_auth：连接器为控制平面的受限访问地址配置网络层凭据注入，按路径添加委托 Token；原始模型和 Tool 账户密钥仍在控制平面。访问代理继续检查请求方法、路径、Run 状态、版本与撤销，不因 Provider 注入就绕过平台授权。

这项内部机制不等于向应用开放 network_allowlist。当前连接器不声明普通 Sandbox allowlist 或 OCI，创建要求 unrestricted。需要出站域名限制的应用应选择支持该能力的 Provider，而不是给 Vercel 配置增加未支持字段。

## 空闲、停止与恢复

平台暂停调用持久 Sandbox stop，下一轮通过 resume 恢复，应用只需向原 Session submit。文件系统和受管理对话数据保留，Runtime 重新准备；任意进程、内存和网络连接没有连续性保证，预览服务可能需要重新启动。

只读检查使用 resume=false，不应为了查看状态唤醒资源。持久 Sandbox 的 stopped 映射为 paused，**不是已删除**。活动 Run，包括等待授权或审批的 Run，不是可随意暂停的空闲工作区。

按[空闲与唤醒](../../build/idle-and-wake.md)单独验证两轮、文件和对话。至少一轮在空闲前写入已知内容，下一轮读取并核对；记录精确 Harness、模型协议和两个 SDK 的结果。单轮完成不能证明恢复正确。

## 关闭与未知结果

关闭调用删除并请求 deleteOrphanSnapshots，之后再次查询确认资源不存在。删除请求被接受、stopped 或平台本地进程退出都不代表清理完成。控制平面负责持久期限，停止运行会影响它负责的及时清理。

创建使用由原 operation ID 派生的精确名字。对账先按 namePrefix 列举并按完整名字过滤，不能把其他同前缀资源绑定到本 Session。网络或鉴权失败不等于不存在；只有明确 404 按不存在处理。恢复或删除未知时保留原资源记录，见[对账指南](../../operate/reconciliation.md)。

| 症状 | 排查 |
| --- | --- |
| 验证失败 | Token、team_id/project_id 配对、实际访问权限 |
| 创建失败 | 账户额度、vcpus、资源策略不匹配 |
| vercel_sandbox_not_running | 是否处于暂停；由正常 Session 唤醒流程恢复 |
| vercel_unexpected_public_route | 资源是否被外部改为含公开路由，不绕过检查 |
| 恢复后预览失败 | 文件保留与服务运行分开检查 |
| vercel_deletion_unconfirmed | 保留原名字，重新核查删除与快照清理 |

本页核对连接器配置、私有访问与生命周期，未重新运行实云任务。历史组合见[执行矩阵](../../../../../testing/execution-matrix.md)，当前恢复分支按[Harness serverless 记录](../../../../../testing/evidence/2026-11-19-harness-serverless-matrix.json)的精确范围解读。

依据：[Vercel 连接器](../../../../../integrations/sandboxes/vercel.ts)、[私有传输](../../../../../integrations/sandboxes/vercel-transport.ts)。下一步：[Sandbox 总览](../sandboxes.md)、[凭据边界](../../concepts/security-boundaries.md)。
