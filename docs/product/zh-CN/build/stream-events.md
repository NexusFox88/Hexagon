# 将 Run 事件显示到你的应用

使用持久事件构建进度界面。流连接只是观察渠道；浏览器关闭、代理断连或客户端超时不会取消服务器上的 Run。

先完成[后端接入](backend-integration.md)，取得已授权业务记录中的 Run ID。以下代码接续已初始化的客户端，事件保存函数由应用实现。

## 消费并保存游标

Python：

```python
cursor = saved_cursor or '0'
for event in client.stream(run_id, cursor):
    if event.get('id'):
        # 应用数据库事务：按 (run_id, event id) 去重保存，并更新消费游标。
        store_event_and_cursor_atomically(run_id, event)
        cursor = event['id']
    else:
        handle_transport_event(event)
result = client.run(run_id)
```

TypeScript：

```typescript
let cursor = savedCursor ?? '0';
for await (const event of client.stream(runId, cursor)) {
  if (event.id) {
    // Application transaction: deduplicate by Run/event ID and advance the cursor.
    await storeEventAndCursorAtomically(runId, event);
    cursor = event.id;
  } else {
    handleTransportEvent(event);
  }
}
const result = await client.run(runId);
```

`store_*` 和 `handle*` 是应用回调，不是 SDK 方法。事件存储与消费游标必须协调：先推进游标、后保存事件会造成漏显示；先保存后崩溃则可能重放，使用唯一键去重即可。事件 ID 是数字字符串，保留字符串形式，不转成可能失去精度的 JavaScript Number。

## 重连原 Run

SDK 不会替应用无限重试。遇到传输失败时，从最后成功保存的 cursor 再次调用相同 Run 的 `stream`。对网络故障可设置有上限的退避；鉴权失败应先修复身份，不能不断重连。

TypeScript 可以给 `stream(runId, cursor, signal)` 传入 AbortSignal，停止本地观察。需要取消任务时，另行调用 `cancel`。Python 关闭迭代连接同样不会取消 Run。

HTTP 流支持 `after` 查询参数，也支持 `Last-Event-ID`，显式 `after` 优先。SDK 使用 `after`。服务端发出的 `stream.end` 没有事件 ID，它表示流已读尽终态，不是可持久重放的业务事件。收到后仍查询 Run，显示最终状态和结果。

## 非流式补读

Python `client.events(run_id, cursor)` 和 TypeScript `await client.events(runId, cursor)` 返回 `events` 数组。当前每次最多返回 500 条，按最后一条 ID 更新 cursor，继续读取直到空页。空页只表示当前没有后续事件，不代表 Run 已完成。

持久 Run 查询可以用来恢复当前状态；事件用来补齐时间线。不要从“没有新 token”推导失败，任务可能等待授权、审批或云启动。

## 前端展示

分开显示连接状态和任务状态。连接重试时保留已有进度；授权与审批等待应给用户可执行入口；终态分别呈现 completed、failed、cancelled。不要把所有工具输出拼接成助手最终答案，最终回答以 Run 的 `output` 为准。

后端对前端转发前检查业务归属，不将控制平面 Token 发给浏览器。日志和用户输入作为不可信文本渲染，不直接注入 HTML。

## 验证

主动断开订阅并恢复，核对 Run ID 不变、事件 ID 无重复、终态与查询一致。模拟保存事件后但推进 UI 前崩溃，确认重放不丢失数据。测试流断开后 Run 继续执行，以及显式取消才改变执行状态。

依据：[流路由](../../../../apps/control-plane/server.ts)、[事件查询](../../../../modules/execution/runs.ts)、[SDK](../../../../sdk/README.md)。下一步：[获取产物](artifacts.md)。
