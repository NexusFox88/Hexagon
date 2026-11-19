# 为 Agent 绑定 Tools 与 MCP

Tools 让 Harness 调用已配置的外部操作。先在控制平面配置和授权连接，再在 Session 创建时按名称绑定它。Sandbox 平台设置、模型端点、受保护 HTTP 访问与 Agent Tools 有各自的角色，不能用同一配置入口互相替代。

## 选择连接方式

| 方式 | 适用情况 | 配置重点 |
| --- | --- | --- |
| 应用连接器 | 已有应用的受支持操作 | 账户、允许的操作、OAuth / Token、写入审批 |
| HTTP Tool | 需要固定请求映射的受保护 API | 输入 schema、请求映射、鉴权和副作用策略 |
| Remote MCP | 服务提供 MCP 工具发现和调用 | 传输、远端 schema、工具选择和逐操作审批 |

应用目录列出的是实现范围，不表示所有账户、操作和真实模型组合都已验收。查看[应用连接器资料](../../../application-connectors.md)中的验证范围。

## 配置一个只读工具

在 Console 的 Tools 中添加连接，选择目标账户与操作，完成授权、验证并启用。首次集成选择一个能明确核对结果的只读操作，例如读取专用测试文档。

Remote MCP 先发现工具，再审查名称、描述和 schema，选择允许操作。工具默认要求审批，包括自称 read-only 的工具；只有明确审查后才调整策略。服务器的说明是外部数据，不能直接作为授予权限的依据。

目前 MCP 支持 Streamable HTTP 和 legacy SSE；没有通用 stdio、资源 / prompts 订阅、sampling 或 elicitation 支持。任意 MCP 服务的 OAuth 浏览器注册和自动刷新也不在该接口范围，见[Remote MCP](../../../remote-mcp.md)。

## 创建带绑定的 Session

以下片段接续已初始化客户端和已验证的连接 ID。所选 Harness 必须支持 Tools。

```python
session = client.create_session(
    harness={'id': 'pi', 'version': '1.5.2'},
    sandbox_connection_id=sandbox_connection_id,
    model_connection_id=model_connection_id,
    tools={'research': tool_connection_id},
)
```

```typescript
const session = await client.createSession({
  harness: { id: 'pi', version: '1.5.2' },
  sandbox_connection_id: sandboxConnectionId,
  model_connection_id: modelConnectionId,
  tools: { research: toolConnectionId },
});
```

任务中使用绑定名 `research` 解释工具用途。连接 ID 指向账户配置，绑定名是 Session 中的使用名称。默认工具在初始化时为必需；确实允许缺失授权时可把该别名加入 `optional_tools: ['research']`。可选不等于获得授权或跳过审批，任务遇到权限缺口仍需处理。

## 调用与变更

提交一个明确要求读取测试对象的 Run，检查 Tool 调用记录和最终内容，而不仅看助手声称用了工具。受保护原始凭据留在控制平面，不写入 Sandbox 环境。

MCP 发现得到的 schema、描述和名称会在调用时检查。发生变化时重新发现并审查，然后创建新的 Session；不要假设原 Session 自动获得新操作。远端调用响应丢失可能成为 unknown，不能因操作名带 read 就擅自重新发起。

完成条件：指定工具实际调用、结果与测试对象一致、未允许的操作不能调用、授权 / 审批分支可处理，最后关闭并确认资源清理。本页为契约指导，真实组合验收需单独记录。

下一步：[处理授权](tool-authorization.md)、[人工审批](approvals.md)。
