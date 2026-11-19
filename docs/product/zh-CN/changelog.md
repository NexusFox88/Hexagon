# 更新记录与升级提示

本页记录当前源码工作区中带日期的用户可见变化，不是已发布版本清单。[release-policy.json](../../../release-policy.json)当前处于 developer-preview preparation，尚未批准发布，仓库与软件包所有权确认及发布审查仍未完成。Python、TypeScript package manifest 当前均为 `0.1.0`，这个数字不能区分每个开发快照，也不能证明已经发布到包仓库。

为自己的安装记录精确源码或发行产物指纹、lockfile、SDK 产物与数据库迁移清单。本地构建的发行目录包含 release.json 元数据。变更实例前先阅读[升级迁移](operate/upgrades.md)。下文日期表示证据检查点，不承诺公开下载渠道已经提供新版本。

## 2026-11-19：E2B 公有 OCI 镜像准备

**影响。** E2B 可将公有 OCI Harness 镜像准备成 Session 专属模板，在创建计算资源前独立记录模板和构建操作。新增了构建阶段与清理责任，不包含私有镜像仓库或跨 Session 模板缓存。内置 Harness Session 继续使用配置的模板。

**操作。** 阅读 [E2B 前置条件](integrations/sandboxes/e2b.md)和 [OCI 注册](integrations/harnesses/oci.md)，选择兼容的不可变 Harness 定义并创建新 Session。等待准备结束，不能因响应丢失就发起另一个构建。计算资源与所属模板都确认清理前，保留模板和构建操作引用。本次增量没有改变 SDK 的 Session 输入形态。

**验证。** 检查初始化、准备状态、实际执行与清理。[日期证据](../../../testing/evidence/2026-11-19-e2b-oci-preparation.md)覆盖特定 OpenCode digest、安装后 Python 的 Chat Completions 与 TypeScript 的 Anthropic Messages、暂停前后实际文件哈希和原生状态、MCP、产物与清理。它不证明全部 SDK/协议交叉组合、Responses 或所有 E2B Harness。早期失败仍保留为失败；本次增量的清理审计不包含另行搁置的历史操作。

## 2026-11-19：Harness 暂停唤醒与 Playground 展示

**影响。** Serverless 验证按 Harness 和 Provider 区分实际文件与对话恢复。Console 将 SDK、REST API 作为同级表示，并修正暗色应用图标。切换代码表示保留草稿，不会提交任务。

**操作。** 阅读[无服务器生命周期](concepts/serverless-lifecycle.md)与[空闲唤醒](build/idle-and-wake.md)，核对具体组合再判断内存或文件系统恢复能力。改变固定 Harness 定义时创建新 Session。不能把 Provider 自动休眠当作确认删除，也不能把文件系统恢复当作全部进程仍在运行。

**验证。** 追问需要保持目标文件字节和对话状态，并完成确认清理。[日期记录](../../../testing/evidence/2026-11-19-harness-serverless-ui.md)保留实际失败、修复与 UI 检查；[已验证组合](integrations/verified-combinations.md)说明矩阵范围。较早矩阵的 OCI 排除项属于当时快照，前述 E2B 增量在之后补充限定范围证据，不能把旧行改写成已经测过新实现。

## 2026-11-18：读取历史 Session 初始化

**影响。** Console 和两种 SDK 可读取有效初始化快照，包括固定定义、适用时的源 Agent revision、环境变量名称与明确的脱敏元数据。它描述历史初始化，不是当前 Runtime 健康状态，也不是包含凭据的重放配置。

**操作。** SDK 缺少 Python `session_initialization` 或 TypeScript `sessionInitialization` 时更新安装产物。用快照调查 Session 实际收到的配置，不从中还原凭据，也不预期连接重命名会改变历史初始化。

