# 对账和清理不确定的云资源与 Tool 操作

远程操作可能已经生效，但响应未返回。unknown 表示需要调查结果，不能自动解释为失败、未创建或已删除。

使用管理身份查询资源操作，保留 Session、operation、Provider resource / operation ID 和时间。真实 ID 留在本地私有证据，公开问题报告只附脱敏摘要。

## 查询与复核

```python
page = client.resource_operations(limit=50)
operation = client.resource_operation(operation_id)
# 已核实需要针对原操作再次查询 / 对账后，显式执行：
result = client.review_resource_operation(operation_id, 'reconcile', 'Recheck original operation')
```

```typescript
const page = await client.resourceOperations(50);
const operation = await client.resourceOperation(operationId);
// Explicit action against the original operation after review:
const result = await client.reviewResourceOperation(operationId, 'reconcile', 'Recheck original operation');
```

列表含 next_offset，继续读取才是完整集合。复核仅适用于 unknown 操作；`reconcile` 会调用对应生命周期逻辑，可能涉及云操作，不是纯只读按钮。返回 `reconciliation_error` 时保留记录并继续调查，不把 HTTP 成功当资源已处理。

`acknowledge` 暂停自动复核并保留 unknown；`reopen` 恢复自动检查。人工备注不证明结果，不能用 acknowledged 取代清理确认。

## 三类典型事件

**创建响应丢失。** 依据原操作 ID、准确名称或 Provider handle 查询。一个可信匹配可用于恢复绑定；多个匹配需要调查归属；零匹配可能受异步创建、分页或最终一致性影响。仅看到空列表不足以证明未创建，不能直接换名称创建第二个资源。

**删除响应丢失。** 查询原资源和关联端点。Provider 确认不存在后，生命周期可以完成清理；存在则按原删除意图继续。不确定时保留 closing。计算停止、快照保留和预览端点删除是不同对象，必须覆盖所有平台拥有的关联资源。

**Tool 写入响应丢失。** 使用调用 ID 和 request_hash 到外部服务核对，确定成功或失败后提交 `resolve_tool_call` / `resolveToolCall`。这是交付已验证结果，不再发送工具请求。证据应说明比对了什么记录；无证据就保留 unknown。

## 何时停止自动处理

身份或归属不明确、多条候选、Provider 暂不可达、异步操作未终结时，保存可复查记录并按策略退避。不能通过删除连接、修改数据库状态或新建 Session 隐藏未决云资源。

取消 Run 不能撤回已派发写入。close 可以反复针对同一资源对账，但未知外部结果仍须记录。确认任务输出成功也不能作为全局无孤儿资源的证明。

## 完成标准

每项原操作都有可核对终局或明确保留的未决结论。清理应验证准确资源及关联端点不存在，Session 状态与之相符；Tool 对账保留请求 hash、外部事实和审计结果。不同失败场景独立验证，不能只跑正常 close。

依据：[资源复核](../../../../modules/sandboxes/operations.ts)、[Tool 对账协议](../../../tool-reconciliation.md)。下一步：[诊断](observability.md)、[备份恢复](backup-restore.md)。
