# 处理工具授权与重新授权

工具授权解决“这个账户是否有可用凭据来调用该服务”。单次审批解决“是否允许现在执行这一项具体操作”。两者可能先后发生，不能把授权成功当作批准所有写操作。

先[配置并绑定工具](tools.md)。需要在后续任务中才授权的工具应按实际需求声明为 optional；缺少必需授权可能在 Session 初始化阶段就被拒绝。

## 原 Run 等待时如何恢复

观察 Run 状态和 Tool 调用记录。`waiting_authorization` 应结合具体调用解释，不能只展示“正在思考”。在 Console 找到对应连接，完成账户授权或更新凭据，验证并启用。正常 worker 将继续处理原 Run，不需要为恢复另外提交一个任务。

OAuth 连接需要部署方配置对应应用注册和正确 callback。凭据代理 tunnel 不是管理 API 或 OAuth callback tunnel。直接提供的外部 access token 不一定具有自动刷新能力；账户范围和服务能力以连接器契约为准。

## 查询与拒绝一次授权请求

Python：

```python
calls = client.tool_calls(run_id)['calls']
# 在 UI 中显示调用并由有权限的操作者选择；不要自动拒绝全部调用。
selected = next(call for call in calls if call['id'] == selected_call_id)
client.deny_tool_authorization(run_id, selected['id'], selected['request_hash'])
```

TypeScript：

```typescript
const { calls } = await client.toolCalls(runId);
const selected = calls.find((call: { id: string }) => call.id === selectedCallId);
if (!selected) throw new Error('Selected invocation not found');
await client.denyToolAuthorization(runId, selected.id, selected.request_hash);
```

这些拒绝操作需要当前权限允许的管理身份；普通 application Token 不具有该变更路由权限。浏览器不能直接拿 owner Token；由已授权服务端或 Console 执行。

拒绝只影响这次待授权调用。Harness 收到 `tool_authorization_denied`，原 Run 可以继续解释限制。它不撤销账户凭据、不取消 Run，也不禁止以后新的调用再次请求授权。

重复相同拒绝返回已记录结果，不重新启动任务。hash 不匹配、非待处理调用、已在执行或取消竞态会被拒绝；重新查询实际状态后决定下一步，不能修改 hash 绕过校验。

## 凭据失效与外部结果未知

授权失败后补充正确凭据不意味着可以重做任何已发出的操作。若先前写入已经发送但结果未知，按[Tool 对账](../../../tool-reconciliation.md)处理。拒绝授权也不能撤销此前已发生的请求。

关闭或取消 OAuth consent flow 与取消 Run 是不同动作。用户离开授权页面时应保留可恢复的等待状态，允许其明确拒绝或稍后完成，不生成新的重复任务。

验证成功路径时确认同一 Run 继续；验证拒绝路径时确认没有新外部调用、凭据未被修改、原任务能够解释拒绝。不同应用的真实账户验证范围参见[应用连接器](../../../application-connectors.md)。下一步：[人工审批](approvals.md)。
