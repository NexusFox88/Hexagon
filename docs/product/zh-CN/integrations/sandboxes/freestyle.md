# 接入 Freestyle VMs

当前连接器通过 Freestyle VM 接口提供文件、命令、私有预览和 pause/start。它使用固定的 `freestyle@0.2.23` SDK；旧版本示例的接口不应直接套用。当前未声明 OCI Harness 或网络 allowlist。

## 连接配置

准备有 VM 管理权限的 API key。config 只有 snapshot，允许 `freestyle/ubuntu-sm`（默认）或 `freestyle/ubuntu`。这是 Provider 预置快照选择，不是任意 OCI 镜像引用。CPU、内存没有独立配置字段，实际 VM 资源从 Provider 返回信息核对。

以下本地管理客户端示例从私有环境读取 key，hosted 初始化见[自托管](../../operate/self-host.md)。凭据留在控制平面，不写进任务项目。示例每次创建连接，保存 ID 后复用。

```python
import os
from hexagon import Hexagon
client = Hexagon.local()
connection = client.create_connection(
    kind="sandbox", provider="freestyle", name="Freestyle workspace",
    credential=os.environ["FREESTYLE_API_KEY"],
    config={"snapshot": "freestyle/ubuntu-sm"},
)
checked = client.validate_connection(connection["id"])
if checked["status"] != "ready":
    raise RuntimeError("Inspect Freestyle connection diagnostics")
client.update_connection(connection["id"], enabled=True)
```

```typescript
import { Hexagon } from '@hexagon/agent-sdk';
const client = await Hexagon.local();
const credential = process.env.FREESTYLE_API_KEY;
if (!credential) throw new Error('Set FREESTYLE_API_KEY');
const connection = await client.createConnection({
  kind: 'sandbox', provider: 'freestyle', name: 'Freestyle workspace', credential,
  config: { snapshot: 'freestyle/ubuntu-sm' },
});
const checked = await client.validateConnection(connection.id);
if (checked.status !== 'ready') throw new Error('Inspect Freestyle connection diagnostics');
await client.updateConnection(connection.id, { enabled: true });
```

验证只列举 VM；ready 不证明有创建配额或完整执行权限。明确启用后使用 connection.id 创建 Session。更换 snapshot 或凭据后重新验证和启用，已有 Session 保留固定配置。

## 实际执行与文件权限

按[首个 Session](../../start/first-session.md)分别运行 Python 和 TypeScript 旅程。除检查产物外，加入“上传文件后由 Harness 实际读取”的验证，不能以文件 API 返回成功作为整个流程完成。

文件 API 写入的是 root 所属、0600 权限的文件。当前连接器明确以 guest root 执行前台及后台命令，避免 Provider 默认 uid 与文件权限不一致。任务中另起的非 root 进程未必能读这些文件；确需其他用户时，为所需文件显式设置最小权限，不能把所有工作区文件改为公开可读。

guest root 不等于拥有控制平面账户凭据，也不是同一 Sandbox 内不可信进程之间的隔离保证。原始 Provider 凭据不注入来宾。前后台命令均带远程期限，默认 60 秒，允许 1—3600 秒；后台返回 pid 后还需确认 Runtime 或服务健康。

## 私有预览与传输

[私有预览](../../build/private-preview.md)通过原始 PTY 字节传输 HTTP，不创建公共域名或 ingress。用户浏览器通过 Hexagon 授权访问，Provider key 保留在控制平面。

当前 relay 具有 45 秒远程执行期限、8 MiB 待消费输出缓冲上限和 16 MiB 累计输入上限。8 MiB 不是总响应大小上限；16 MiB 包含协议字节，不等于纯上传文件大小。长请求、慢消费者或大型传输需要按真实负载验证，不能承诺无限长预览流。连接中断必须作为失败处理，不使用部分字节冒充完整文件。

预览失败先检查 VM running、应用监听、PTY 建立、Runtime 健康与用户授权。不要用公开端口或把 key 交给浏览器来绕过故障。

## 空闲暂停与活动期限

平台使用原生 pause/start，当前策略目标是保留内存与文件系统。该声明不证明所有 Harness、网络连接或用户服务在任意停顿后都可直接使用；下一轮仍需健康检查与精确组合验收。对同一 Session submit 触发平台唤醒，不需要应用自行调用 Provider start。

创建关闭 Provider 的 TTL、自动删除、idle timeout 与 automaticRestart，由控制平面管理活动期限和空闲策略。控制平面停机会影响及时暂停与清理；暂停不是删除，也不能推断为零费用。

按[空闲与唤醒](../../build/idle-and-wake.md)检查第一轮写入、第二轮读取、对话继续、必要的预览，以及最终关闭。不要由内存保留策略推断没有恢复故障。

## 资源归属和清理

创建 slug 由持久 operation ID 派生。对账同时匹配 slug 和 metadata.hexagon_operation；不重新分配已有 slug 来覆盖不确定结果。网络或鉴权错误不是资源不存在。

关闭调用 VM delete 并再次 inspect。只有明确不存在才确认删除，仍可查询时返回 freestyle_deletion_unconfirmed。保留原资源标识并[对账](../../operate/reconciliation.md)，不要用新 Session 替换未知旧资源。

| 症状 | 排查方向 |
| --- | --- |
| 验证或创建失败 | API key、快照、账户权限与额度 |
| 上传成功但任务无法读文件 | 实际进程用户、文件所有者与 0600 权限 |
| freestyle_sandbox_not_running | VM 状态与正常 Session 唤醒流程 |
| freestyle_command_completion_unknown | 原命令状态，避免重复副作用 |
| freestyle_tunnel_disconnected | PTY、期限、消费速度、服务与连接状态 |
| freestyle_deletion_unconfirmed | 原 VM 删除状态 |

本页核对当前 SDK 依赖、连接器和传输实现，未新运行云任务。历史任务范围见[执行矩阵](../../../../../testing/execution-matrix.md)，恢复证据见[serverless 矩阵](../../../../../testing/evidence/2026-11-19-harness-serverless-matrix.json)。

依据：[连接器](../../../../../integrations/sandboxes/freestyle.ts)、[传输](../../../../../integrations/sandboxes/freestyle-transport.ts)。下一步：[项目文件](../../build/project-context.md)、[Sandbox 总览](../sandboxes.md)。
