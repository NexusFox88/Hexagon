# 术语表

本文统一产品文档中的概念用法。API 标识、错误码和代码字段保持英文；中文解释不改变协议名称。状态值必须按对象区分，不能将 Session、Run、Runtime 和云资源的状态混用。

| 英文术语 | 中文用法 | 含义与边界 |
| --- | --- | --- |
| [Session](../concepts/sessions-runs-agents.md) | 会话工作上下文 | 持久的工作上下文标识，关联配置、工作区、对话与云资源。不是某台机器；恢复时资源可变化。 |
| [Run](../concepts/sessions-runs-agents.md) | 一次任务执行 | 一次提交的持久执行记录。同一 Session 当前只允许一个活动 Run；等待授权或审批仍属活动。 |
| [Agent template](../build/agent-templates.md) | Agent 模板 | 可选的可复用配置，按不可变 revision 使用。直接创建 Session 不要求模板。 |
| [Control plane](../concepts/execution-architecture.md) | 控制平面 | 拥有 Session/Run、租户检查、凭据、事件持久化和云资源操作的服务。 |
| [Sandbox](../integrations/sandboxes.md) | 云执行环境 | 运行任务代码的远端隔离环境，其资源由 Provider 提供，生命周期由平台协调。不是 Console 页面。 |
| [Sandbox Runtime](../concepts/execution-architecture.md) | Sandbox 内运行服务 | Sandbox 内的执行监督服务，管理 Harness 进程、工具邮箱与运行通信；不拥有云账户操作。 |
| [Harness](../integrations/harnesses.md) | Agent 执行引擎 | 执行模型驱动循环的引擎，例如 Pi/OpenCode；与 Sandbox Provider、模型协议分别选择。 |
| [Provider](../integrations/choose.md) | 服务提供方 | 某类连接的适配目标。Fly Sprites 与 Fly Machines 是不同目标，供应商名称不等于统一能力。 |
| [Connection](../build/connection-lifecycle.md) | 连接 | 租户所属的账户配置、端点和访问策略，拥有验证、启用及版本状态；不是一次网络 socket。 |
| [Binding](../build/tools.md) | 绑定 | Session 中的命名关联，例如 tools 或 connections 中 alias 到连接 ID 的映射。绑定不自动扩大权限。 |
| [ToolBroker](../build/tools.md) | 工具调用管理服务 | 在控制平面处理工具授权、审批、派发、持久调用记录和未知结果。 |
| [Agent Tool](../build/tools.md) | Agent 可调用工具 | Harness 可发现并通过平台调用的命名能力。HTTP Tool、应用连接器和 Remote MCP 都可提供此能力。 |
| [Protected HTTP connection](../integrations/http-tools.md) | 受保护 HTTP 连接 | guest 通过委托地址直接访问受路径/方法限制的 API；不自动经过 ToolBroker 审批。 |
| [Authorization](../build/tool-authorization.md) | 授权 | 取得并维持可访问账户或工具的资格。凭据存在不证明每个资源权限都足够。 |
| [Approval](../build/approvals.md) | 调用审批 | 对某一次具体操作及参数的执行决定；不是账户登录，也不替代第三方权限。 |
| [Secret](../operate/credentials.md) | 受管理密钥 | 加密保存、值不回显的凭据资源。可轮换或禁用，引用关系影响删除。 |
| [Variable](../concepts/security-boundaries.md) | 变量 | 普通 guest 可读配置，不是 Secret。把密钥放入变量不能获得凭据保护。 |
| [Delegated grant](../concepts/security-boundaries.md) | 委托访问授权 | 限定范围、生命周期和可撤销的访问权限，其 token 仍需保密；不是原始上游账户密钥。 |
| [Preflight](../integrations/choose.md) | 预检 | 分配资源前核对配置、引用、能力和凭据入口等条件，不证明真实网络、额度或任务成功。 |
| [Validation](../build/connection-lifecycle.md) | 连接验证 | 适配器特定的验证操作，可能只是结构或列表检查；范围需查看具体返回与文档。 |
| [Pinned configuration](../concepts/initialization.md) | 固定配置 | Session 保存的配置版本与策略。连接或模板后续变化不会静默改写它。 |
| [Idempotency key](../build/recovery.md) | 幂等键 | 标识同一逻辑提交。恢复丢失响应时保留原键与输入；新一轮工作使用新键。 |
| [Durable event](../concepts/events-and-recovery.md) | 持久事件 | 先保存再流式发送的状态或活动记录。连接断开不取消 Run，游标用于继续观察。 |
| [Artifact](../build/artifacts.md) | 产物 | 由平台导出并可下载的交付文件，可在关闭后留存；工作区任意文件不自动成为产物。 |
| [Private preview](../build/private-preview.md) | 私有预览 | 受授权与有效期限制的运行服务访问入口，不是公开部署或永久链接。 |
| [Pause / suspend](../build/idle-and-wake.md) | 暂停 | 保留恢复条件的空闲状态，不等于资源删除。保留内存还是文件取决于 Provider 策略。 |
| [Provider-managed standby](../concepts/serverless-lifecycle.md) | 供应商自动待机 | Provider 决定的待机行为，平台未必能观测实际计算或计费状态。 |
| [Resume / wake](../build/idle-and-wake.md) | 恢复 / 唤醒 | 在同一 Session 继续工作的生命周期过程，可能涉及原 VM 恢复或从文件快照重建。 |
| [Close](../operate/reconciliation.md) | 关闭 Session | 终结 Session 并协调清理云资源。关闭请求受理不等于远端删除已经确认。 |
| [Cancellation](../build/recovery.md) | 取消 Run | 停止该 Run 后续执行；不能撤销已经发生的外部写入，也不自动等于关闭 Session。 |
| [Unknown outcome](../operate/reconciliation.md) | 结果未知 | 远程操作可能发生但缺乏确定回执。不是 failed，也不能作为盲重试依据。 |
| [Reconciliation](../operate/reconciliation.md) | 对账 | 对原操作、资源或外部记录进行核查并记录结论，不是重复执行一次来猜测结果。 |
| [OCI digest](../integrations/harnesses/oci.md) | OCI 内容摘要 | 固定镜像内容身份的摘要，与可变 tag 不同；准备过程中还可能安装依赖改变执行文件系统。 |
| [Native session ID](../build/multi-turn.md) | Harness 原生会话标识 | Harness 所管理历史的标识，不是 Hexagon Session ID，也不是云资源 ID。 |
| [Local / hosted](../operate/self-host.md) | 本地 / 托管控制平面 | 描述控制平面的部署位置，不表示任务在用户电脑本地执行；真实任务使用云 Sandbox。 |
| [Verified combination](../integrations/verified-combinations.md) | 已验证组合 | 带精确版本、协议、SDK、场景和日期的证据范围，不是目录中全部能力的保证。 |

## 三个容易混淆的表达

- “任务完成”应指 Run 的真实终态与交付检查，不能仅凭模型说“完成了”。“资源清理完成”另需远端确认。
- “连接可用”必须说明是结构验证、账户验证、启用还是实际调用成功；ready 不意味着全部操作均有权限。
- “支持恢复”必须说清保留的是工作区文件、对话、进程还是内存，以及对应 Provider/Harness 的证据。

写作时优先使用“向同一 Session 提交新 Run”“继续观察原 Run”“关闭并确认资源清理”这类明确动作，不用“重启一下”同时指代恢复、重放、新建和删除。

本页依据已链接的对象契约和实现说明整理，不新增接口或状态值。下一步：[对象关系](../concepts/sessions-runs-agents.md)、[能力与证据](../concepts/capabilities-and-evidence.md)。
