# 使用可复用的 Agent 配置

直接创建 Session 适合显式指定每次任务的执行配置。当多个 Session 需要复用 Harness、行为和策略时，使用带修订历史的 Agent 模板。

模板保存配置，不是正在运行的进程，也不共享多个 Session 的工作区。先理解[多轮工作](multi-turn.md)：同一项目继续用 Session，重复使用配置才使用模板。

## 创建模板并使用

以下片段使用已初始化客户端和已验证连接。创建返回的 revision 可用于显式固定版本：

```python
agent = client.create_agent(
    name='Project assistant',
    harness={'id': 'pi', 'version': '1.5.2'},
    env={'APP_MODE': 'review'},
)
session = client.create_session(
    agent_id=agent['id'], agent_revision=agent['revision'],
    sandbox_connection_id=sandbox_connection_id,
    model_connection_id=model_connection_id,
)
```

```typescript
const agent = await client.createAgent({
  name: 'Project assistant',
  harness: { id: 'pi', version: '1.5.2' },
  env: { APP_MODE: 'review' },
});
const session = await client.createSession({
  agent_id: agent.id, agent_revision: agent.revision,
  sandbox_connection_id: sandboxConnectionId,
  model_connection_id: modelConnectionId,
});
```

使用 `agent_id` 时不要同时提供 `harness`。模板行为与资源等配置不能在该入口任意覆盖；普通 Session env 可以按环境契约提供覆盖值。环境变量值对 Sandbox 代码可读，不要将受保护连接凭据放进去。

## 修订是完整定义更新

Python 使用 `revise_agent(agent_id, definition, expected_revision)`，TypeScript 使用 `reviseAgent(agentId, definition, expectedRevision)`。`definition` 是完整合法定义，不是零散 patch；应明确保留需要的 Harness、策略和行为。

编辑之前读取当前 Agent 并保存 revision。服务器检查 expected revision，成功后递增；其他操作者先更新时返回 `agent_revision_changed`，应重新读取、审查差异后再提交，不自动强制覆盖。

修订时未提供 `env` / `variables` 会保留旧的环境配置；显式提供则替换该环境映射，空映射会清除。不要把响应中的 `env_names` 当作可恢复的明文值。

## 固定与归档

Session 创建时固定所选 revision 和连接配置。更新模板影响后续选择，不重写既有 Session。运行中的 Session 不会因为模板更新自动更换 Harness。

`archive_agent` / `archiveAgent` 使模板不再可用于新 Session，也不能继续修订；已有 Session 和历史版本仍需按其生命周期管理。归档不是关闭云资源，也不等于删除对话和产物。

## 验收

用同一 revision 创建两个独立 Session，确认工作区彼此独立。修订后创建第三个 Session，比较初始化快照：旧两个仍固定旧版本，新会话使用所选新版本。再归档模板，确认新创建被拒绝，最后分别关闭全部 Session 并确认清理。

管理修订 / 归档需要适当权限；不要因为 application Token 可创建模板就假设它能调用全部管理路由。参见[Token 路由](../../../../modules/credentials/application-tokens.ts)。实现依据：[Agent 与 Session](../../../../modules/execution/sessions.ts)、[初始化](../../../session-initialization.md)。下一步：[后端集成](backend-integration.md)。
