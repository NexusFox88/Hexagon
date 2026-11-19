# 将 Agent 接入你的后端

将 Hexagon 客户端放在应用后端，由后端验证业务用户、保存 Session / Run 标识并向前端提供结果。浏览器通过你的应用访问任务，不持有控制平面的管理凭据。

本指南适用于已完成[首个 Session](../start/first-session.md)的开发者。需要一个持久数据库，以及已验证和启用的 Sandbox / 模型连接。示例只展示 SDK 调用；应用数据库事务、用户登录和业务权限由你的后端实现。

## 保存业务关系

至少保存以下记录；字段名是应用设计建议，不是 Hexagon 数据库 schema：

| 应用记录 | 保存内容 | 用途 |
| --- | --- | --- |
| 工作上下文 | 业务用户 / 工作区 ID、业务任务 ID、Hexagon Session ID | 每次读取和操作先检查业务归属 |
| 提交意图 | 业务请求 ID、Session ID、完整 input、origin、幂等键 | 响应丢失后重试同一次提交 |
| 执行结果 | Run ID、最后观察到的状态、结果引用 | 后端重启后继续查询 |
| 观察进度 | Run ID、最后持久化的事件游标 | 恢复流并去重 |
| 资源回收 | Session ID、关闭意图、最后确认状态 | 追踪未完成的清理 |

不能仅检查“用户提交了一个合法格式的 Session ID”。先在应用数据库中确认它属于当前业务用户，再调用 Hexagon。即使多个用户共用同一个控制平面租户，也需要这层检查。

## 初始化客户端

本机开发可以使用 `Hexagon.local()`。后端连接远程控制平面时，使用服务器端配置的 URL 和应用 Token。

Python：

```python
import os
from hexagon import Hexagon
client = Hexagon(os.environ['HEXAGON_API_URL'], os.environ['HEXAGON_API_TOKEN'])
```

TypeScript（独立应用中安装本地构建的 SDK 包）：

```typescript
import { Hexagon } from '@hexagon/agent-sdk';
const apiUrl = process.env.HEXAGON_API_URL;
const apiToken = process.env.HEXAGON_API_TOKEN;
if (!apiUrl || !apiToken) throw new Error('Missing server-side Hexagon configuration');
const client = new Hexagon(apiUrl, apiToken);
```

应用 Token 用于其被允许的操作。连接管理、注册和审批等操作需要核对各自权限，不能假设执行 Token 具有全部管理能力。不要将 Token、Authorization header 或原始 Provider 凭据写入请求日志。

## 创建上下文并提交

首次业务任务使用直接 Session 创建：

```python
session = client.create_session(
    harness={'id': 'pi', 'version': '1.5.2'},
    sandbox_connection_id=sandbox_connection_id,
    model_connection_id=model_connection_id,
)
# 将 session['id'] 保存到已经验证归属的业务记录，然后再提交任务。
run = client.submit(session['id'], saved_input, saved_idempotency_key,
                    origin={'request_id': saved_business_request_id})
# 将 run['id'] 保存到同一业务请求记录。
```

```typescript
const session = await client.createSession({
  harness: { id: 'pi', version: '1.5.2' },
  sandbox_connection_id: sandboxConnectionId,
  model_connection_id: modelConnectionId,
});
// Persist session.id against the authorized business record before submission.
const run = await client.submit(session.id, savedInput, savedIdempotencyKey,
  { request_id: savedBusinessRequestId });
// Persist run.id against the same business request.
```

上述 `saved*` 值应来自你已持久化的提交意图，不是在每次 HTTP 重试时重新生成。`origin` 有助于关联来源，但不能代替鉴权或幂等键。当前请求哈希包含 input 和非空 origin；同一个 key 使用不同 input 或 origin 会得到 `idempotency_conflict`。

业务数据库与 Hexagon 不共享事务。要显式处理“远端接受了请求，但本地尚未保存响应”的间隙：保存提交意图 → 发起请求 → 保存响应。Run 提交响应丢失时，使用相同 Session、input、origin 和 key 再次调用；不能换 key 来绕过错误。

Session 创建没有相同的 Run 幂等键契约。创建结果未知时进入调查状态，先通过 Console / Session 查询查明归属和资源，避免直接循环创建。生产应用应将这类待调查记录放进可观察的恢复队列。

## 查询与前端交付

后端根据保存的 Run ID 调用 Python `client.run(run_id)` 或 TypeScript `await client.run(runId)`。把 `queued`、执行中、等待授权 / 审批、终态分别呈现，不把所有非完成状态都画成错误。

流式更新由后端订阅并转发。前端连接断开只表示观察中断，不能自动触发取消。终态以持久查询为准；返回产物前再次检查业务权限。预览 URL 是受时限约束的访问凭据，不应进入公共日志。

## 并发与清理

一个 Session 只允许一个活动 Run。遇到 `session_busy`，可以在应用层保存待发送消息，在前一 Run 结束后再提交；这是你的应用队列，不是平台自动排队。独立任务可使用独立 Session，前提是账户配额允许。

为每个 Session 定义明确的关闭责任，例如用户结束工作或业务任务达到保留期限。先处理活动任务，再显式 close，并记录确认结果。进程退出钩子不能作为唯一清理机制；服务异常退出时仍需从数据库恢复未完成关闭。

## 验收你的集成

- 用两个业务用户验证不能互读或操作对方任务。
- 在提交响应丢失后重发同一意图，确认返回同一个 Run。
- 重启应用后按已存 Run ID 查询，而不是创建新任务。
- 断开前端并重新连接，确认原 Run 继续且事件不重复显示。
- 关闭 Session 后确认资源状态，并仍可读取已导出产物。

这些是集成验收要求，不是本文示例已完成的实云测试声明。实现依据：[Run 提交](../../../../modules/execution/runs.ts)、[SDK](../../../../sdk/README.md)。下一步：[文件与上下文](project-context.md)。
