# 初始化、预检与配置固定

预检回答“当前请求在已知配置和能力上能否开始”；创建 Session 把选定配置固定下来；真正执行时仍需要云账户配额、网络、模型和 Runtime 可用。这三个阶段不能互相代替。

## 创建之前检查什么

控制平面检查连接的租户归属与类型、Sandbox / 模型是否验证并启用、必需工具是否就绪、Harness 版本与协议、初始化支持、OCI 与私有镜像能力，以及网络和 required capabilities。

三种典型结果：

| 请求 | 结果含义 |
| --- | --- |
| 已就绪连接与兼容 Harness | 返回 ready 和组合信息；仍未证明未来云创建成功 |
| OCI Harness 配到不支持 OCI 的 Provider | 执行前拒绝，不静默换成内置 Harness |
| 必需 Tool 未授权 / 未启用 | 初始化不能通过；按需要授权或明确改为可选工具 |

可选 Tool 仍需有效的连接绑定、正确类型和租户归属；它只是允许该工具尚未 ready，不是允许任意缺失连接。

预检不保存新的 Session，也不分配该 Session 的云 Sandbox。它可能检查或恢复凭据入口，因此“没有创建 Sandbox”不代表绝无任何网络准备动作。

## 创建时固定什么

Session 保存 Harness id/version、可选镜像信息、行为定义、工具和受保护 API 别名、资源与网络策略、连接版本及其配置，以及可选 Agent revision。普通 env 的有效合并值独立加密保存，查询只显示变量名。

`identity` 是行为描述，不是账户身份或权限授权。instructions 和 context 指导 Harness 行为，不能覆盖平台权限。上下文引用的文件还会在 Run 提交时检查存在性、SHA-256 和编码。

## 查询历史快照

Python `client.session_initialization(session_id)` 与 TypeScript `await client.sessionInitialization(sessionId)` 返回版本化快照。Console 的 Initialization 展示同一份有效配置。它在关闭后仍可读取，不能用 Agent 当前定义代替。

快照省略凭据和环境值，所以不是完整可重放备份。用它生成新 Session 时，连接 ID 会解析到当前连接配置和权限。重复相同 ID 不保证重现历史云条件；需要明确重新预检。

## 固定配置不等于冻结所有外部状态

更新模板不会改写现有 Session。禁用 Sandbox 或模型连接仍会阻止新的 Run；配置固定不能绕过当前可用性检查。供应商删除资源、配额耗尽或 Token 失效也不能被快照阻止。

依据：[Session 创建](../../../../modules/execution/sessions.ts)、[初始化契约](../../../session-initialization.md)。下一步：[模板](../build/agent-templates.md)、[连接生命周期](../build/connection-lifecycle.md)、[文件上下文](../build/project-context.md)。