**验证。** 两种客户端读取同一 Session 并比较快照，确认跨租户访问被拒绝且没有秘密值。[证据](../../../testing/evidence/2026-11-18-session-initialization.md)包含安装包测试、对既有云 Session 的只读查询和双语浏览器检查；该查询不是新云执行。参见[初始化说明](concepts/initialization.md)。

## 2026-11-18：Remote MCP、飞书/Lark 与 Responses

**影响。** Remote MCP 将发现并选定的 Tool schema 接入共享 broker；飞书/Lark 增加应用凭据交换与固定操作；OpenAI Responses 是独立模型协议，不能由 Chat Completions 连接成功推导支持。

**操作。** 按 [MCP](integrations/mcp.md)、[应用账户](integrations/apps.md)、[模型协议](integrations/model-protocols.md)配置。MCP 定义变化后重新验证再使用；显式选择 Responses 和兼容 Harness。已有不可变 OCI 注册保持原定义，兼容性元数据扩展不会修改它们，必要时注册新版本并创建新 Session。

**验证。** 检查选定操作、授权审批和实际模型协议。[原增量证据](../../../testing/evidence/2026-11-18-mcp-lark-responses.md)把 DeepWiki MCP 真实云旅程，与飞书/Lark 确定性覆盖、真实 CLI 配合 fixture Responses 服务的检查分开。后续矩阵可能扩展特定组合，但仅凭原记录不能证明真实 Lark 账户或真实 Responses 模型已通过。该变化也不提供任意 MCP 服务的自动 OAuth 接入。

## 2026-11-17：直接创建 Session，保存 Agent 可选

**影响。** 应用可以直接以 Harness、Sandbox 和模型连接 ID、可选 Tools 与环境创建 Session，不必先保存 AgentDefinition。Console 入口围绕 Sessions、运行连接和 Tool 连接组织；已有保存 Agent 的请求继续支持。

**迁移操作。** 先创建匹配的离线备份并处理已有资源，再按[升级步骤](operate/upgrades.md)应用目标源码。迁移 016 允许 Agent 引用为空，保留已有数据。应用读取逻辑需要接受直接 Session 的 `agent_id`、Agent revision 为空。去除业务层“启动前必须保存 Agent”的强制步骤；需要复用定义时仍保留 Agent 路径，不改写旧 Session 定义。

**验证示例。** 两种 SDK 分别在不创建 Agent 的情况下直接创建 Session，执行真实任务，检查最终结果与可空 Agent 引用，然后关闭并确认 Provider 删除；可选 Tool 绑定单独验证。[日期检查点](../../../testing/evidence/2026-11-17-minimal-session-console.md)记录 Vercel/Pi 与已有 SiliconFlow 连接上的独立旅程，其中一项使用 Exa，还包括安装包、API 和浏览器检查。它复用了凭据，没有重跑全部 Provider、授权或完整 Web 场景。这是源码变更迁移示例，不是虚构的正式版本发布。

## 文档修订：2026-11-19

双语产品文档按开始使用、构建、集成、概念、运维、参考和贡献组织，增加 [Agent 阅读指南](agents.md)与[覆盖台账](../coverage.json)。草稿与未完成内容继续标记。文档修改本身不会增加运行能力、产生已验证组合或发布网站。

结构检查器验证清单与部分 Markdown 结构、链接目标，不能证明文字准确、示例可执行或实云行为。文档验证与上述产品变更证据分开记录。

## 应用变化前

按[升级流程](operate/upgrades.md)和[备份恢复指南](operate/backup-restore.md)记录当前版本，处理 Run 与资源操作，保留匹配旧代码和备份，执行迁移并验证受影响的 SDK 与用户旅程。不能修改已应用迁移校验和，或强行用旧代码运行新数据库来回退。恢复旧备份会丢失之后的数据库写入，也不会撤销外部副作用。

下一步：[升级](operate/upgrades.md)、[已验证组合](integrations/verified-combinations.md)、[未知结果恢复](operate/reconciliation.md)。
