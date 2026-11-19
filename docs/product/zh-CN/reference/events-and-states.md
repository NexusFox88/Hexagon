# 事件、状态与转换

状态属于具体对象。Session 仍 open 时 Run 可以 completed；Run 等待审批时 Sandbox 可以 running；Runtime unreachable 不证明计算资源不存在。客户端连接状态另行维护。

## Session

| 状态 | 解释 |
| --- | --- |
| `open` | 允许工作，不代表已有 Sandbox 或当前正在执行。 |
| `pausing / paused / resuming` | 暂停与恢复过程，结合 pause_scope 判断；Session 级与 Sandbox 级暂停不同。 |
| `closing / closed` | 关闭进行中／已关闭；closing 时保留清理跟踪，不能提前删除私有资源记录。 |

来源：[modules/sandboxes/lifecycle.ts](../../../../modules/sandboxes/lifecycle.ts)。

## Run

| 状态 | 解释 |
| --- | --- |
| `queued` | 已持久接受，尚未执行，不代表创建资源成功。 |
| `provisioning` | 准备计算、镜像或 Runtime，构建等待不是另一条 Run。 |
| `running` | 执行中，结合事件观察活动。 |
| `waiting_authorization` | 需要账户授权，也可能是未知 Tool 结果等待人工核对；查 tool calls。 |
| `waiting_approval` | 等待具体操作审批，不等同账户授权。 |
| `cancelling` | 取消正在收敛，已发出的外部操作可能仍返回。 |
| `completed / failed / cancelled` | Run 终态；completed 也不等于 Session 已关闭。 |

来源：[modules/execution/runs.ts](../../../../modules/execution/runs.ts)。

## Runtime binding

| 状态 | 解释 |
| --- | --- |
| `reserved / preparing / starting` | 控制平面的 Runtime 绑定准备与启动阶段。 |
| `ready` | 绑定就绪，不代表永远在线或每个任务成功。 |
| `restoring / restoring_preparing / restoring_starting` | 文件系统恢复后的 Runtime 准备过程。 |
| `unreachable` | 无法确认可达，保留恢复，不直接判定资源丢失。 |
| `interrupted` | 执行中断，需调查 workspace 与副作用，不盲目重启。 |

来源：[modules/execution/worker.ts](../../../../modules/execution/worker.ts)。

## Sandbox 资源

| 状态 | 解释 |
| --- | --- |
| `provider-derived state` | 连接器返回的字符串，不是跨 Provider 封闭枚举；running、paused 等需结合连接器语义。 |
| `confirmed absence / unknown` | inspect 的 null 是确认不存在；认证、网络失败不能转换为 null。 |

来源：[modules/sandboxes/connector.ts](../../../../modules/sandboxes/connector.ts)。

## 资源操作

| 状态 | 解释 |
| --- | --- |
| `pending` | 持久操作意图，不证明远程接受。 |
| `completed` | 该操作完成；create 完成不代表任务或删除完成。 |
| `unknown` | 远程结果未确定，需按原操作与回执对账。 |
| `rejected` | 明确拒绝，例如确认未接受分配的配额拒绝。 |
| `review_state: automatic / needs_review / acknowledged` | 独立审查轴；acknowledged 不会把 unknown 变成 completed。 |

来源：[modules/sandboxes/operations.ts](../../../../modules/sandboxes/operations.ts)。

## 转换与观察

正常 Run 由 queued → provisioning → running → completed。失败、授权、审批、取消与 worker 恢复会产生其他分支；这不是只能顺序前进的 UI 进度条。`run.claimed` 描述 worker 领取及 generation，不是一个名为 claimed 的 Run 状态。`run.recovery_needed` 可以在保留当前状态时写入恢复错误，不是新终态。

Runtime 进程调用还有自己的 starting、running、cancelling、exited、cancelled、failed、interrupted 状态，见 [Runtime](../../../../runtime/server.py)。exited 只表示进程退出，worker 仍需解析结果并导出产物，不能直接映射为 Run completed。数据库 Runtime binding 与该调用状态也不是同一个字段。

