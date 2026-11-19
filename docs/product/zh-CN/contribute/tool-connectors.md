# 添加 Tool 或应用连接器

应用连接器在控制平面通过租户所属 Connection 发起上游请求。共享 Tool broker 管理授权、审批、请求身份和未知结果。Sandbox 与 Harness 消费已有 Tool 契约，不需要应用专有代码或账户凭据。

改变行为前阅读[应用架构](../../../application-connectors.md)、[broker 实现](../../../../modules/tools/broker.ts)与[验收要求](../../../../testing/acceptance.md)。

## 选择接入方式

| 需要 | 实现路径 |
| --- | --- |
| 有固定操作目录的具名应用 | integrations/apps 中的 AppDefinition，加共享应用注册表与 broker |
| 自己提供固定 JSON 操作的服务 | 优先使用已有 [HTTP Tools](../integrations/http-tools.md)配置；契约无法表达时再扩展适配器 |
| 已有远程 MCP 服务 | 使用 [Remote MCP](../integrations/mcp.md)发现和绑定流程 |
| guest 代码访问受保护 HTTP 接口 | HTTP Connection 访问策略，与 broker 的 Tool 审批不同 |

不要新增凭据存储，也不要把应用请求移到 guest 来绕过审批。复用请求映射时保留出处和许可；当前复用映射的来源保存在 third_party/activepieces。

## 定义有边界的读写操作

[types.ts](../../../../integrations/apps/types.ts)定义 AppDefinition、AppOperation 与 RequestSpec。每个操作提供严格对象 schema、表达实际副作用的 `write` 标记和固定请求映射。路径标识要编码，字符串和分页要有上限，拒绝未知字段，不能让模型参数随意选择主机或 HTTP 方法。POST 也可能是读取，例如 Notion 搜索；按语义判断副作用。

以下示意放在 integrations/apps 模块内。`.invalid` 服务故意不可访问，需要针对自己的受控服务实现并测试后才能注册：

