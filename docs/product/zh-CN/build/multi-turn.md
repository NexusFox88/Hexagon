# 在同一个 Session 中连续工作

继续已有项目时，复用 Session，每次用户提交创建一个新的 Run。Session 保存工作上下文，Run 保存这次执行的输入、事件和结果。

准备一个尚未关闭、没有活动 Run 的 Session。首个 Session 教程会主动关闭资源，因此不能直接复用那个已关闭的 Session。

## 提交第二轮

以下片段假设第一轮已经在工作区创建 `notes.txt`，并已完成。`first_run_id` / `firstRunId`、`session_id` / `sessionId` 和新的提交 key 都来自应用的持久记录。

```python
first = client.run(first_run_id)
if first['state'] != 'completed':
    raise RuntimeError('Inspect the first Run before continuing')
second = client.submit(
    session_id,
    'Read notes.txt, append a section named Next steps, and export the updated file into your Run artifact directory.',
    saved_second_turn_key,
)
print(second['id'])
```

```typescript
const first = await client.run(firstRunId);
if (first.state !== 'completed') throw new Error('Inspect the first Run before continuing');
const second = await client.submit(sessionId,
  'Read notes.txt, append a section named Next steps, and export the updated file into your Run artifact directory.',
  savedSecondTurnKey);
console.log(second.id);
```

第二轮使用新的 key；第二轮自身的网络重试继续复用这个 key。不要复用第一轮的 key 发送不同内容，否则会发生幂等冲突。

## 等待与并发

一个 Session 只有一个活动 Run。等待 Tool 授权或审批也属于活动状态。即便你刚查询到完成，多个客户端仍可能竞争提交，因此仍需处理 `session_busy`。

应用可以串行处理用户消息，或明确提示当前任务需要处理。平台不会自动把所有忙时消息排队。不同工作区应使用不同 Session；不要通过拆 Session 来绕过本来需要同一上下文的工作。

## 保留什么

计划内空闲后，下一次 submit 会协调唤醒。工作区与 Harness 对话的保留依赖组合和恢复机制；内存、网络连接和任意后台进程不是统一承诺。参见[Serverless Session](../../../serverless-sessions.md)。

新的 Run 产物是独立导出快照，后续修改不会改写之前已经下载的版本。需要在第二轮读取前一轮文件时使用工作区路径，不能把 Artifact ID 当本地文件路径。

Session 可由另一语言的 SDK 继续，前提是连接同一控制平面并具有该 Session 的权限。SDK 客户端对象不是对话身份，Session ID 才是关联依据。

## 成功条件与失败处理

确认两个不同 Run ID 属于同一个 Session；第二轮实际读到了第一轮文件，并保留旧内容、增加新内容。若依赖对话记忆，也要用可核对的前轮信息单独验证，不能只凭文件保留推断对话恢复成功。

第一轮失败时先调查文件是否部分修改；重提完整任务可能重复操作。Runtime 中断或远程结果未知时，不承诺自动安全重放。完成最后一轮后显式 close，并确认资源清理。

依据：[提交与活动 Run 检查](../../../../modules/execution/runs.ts)、[生命周期](../../../serverless-sessions.md)。下一步：[接入后端](backend-integration.md)。
