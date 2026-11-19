# 在你的产品中加入人工审批

对外部写入先展示待执行操作，由有权限的人明确批准或拒绝。Hexagon 将决定记录到原 Run，worker 继续交付工具结果；前端不应自己再调用一次外部 API。

需要已配置审批策略的 Tool、一个实际等待审批的 Run，以及可提交决定的管理身份。普通 application Token 可读取审批列表，但不允许调用决定路由。当前能力不是通用组织 RBAC：你的后端仍需验证业务审批者的权限。

## 读取并呈现操作

Python `client.approvals(run_id)`、TypeScript `await client.approvals(runId)` 返回 `approvals`。每条包含 id、run_id、action、state、decision、created_at。结合 `tool_calls` / `toolCalls` 的 approval_id 关联具体调用、参数和请求 hash。

界面至少呈现：目标账户与服务、将执行的操作、关键参数、对应任务和当前状态。外部工具描述和模型生成文本不能替代实际参数。不要默认选中“批准”，也不要把普通授权按钮当作写操作确认。

## 提交用户的决定

以下是后端处理函数，接续已初始化且有权限的客户端。`approved` 必须来自已验证业务身份的明确选择；业务归属检查在调用前完成。

```python
def decide_selected(run_id, approval_id, approved):
    rows = client.approvals(run_id)['approvals']
    selected = next((row for row in rows if row['id'] == approval_id), None)
    if selected is None or selected['state'] != 'pending':
        raise RuntimeError('Refresh the approval state before deciding')
    return client.decide(approval_id, approved)
```

```typescript
async function decideSelected(runId: string, approvalId: string, approved: boolean) {
  const { approvals } = await client.approvals(runId);
  const selected = approvals.find((row: { id: string }) => row.id === approvalId);
  if (!selected || selected.state !== 'pending')
    throw new Error('Refresh the approval state before deciding');
  return client.decide(approvalId, approved);
}
```

查询与决定之间仍可能发生竞态；服务端是最后裁决者。收到 `stale_approval` 时刷新审批和 Run 状态，不创建新的审批对象来绕过状态检查。

## 重复、过期与取消

服务器对相同已记录决定返回原结果；相反决定或不再 pending 的操作不能被改写。上述示例为避免误操作，要求调用前仍是 pending；如果响应丢失，重新查询确认存储的 state / decision 是否匹配用户选择。

取消会使待处理审批失效，迟到的批准不能复活 Run。已经批准并发出的请求可能产生外部效果，取消不保证撤销它。拒绝批准返回工具拒绝结果，让 Harness 处理；它不是自动取消整个任务。

Run 处于等待状态也可能涉及未知 Tool 结果。若已发出写入但响应丢失，应检查调用记录并[对账](../../../tool-reconciliation.md)，不能再点一次批准来重做写入。人工填写的对账结论需要外部事实支持。

## 验收完整流程

使用获准的专用测试对象：批准前检查外部写入次数为零，批准后检查一次并核对内容；拒绝时保持零写入；重复同一决定不增加操作；取消与迟到决定不能恢复任务。检查页面刷新后仍显示持久结果，不依赖浏览器内存保存审批。

将操作人、业务请求和返回决定记录到应用审计日志，避免记录凭据。测试应明确区分模拟 broker、真实第三方调用和真实云 Harness；本文没有把契约检查视作完整实云验收。

依据：[决定事务](../../../../modules/execution/runs.ts)、[Token 路由权限](../../../../modules/credentials/application-tokens.ts)。下一步：[工具授权](tool-authorization.md)、[持久事件](stream-events.md)。