```ts
import { operation, id, string, encode } from './types.js';

export const reportOperations = {
  read_report: operation(
    'Read one report.', false, { report_id: id }, ['report_id'],
    a => ({ url: `https://reports.example.invalid/reports/${encode(a.report_id)}`,
            method: 'GET' }),
  ),
  create_report: operation(
    'Create a report after approval.', true,
    { title: string, text: string }, ['title', 'text'],
    a => ({ url: 'https://reports.example.invalid/reports', method: 'POST',
            body: { title: a.title, text: a.text } }),
  ),
};
```

把操作放入 AppDefinition，补充 id、name、category、credential_url 和只读 `verify` 请求，然后加入 [registry.ts](../../../../integrations/apps/registry.ts)的 applications 列表。可参考 [productivity.ts](../../../../integrations/apps/productivity.ts)中的 Todoist `get_task` 与 `create_task`。

当前注册表缺省只选择非写操作；显式选择的写操作要求审批，并使用 `replay: 'never'`。供 broker 使用的方法由 `write` 推导，真实上游 HTTP 方法来自 RequestSpec，审查时不能认为二者一定相同。Session 绑定还会限制 Harness 可用的连接和操作。

## 接入认证与限定范围的验证

缺省认证为 Bearer。Provider 要求其他请求头、组合凭据或令牌交换时，使用 AppDefinition 的认证钩子。操作参数、schema、结果、URL 和诊断信息中都不能包含秘密。共享请求路径拒绝重定向、限制结果大小并替换已知凭据值，但这不能替代对 Provider 返回内容的审查，也不能替代源头防泄漏。

API key 使用受管凭据存储。OAuth 复用[现有模块](../../../../modules/apps/oauth.ts)、加密 token envelope 和租户或部署所属的应用配置，声明真实端点、scope 与客户端认证规则。复用绑定租户、连接版本、Provider 和 redirect URI 的过期单次事务，不另做临时 callback，不向浏览器返回 Token。账户或权限变更使旧审批失效；刷新 Token 有单独的并发和版本语义。

身份请求成功不能证明全部选定操作有权限。有依据时补充操作 scope、安全权限探测或对象元数据检查，否则保持未知。不能静默发送消息或创建真实对象来验证写权限；实测写入需要明确授权的可丢弃目标。断开本地连接不代表上游授权已经撤销。

连接、Secret、OAuth 事务、Session 绑定和 Tool call 查询都检查租户所有权。知道上游对象 ID 不代表拥有引用它的 Hexagon 资源。

## 保留审批与未知结果语义

broker 在执行前保存调用与 request hash；相同调用 ID 使用不同参数会冲突，并固定实际执行的连接版本和策略。授权建立账户访问条件，审批允许具体副作用，二者不能替代。

使用共享错误分类。当前应用传输中，401 触发重新认证；除 408 外的大多数其他 4xx 返回拒绝结果；5xx、传输失败及响应处理歧义可能留下未知结果。还需要解析应用错误信封，例如 Linear mutation 返回 GraphQL errors，即使 `data: null` 也可能已经发生写入。不能把全部 HTTP 200 当成功，或把全部错误响应当作没有副作用的证明。

写入响应丢失时，保留原调用并停止重发。通过安全读操作或 Provider UI 查询真实记录，再按 [Tool 对账](../../../tool-reconciliation.md)使用精确 `request_hash`、观察到的结果、返回文字和证据完成 resolve。resolve 记录操作者结论，不会发出新的上游请求。重复相同结论幂等，冲突或过期决定失败。无法确定结果时保持未知或取消 Run，不能编造成功或再次创建。

## 验证具体读写示例

使用 fake transport 与数据库 broker 测试。上述示例可以在 fixture 中维护内存报告存储和请求计数：读请求返回固定报告，写请求先保存报告再故意丢失响应，稳定触发未知结果。

| 场景 | 必须断言 |
| --- | --- |
| 读映射 | 主机、路径和方法固定，ID 编码，无意外请求体，schema 拒绝多余字段 |
| 写入等待审批 | 上游请求为零，新增报告为零 |
| 授权或审批被拒绝 | 零写入，原调用不能绕过拒绝 |
| 写入获批 | 恰好一份报告，结果返回原调用 |
| 重复相同决定或调用 | 不重复报告，同 ID 改参数冲突 |
| 保存后响应丢失 | 调用保持 unknown，重建 broker 不重复写入 |
| 核实后 resolve | 要求精确 hash，只保存一次结果，不增加上游执行 |
| 轮换凭据或取消 | 按状态拒绝旧审批或旧 resolve，迟到结果不重启已取消 Run |
| 跨租户访问 | 无法访问他人连接、Secret、调用，Provider 请求为零 |
| 认证与负载边界 | 分别验证重新认证、权限拒绝、超大或畸形结果及脱敏 |

已有回归入口：

```sh
npx vitest run integrations/apps/registry.test.ts modules/tools/applications.test.ts modules/tools/authorization-denial.test.ts modules/tools/cancellation.test.ts
```

按[测试指南](testing.md)配置隔离的 `TEST_DATABASE_URL`。为新 Provider 增加断言，不能用已有测试通过代替新接入覆盖。OAuth 变更还需测试 state 重放与过期、并发刷新和权限变更。

## 完成用户旅程与证据

按需更新应用发现、操作描述、凭据说明及 Console 表单。遵守 [Console 契约](../../../console-design.md)：完整 en/zh-CN 文案、应用自有的可访问控件、键盘操作、账户选择和凭据输入清空。检查两种语言及 OAuth 取消、返回流程。Agent Tools 与 Sandbox 平台设置保持分开。

两种 SDK 都通过公开 API 和真实云 Agent 调用实际读操作；在授权的可丢弃目标上验证写入、审批、可控情况下的响应丢失恢复与确认清理。记录精确账户权限范围，不公开秘密或私有内容。向外部发送消息需要明确授权，本文不构成发送授权。没有真实账户时，分别报告契约覆盖与真实账户未验证。

把 Provider、操作说明补充到[应用集成](../integrations/apps.md)，更新对应范围的证据，保留失败尝试。连接器测试通过不能支持笼统的真实账户验证标记。

下一步：[应用集成](../integrations/apps.md)、[未知结果对账](../operate/reconciliation.md)、[测试与证据](testing.md)。
