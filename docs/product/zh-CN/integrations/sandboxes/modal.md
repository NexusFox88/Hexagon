# 接入 Modal

当你需要云 Sandbox、OCI 镜像、域名出站限制或文件系统快照恢复时，可选择 Modal。应用继续使用相同 Session / Run API；底层镜像构建、资源创建和恢复由控制平面管理。

## 账户与配置

准备同一 Modal 工作区的 Token ID / Token Secret，账户需要列举、创建、执行、终止 Sandbox 以及相关镜像操作权限。验证只列举 Sandbox，不证明构建和分配权限全部可用。凭据作为 JSON 字符串提交并由控制平面保管，不放入 Agent 环境。

| 字段 | 默认值 | 条件 |
| --- | --- | --- |
| app | hexagon | 非空；执行时不存在会创建 App |
| image | python:3.12-slim | 内置 Harness 的基础镜像；安装步骤需要 apt-get |
| memory_mb | 2048 | 整数，至少 2048 MiB |
| cpu | 2 | 正数 |
| region | 不指定 | 可选；实际可用性由账户和 Provider 决定 |

不要为这张表以外的资源字段猜测配置。首次创建可能触发云端镜像构建。下面是本地管理客户端示例；hosted 初始化见[自托管](../../operate/self-host.md)。环境变量来自你的私有配置，重复运行会创建额外连接，保存 ID 后复用。

```python
import json
import os
from hexagon import Hexagon

client = Hexagon.local()
connection = client.create_connection(
    kind="sandbox", provider="modal", name="Modal workspace",
    credential=json.dumps({"token_id": os.environ["MODAL_TOKEN_ID"],
                           "token_secret": os.environ["MODAL_TOKEN_SECRET"]}),
    config={"app": "hexagon", "image": "python:3.12-slim",
            "memory_mb": 2048, "cpu": 2},
)
checked = client.validate_connection(connection["id"])
if checked["status"] != "ready":
    raise RuntimeError("Inspect Modal connection diagnostics")
client.update_connection(connection["id"], enabled=True)
```

```typescript
import { Hexagon } from '@hexagon/agent-sdk';

const client = await Hexagon.local();
const tokenId = process.env.MODAL_TOKEN_ID;
const tokenSecret = process.env.MODAL_TOKEN_SECRET;
if (!tokenId || !tokenSecret) throw new Error('Set both Modal credential values');
const connection = await client.createConnection({
  kind: 'sandbox', provider: 'modal', name: 'Modal workspace',
  credential: JSON.stringify({ token_id: tokenId, token_secret: tokenSecret }),
  config: { app: 'hexagon', image: 'python:3.12-slim', memory_mb: 2048, cpu: 2 },
});
const checked = await client.validateConnection(connection.id);
if (checked.status !== 'ready') throw new Error('Inspect Modal connection diagnostics');
await client.updateConnection(connection.id, { enabled: true });
```

配置或凭据变更需要重新验证、启用。Token 必须属于目标账户与工作区；浏览器当前登录身份不会改变已保存 Token 的归属。

## 运行内置 Harness 或 OCI Harness

内置路线使用 connection.image 构建环境并增加 Node/npm、curl、git 和 CA。以返回的 connection ID 配合模型连接，按[首个 Session](../../start/first-session.md)执行固定小任务，检查实际回答、文件产物与关闭结果。

OCI 路线通过[镜像注册](../harnesses/oci.md)选择固定 digest，Session 使用注册镜像而非 connection.image。可作为历史起点的一条路线是：

- 镜像：`docker.io/nousresearch/hermes-agent@sha256:2fd023efbb8d3d2b0ce1a73d028b07370cff34f567cfe0e999553e8c327ea283`。
- protocol：`hermes-v1`；command：`["/opt/hermes/.venv/bin/hermes"]`。
- 历史组合：Modal、openai-compatible、`deepseek-ai/DeepSeek-V4-Flash`，Python 和 TypeScript 分别验证继续会话、远程 Tool、环境、产物和清理。
- 记录日期：2026-11-18，见[Harness 交付证据](../../../../../testing/evidence/2026-11-18-harness-delivery.md)。这不是所有模型端点或后续版本的保证，也不是本轮新执行结果。

私有镜像使用注册时关联的 registry Secret，包含 username/password。镜像拉取凭据与 Modal Token 是不同用途，不能相互替代。

OCI 准备阶段以 root 安装 Python、Node、Bash 等 Runtime 依赖，支持 Alpine / Debian 系包管理器，并清空 Entrypoint / Cmd；Runtime 另行启动注册命令。当前代码将镜像记录的 USER 写回派生镜像，但仓库既有运行说明指出 Modal 实际执行为 root。**不能将 USER 声明作为已验证的权限隔离保证**；需要依赖执行身份时，应在精确组合中核对实际 uid。源镜像 digest 不代表依赖安装后的整个文件系统未变化。

## 私有访问与网络策略

连接器将域名 allowlist 映射到 Modal 原生出站限制。按[网络策略](../../build/sandbox-policy.md)覆盖任务与凭据通道所需访问，并测试允许和拒绝路径。控制平面访问模型与 Sandbox 直接访问外网属于不同路径。

预览使用服务端 Connect Token Cookie，由 Hexagon 代理处理。应用使用 [Hexagon 预览授权](../../build/private-preview.md)，不向浏览器传递 Modal 账户 Token 或私有连接 Cookie。用户服务需要监听正确端口并保持存活。

## 空闲快照与下一轮

Modal 使用文件系统快照、终止旧 Sandbox、从快照创建新 Sandbox 的策略。Session ID 保持稳定，底层 resource ID 可能变化；应用持久保存 Session ID，不缓存 Provider URL 作为稳定应用入口。

下一次 submit 会触发恢复和 Runtime 准备。文件及受管理对话数据可以延续，任意进程、内存、网络连接不会因此保证延续；预览服务可能需要重新启动。一个 Run 等待授权或审批时仍属活动，不应被当作空闲任务。

快照、恢复有独立持久操作记录。快照结果不确定或恢复响应丢失时保留待对账状态，不能重复创建来猜测上一操作。按[空闲与唤醒](../../build/idle-and-wake.md)验证两轮、文件、对话、资源映射与清理；单轮 OCI 成功不证明恢复通过。

## 关闭与排查

close 终止当前 Session 计算资源并处理其跟踪的快照。共享 Modal App 和通用镜像缓存不是单个 Session 关闭时全部删除的对象。平台关闭结果也不等于 Provider 账户没有其他收费资源。

| 症状 | 排查方向 |
| --- | --- |
| 能列举但构建失败 | 凭据工作区、镜像权限、包管理器、构建日志和账户限制 |
| 找不到命令或解释器 | 镜像实际内容、注册 command、依赖准备 |
| 休眠后预览失败 | 文件保留与服务进程存活分开检查 |
| 资源 ID 改变 | 检查是否是同一 Session 的正常快照恢复 |
| close 或恢复 unknown | 保留原 operation、快照及资源标识，执行对账 |

本页已核对连接器、注册证据和快照清理路径；未重新运行实云任务。历史失败记录不能被后续成功覆盖，精确恢复范围见[Harness serverless 矩阵](../../../../../testing/evidence/2026-11-19-harness-serverless-matrix.json)。

依据：[Modal 连接器](../../../../../integrations/sandboxes/modal.ts)、[快照操作](../../../../../modules/sandboxes/checkpoints.ts)、[清理生命周期](../../../../../modules/sandboxes/lifecycle.ts)。下一步：[OCI Harness](../harnesses/oci.md)、[资源对账](../../operate/reconciliation.md)。