## 事件 envelope 与游标

```json
{"id":"42","type":"run.queued","data":{"session_id":"00000000-0000-0000-0000-000000000001"},"created_at":"2026-11-19T00:00:00Z"}
```

这是脱敏格式示例，不是实测日志。JSON events 查询返回 `{events:[...]}`，每条包含 id、type、data、created_at；SSE 在 id/event/data 字段传递事件，SDK 解析结果不附加数据库 created_at 字段。SSE 片段：

```text
id: 42
event: run.queued
data: {"session_id":"00000000-0000-0000-0000-000000000001"}

```

游标是数据库 sequence 的数字字符串，按 Run 查询递增但不保证连续，也不是 Runtime cursor。事件持久化后才推送。JSON 查询每页最多 500 条；SSE `after` 优先于 Last-Event-ID，默认 0。应用按 Run/id 去重，在同一事务保存事件和游标。只在收到数据后更新游标不足以保证应用持久化。

每约 15 秒可能收到无数据的 keepalive 注释。终态且事件排空后发送 `stream.end`，payload 为 `{state: ...}`，没有 id，不是持久事件。客户端断开只停止观察，不取消 Run。空页不证明终态，流结束后查询 Run。实现见 [HTTP SSE](../../../../apps/control-plane/server.ts)与 [Runs](../../../../modules/execution/runs.ts)。

## 主要事件及 payload

| 事件 | payload 字段或含义 |
| --- | --- |
| `run.queued` | `session_id` |
| `run.claimed` | `generation, recovery` |
| `run.provisioning / run.running` | `transition data (often {})` |
| `run.completed` | `final assistant output` |
| `run.failed` | `failure details including code` |
| `run.cancelling / run.cancelled` | `{} or lifecycle reason; expiry cleanup can include resource_cleanup` |
| `run.recovery_needed` | `generation and diagnostic fields` |
| `runtime.reconnected` | `{}` |
| `sandbox.image_building` | `{}` |
| `workspace.inputs_verified` | `session_id, files (path, sha256, size)` |
| `approval.required` | `id, action` |
| `approval.decided` | `id, approved` |
| `artifact.created` | `id, name, sha256, size` |
| `authorization.denied` | `call_id, source: caller, outcome: authorization_denied` |
| `tool.outcome_resolved` | `call_id, outcome, evidence, source: caller_verified` |
| `tool.completed` | `call_id; additional fields depend on direct/caller-verified/denied path` |
| `tool.result_after_cancellation` | `call_id, outcome` |

字段由生成路径决定，不把示意列当作严格 JSON schema。Tool 事件来源：[broker](../../../../modules/tools/broker.ts)、[reconciliation](../../../../modules/tools/reconciliation.ts)；产物见 [artifacts](../../../../modules/artifacts/artifacts.ts)。`tool.outcome_unknown` 表示需要调查的外部结果，不等于新的审批请求；查询原 tool call 的 hash、策略和状态再操作。

Runtime 事件由 ingest 按来源 cursor 去重保存，原生 Harness stdout 还可派生活动事件。具体原生事件取决于 Harness；不能把可见日志说成完整私有推理。当前表没有穷举动态原生事件、全部活动 payload 或每个生命周期事件样例，这些仍属本参考草稿待审查范围。

## 消费端要求

对未知事件类型保留或忽略展示，不崩溃，不凭它制造状态转换；按实际 payload 判别，不无条件读取字段。Tool completed 可能携带错误结果或代表拒绝后的交付，不能直接当成副作用成功。caller_verified 是人工核实结论，不是服务端再次访问 Provider 的证明。

重连原 Run，别重新提交；结果未知先对账。分别展示 Run 终态、Session 状态、连接可达性与清理状态，避免一个绿色成功标签掩盖未知资源。下一步：[事件流指南](../build/stream-events.md)、[恢复](../build/recovery.md)、[对账](../operate/reconciliation.md)。
