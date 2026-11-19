# Headless 自定义 Agent：背景、目标与待办

日期：2026-11-19  
状态：P0 代码与契约已落实，真实云端验收按组合记录；逐项审计及执行结果见 [P0 证据记录](../../testing/evidence/2026-11-19-headless-p0.md)。原始验收要求保留，未通过的真实组合不勾选。

## 背景

本次讨论由两个问题引出：新建 Session 时，Agent 的初始化上下文怎样输入和定义；Agent 与外界对话时，怎样知道自己是谁，以及实际代表哪个账号行动。

目前产品已围绕 Sandbox、模型、Harness、工具连接、Session/Run、SDK 和 Console 建立执行链路，也完成了有明确范围的真实云端暂停与恢复验收。但“可以启动并恢复一个 Harness”不等于“可以完整定义和运营一个 headless Agent”。运行环境、行为定义、消息来源、外部账号授权和结果交付需要形成一致的 API 契约。

本次目标是把缺口系统记录下来，避免继续只增加供应商卡片或单独的 prompt 输入框，而没有补齐 Agent 的核心语义。该文档记录开发方向；接口草案、兼容策略和实现顺序仍需在开发时结合现有代码细化。

## 实施前的现状与证据边界

以下是实施前审计结论，保留用于说明改动原因；当前契约以 [Session 初始化配置](../session-initialization.md) 和验收证据为准：

- `modules/execution/sessions.ts`：Agent/Session 定义包含 Harness、连接绑定、资源、网络、环境变量等，但没有统一的 Identity、Instructions 和初始化 Context 字段。
- `sdk/typescript/index.ts`：对应公开输入类型尚无上述统一字段。
- `modules/execution/inputs.ts`：支持首轮运行前上传工作目录文件；首次运行后不能替换初始化输入。文件进入工作目录不保证 Harness 自动读取。
- `modules/execution/worker.ts`：将本轮 `run.input` 交给 Harness。普通用户消息不是独立的初始化指令契约。

`name` 是平台展示名称，不能当作已经注入模型的身份。`env`/`variables` 是进程环境，也不等同于模型上下文。

以下待办中的幂等提交、审批、事件持久化、产物、连接禁用和会话版本固定等已有实现基础。必须逐项审计已有能力及缺口，复用现有模块，不能把整张清单都称为“尚未实现”，也不能因已有接口就称为完整验收。

关联资料：

- [架构与模块边界](../architecture.md)
- [用户旅程与验收依据](../../testing/acceptance.md)
- [Session 初始化配置](../session-initialization.md)
- [Serverless Sessions](../serverless-sessions.md)
- [密钥管理](../secret-management.md)
- [工具不确定结果对账](../tool-reconciliation.md)
- [Harness 恢复验收记录](../../testing/evidence/2026-11-19-harness-serverless-ui.md)

已有恢复验收只证明其记录的组合和行为，不自动证明身份、初始化指令、结构化输出或执行中交互的兼容性。

## 产品目标

用户无需打开 Console，仅通过 Python 或 TypeScript，就能：

1. 内联定义 Agent，或选择可复用 Agent 的固定版本。
2. 定义它是谁、职责是什么、遵循哪些指令、带着什么背景开始工作。
3. 选择 Harness、模型、云端 Sandbox，以及受限的工具授权。
4. 提交可追踪、可幂等处理的任务，知道忙时消息如何处理。
5. 通过 API 处理授权或审批，并继续原任务。
6. 在暂停和自动唤醒后继续同一会话，保留生效定义、对话与工作文件。
7. 获取符合约定的结果、事件、错误和产物。
8. 在 Console 查看与 API 一致的实际生效定义和执行事实，并复用配置创建新 Session。

保持极简入口：保存 Agent 是可选步骤，不能要求用户先在 GUI 注册 Agent 才能创建 Session。

## 语义边界

### Agent、Session、Run

- Agent：可复用、可版本化的行为与运行定义。
- Session：一次持久会话，固定所使用的 Agent 版本或内联定义，以及会话背景和连接配置。
- Run：一次任务执行，包含状态、事件、结果和关联操作。
- Agent 定义变更不能静默改变已经存在的 Session。

### 初始化输入

- `identity`：模型可理解的名称、职责、描述和代表关系。
- `instructions`：稳定的行为指令、工作方式与业务规则。
- `context`：会话背景文本及明确引用的资料文件。资料内容不自动获得指令权限。
- `submit(..., input)`：当前任务或后续用户消息。

上述字段已进入本次 P0 实现；当前字段限制与调用方式见 [初始化契约](../session-initialization.md)。文件引用必须验证租户归属、存在性、大小和类型；记录实际加载内容的版本或摘要，避免把“上传成功”误当成“模型已读取”。

### 三种身份

1. 模型身份：告诉模型“我是谁、负责什么、代表谁说话”。
2. 平台执行身份：由控制面绑定可信 Agent/Session/Run 标识，用于授权和审计。
3. 外部账号身份：由 Tool 的 OAuth/API 凭证及外部平台决定实际操作账号。

Prompt 里的身份声明不能授予外部权限。模型不能自行指定可信租户、调用者或审计身份。可向模型提供安全的账号/工作区说明，不能提供原始凭证。

### 状态与记忆

本阶段不做长期跨会话记忆。Agent 定义、初始化快照、Run 状态、原生会话和工作目录属于必要执行状态，仍须持久化与恢复。关闭、删除、复制配置、分叉对话是不同操作，不能混用语义。

以下勾选表示实现与确定性回归完成；真实云端通过范围以证据矩阵为准，不能把勾选视为所有供应商组合均通过。物理暂停恢复正在按显式 `scope=sandbox` 重跑。

## P0：完整 Agent 定义

- [x] 明确 Identity、Instructions、Context 的字段、限制、来源和优先级。
- [x] 同时支持内联 Session 定义与可复用 Agent 版本。
- [x] 固定 Session 的生效定义；明确允许传入的会话背景与禁止静默覆盖的字段。
- [x] 为每个 Harness 实现原生上下文/指令适配；不支持的能力明确拒绝或标注。
- [x] 初始化内容进入模型的机制可检查；恢复原生会话时不重复追加初始化消息。
- [x] 暂停、冷启动、Sandbox 重建后保留相同身份与定义。已在证据矩阵所列 Pi/OpenCode/Codex/Hermes/OpenClaw 双 SDK 组合验收；不代表所有供应商笛卡尔积通过。
- [x] Python/TS、Console 初始化详情、完整 JSON、生成代码、Playground 复用保持一致。

完成标准：两套 SDK 均可独立定义身份和背景，完成两轮云端任务与中间暂停恢复；检查实际适配输入和持久记录，不能只通过模型自我介绍判断注入成功。

## P0：消息与执行契约

- [x] 审计现有消息接口；定义文本、文件及未来多模态输入的表示和能力限制。
- [x] 将可信发送者/渠道信息与消息内容分离。
- [x] 支持外部消息 ID、业务请求 ID 和调用链关联。
- [x] 审计幂等键的租户/Session 作用域、重复提交与并发行为。
- [x] 明确忙时策略；MVP 可采用单 Session 串行排队，不承诺所有 Harness 实时打断。
- [x] 明确取消、执行中补充信息、网络断连及不支持操作的错误语义。

完成标准：重复投递不重复执行；并发消息行为确定；客户端断线不取消 Run；伪造消息正文不能改变权限和调用者身份。

## P0：权限与授权闭环

- [x] 可查询 Agent/Session 生效的工具、操作范围与安全账号说明。
- [x] 审计现有 API 审批流程：获取动作、批准/拒绝、同一 Run 恢复。
- [x] 审计外部授权链接、完成状态、失效和撤销处理。
- [x] 凭证/权限失效返回稳定机器可读错误，避免仅显示上游原始错误。
- [x] 恢复和新任务执行时重新校验当前授权，旧快照不能保留已撤销权限。
- [x] 对不确定的外部写操作结果对账，不盲目重试。
- [x] 审计身份由控制面绑定，不依赖模型生成的标识。

完成标准：包含拒绝审批、撤销权限、过期授权、写操作超时等场景；原始供应商凭证保留在控制面。

## P0：程序化结果交付

- [x] 审计并统一最终结果对象：终态、文本、产物引用、错误码及扩展字段。
- [x] 事件分类稳定：消息、工具活动、执行状态、产物；调用方无需解析 Harness stdout。
- [x] 验证事件先持久化后推送、游标续读、排序和去重语义。
- [x] 明确文件上传/下载、内容校验、权限、保留期限及关闭后的访问规则。
- [x] 明确超时、取消、Harness 失败、模型失败、授权失败的区别。

完成标准：断线后恢复读取且不漏最终结果；Python/TS 输出一致；关闭 Sandbox 后仍可按契约访问结果和产物。可观测性只公开真实可用的活动或摘要，不要求获取模型内部完整推理。

## P1：执行预算与结构化输出

- [ ] 时间、轮数、工具次数、输出大小等预算有统一定义和超限行为。
- [ ] 区分硬性可执行限制、Harness 声明能力和仅供参考的模型用量。
- [ ] 支持结构化输出契约及验证；格式错误的修复次数有上限。
- [ ] 预算/验证失败可查询、可追踪，不能无限重试或伪装成功。

## P1：通知、调试与版本回归

- [ ] 创建前兼容性检查覆盖初始化语义，而非仅连接可用性。
- [ ] 观测耗时、模型用量、工具错误和恢复次数；不可获得的指标明确标注。
- [ ] 异步完成通知支持签名、重试与投递状态。
- [ ] Agent 版本可比较，并有可重复执行的回归任务集。
- [ ] 兼容矩阵分别记录模型协议、工具、指令/背景注入、会话恢复、结构化输出和执行中交互。
- [ ] “基于已有 Session 创建”明确复制的是配置；会话分叉另行设计。

## 后续范围与非目标

- 长期记忆、多 Agent 协作、完整会话/工作目录分叉放在单 Agent 契约稳定后。
- 不建设完整 LLM Gateway，不代替用户管理模型供应商。
- 不重造通用密钥管理产品，复用现有凭证、授权和代理模块。
- 本地/托管指控制面部署位置；真实验收继续使用云端 Sandbox。
- Daytona 仍是未来候选，不纳入当前兼容验收。

## 建议推进顺序与交付要求

1. 逐项审计现有实现，把待办标为已有且已验证、部分实现、缺失、不支持或未验证，并链接证据。
2. 优先完成 Agent 定义契约和 Harness 适配，再打通消息、权限、结果的剩余缺口。
3. 同步更新 Python/TS SDK、Console、生成代码与复用流程，避免 API 与 GUI 出现两套语义。
4. 运行确定性测试及独立真实云端验收；按 Harness/Sandbox/协议记录结果，不以 Pi 或单次成功替代其他组合。
5. 真实资源 ID 留在本地私有证据中，保留失败与清理记录；不记录凭证值。
6. 新界面必须满足中英文、明暗模式、键盘、滚动、内容溢出和实际用户旅程验收。

本文件仅记录本次背景、目标和待办，不勾选尚未完成的事项。实施仍以用户旅程和架构边界为准，不缩减验收来迁就现有代码。

## 同类产品如何处理这些问题

调研日期：2026-11-19。以下以官方公开契约为依据，区分“产品已有设计”和“对 Hexagon 的建议”。OpenAI Agents API、Anthropic Managed Agents 中涉及 Beta 的接口可能变化；落地前应再次核对版本。本次是文档研究，没有对这些产品执行真实账号验收，也不推断其未公开的数据库、调度器或内部可靠性实现。

### 先区分比较对象

| 对照对象 | 提供的层次 | 对 Hexagon 的参考价值 |
| --- | --- | --- |
| OpenAI Agents API | 托管 Agent Harness、会话和工具执行协作；可连接执行环境 | 最直接的 Agent 平台 API 对照 |
| OpenAI Responses API | 模型调用、输入/输出 Items 和会话延续 | 模型协议适配与上下文传递，不能直接等同于平台 Session |
| OpenAI Agents SDK | 应用内 Agent 定义、运行、工具、审批与结果接口 | SDK 易用性和 Harness 内部契约 |
| Anthropic Managed Agents | 托管 Agent 与持久 Session 的运行接口 | 配置变更边界、空闲与工作流状态 |
| LangGraph | 应用编排、checkpoint、持久执行与中断恢复 | 恢复一致性和人工审批；不是通用 Sandbox 管理层 |

OpenAI 将上述 API 与 SDK 分开介绍，不能把“用了 Responses”视为“已有完整 Agent 平台”。[来源：OpenAI Agents 总览](https://developers.openai.com/api/docs/guides/agents)

### 1. Agent 定义：直接内联，同时允许保存复用

**官方设计。** OpenAI Agents API 可在创建 Session 时内联提供模型、instructions、tools 等 Agent 配置，也可以先保存 Agent，再以 `agent_id` 创建 Session。这避免把“先去管理界面创建一个 Agent”设成必要步骤。[来源：Configuring agents](https://developers.openai.com/api/docs/guides/agents-api/configuration)

**Hexagon 建议。** 保留当前极简用户旅程：SDK 内联定义是第一入口，保存 Agent 是复用功能。两种入口经过同一个解析器，生成 Session 的生效定义快照。固定版本、摘要及适配器版本是我们为跨 Harness 可复现性提出的要求，不应声称它们完全照搬上述 API。

不要为 identity 单独建立必须注册的资源。可提供名称、职责、描述等便利字段，由适配层编译为模型可见的稳定指令；授权主体仍由控制面生成。展示名称不能自动等于模型身份，也不能等于外部操作账号。

### 2. Context 必须拆开：模型背景与运行时上下文

**官方设计。** Agents SDK 的 `instructions` 定义行为；本地 Run context 可承载应用身份、数据库客户端和依赖，不会自动发送给模型。模型需要的事实必须通过指令、输入、检索或工具显式提供。SDK 还提供 Python `output_type` / TS `outputType`，用于程序需要的结构化结果。[来源：Agent definitions](https://developers.openai.com/api/docs/guides/agents/define-agents)

**Hexagon 建议。** 对前文 `context` 草案作进一步限定：

| 数据 | 谁能定义 | 模型是否可见 | 持久化/恢复要求 |
| --- | --- | --- | --- |
| `instructions`、模型身份说明 | 有权创建 Agent/Session 的调用方 | 是，按 Harness 的指令入口注入 | 固定生效版本；恢复时保持语义 |
| 模型背景、资料引用 | 调用方提供，平台校验资料归属 | 经明确加载后可见 | 保存来源、摘要和实际加载记录 |
| 租户、授权调用者、审计主体 | 控制面认证与绑定 | 默认不可见；只投影必要安全说明 | 可信记录，不能接受消息正文覆盖 |
| 外部账号说明 | 由已验证 Tool connection 提取 | 可按需展示安全账号信息 | 调用时重新检查当前授权 |
| SDK 本地对象、数据库连接等 | 调用方应用进程 | 默认不可见 | 不承诺跨网络序列化或随 Sandbox 恢复 |

不要将 SDK 本地 context 的任意对象透传模式照搬成 REST API。Hexagon 可以定义可序列化业务 metadata，但可信身份必须来自认证结果，凭证只能引用连接，不能混在 context 中。

**需要补测。** 上传文件、把文件路径放进 prompt、让 Harness 真正读取内容是三个不同事实；分别记录挂载成功、适配注入和可观测的读取行为。跨租户引用和资料内伪造系统指令不能改变权限。

### 3. 会话延续不等于自动继承全部初始化配置

**官方设计。** Responses 支持手动历史、`previous_response_id` 和 Conversations 等延续方式。文档特别区分：初始 input 中的 developer 消息保留在链式历史里，顶层 `instructions` 只作用于提供该字段的那次请求。[来源：Conversation state](https://developers.openai.com/api/docs/guides/conversation-state)

**Hexagon 建议。** 每个 Harness adapter 声明自己的初始化策略：原生持久配置、每轮重新提供的指令，或原生会话恢复。控制面统一语义，不能统一成“只在第一条用户消息拼一段 prompt”。

验收至少检查正常第二轮、进程重启、暂停唤醒和 Sandbox 重建四种路径：有效指令没有丢失，历史没有重复拼接，工具调用与结果关联仍然存在。模型说出自己的名字只能作为辅助观察，不能代替输入和恢复记录。

### 4. Harness 与计算环境分离，但运行位置不能照搬

**官方设计。** OpenAI Agents API 的 Codex Harness 运行在 OpenAI 托管侧，Environment 提供命令、文件等执行能力。Environment 可以省略、由 OpenAI 托管或自行连接；省略环境仍可使用远程 MCP/应用 function tools，但不具备环境内置命令和文件能力。[来源：Architecture](https://developers.openai.com/api/docs/guides/agents-api/architecture)

**Hexagon 建议。** 借鉴职责分离，不照搬部署拓扑。Hexagon 的 Sandbox Runtime 在云端 Sandbox 中运行多个内置/自定义 OCI Harness；控制面管理 Session/Run 和供应商资源。我们的暂停恢复还必须覆盖 Harness 进程状态、原生会话与工作目录，不能仅恢复一个远程命令执行连接。

统一层应包含 Agent 定义、消息、结果和能力声明；Harness adapter 负责原生映射；Sandbox connector 负责资源生命周期、网络和文件恢复机制。不要让每个 Harness 自己管理一套供应商生命周期，也不要把供应商特性强行包装成完全相同的恢复保证。

### 5. Serverless：Session 比 Sandbox 活得久

**官方设计。** OpenAI 对 self-hosted 环境明确让应用管理计算与文件。Session 可比环境存活更久；文档要求单一组件管理环境映射，避免并发重复创建。需要计算连接时会发出 `environment_connection` 类型的 required action；处理方验证事件、检查当前状态，再启动或重连环境。[来源：Sandbox lifecycle](https://developers.openai.com/api/docs/guides/agents-api/environments/lifecycle)

**Hexagon 建议。** 自动唤醒是控制面调度能力，不能暴露成用户每次手工恢复代理或 Sandbox 的步骤。将“接收任务 → 排队 → 获取执行租约 → 唤醒/重建 → 恢复 → 执行”变成持久状态转换；重复消息和过期回调不能启动第二个 Sandbox 或第二份 Harness。

需要同时记录三个维度，而不是一个 Completed/Closed 标签：

- Session：能否继续接收任务，是否已关闭。
- Run：排队、执行、等待动作或终态。
- Sandbox：供应商报告的运行、暂停、重建、释放等状态，以及平台恢复策略。

原生暂停、磁盘快照重建、文件与原生会话重建应分别记录。文件恢复成功不能冒充进程内存恢复；不支持某种恢复策略的组合必须明确拒绝或降级说明。

### 6. 忙时新消息与空闲状态要有明确契约

**官方设计。** OpenAI Agents API 向 idle Session 提交输入会启动新 turn，向 active Session 提交输入则会引导当前 turn。[来源：Run and continue sessions](https://developers.openai.com/api/docs/guides/agents-api/sessions)

Anthropic Managed Agents 区分 idle、running、rescheduling、terminated；idle 也可能是在等待输入或工具确认，甚至仍有打开的 workflow run。其会话操作还限制配置变更时机：工具/MCP 更新与系统配置变更不是同一种操作，不能假设随时修改都合法。[来源：Session operations](https://platform.claude.com/docs/en/managed-agents/session-operations)

**Hexagon 建议。** MVP 继续采用明确的串行任务策略；不要因为某个托管产品支持 active steering，就向所有 Harness 承诺实时插话。后续能力区分 `queue`、`reject_if_busy` 与经验证的 `steer`，不支持的策略返回稳定错误。

等待审批应保持 Run 未完成；Session 可以没有活跃计算但仍有待办动作。固定初始化定义与实时授权检查也要分开：行为定义不静默漂移，已撤销权限不能因版本固定而继续生效。

### 7. 外部身份和密钥：通过连接授权，不通过 Prompt 授权

**官方设计。** OpenAI Vault 把凭证放在 Agent 指令与配置之外，以 Session 的 vault 引用使用。MCP 可由服务侧附加 bearer/OAuth 认证。针对 OpenAI-hosted Sandbox，文档描述了环境变量占位符与网络代理替换机制，只对获准主机注入真实密钥；读取凭证对象不会返回密钥值。[来源：Vaults](https://developers.openai.com/api/docs/guides/agents-api/tools/vaults)

**Hexagon 建议。** 保持 variable 与 secret 分离；给 Sandbox 的是必要的受限访问能力，不是原始供应商密钥。上述托管环境保证不能推断为任意 Sandbox provider 都原生具备。

针对 CRM 场景，初始化可向模型说明“使用已连接的销售团队账号，允许查询联系人”；实际 HubSpot/Salesforce/Attio 账号、scope、操作范围与审计主体由控制面 connection 决定。连接可用不代表所有操作获准；执行前校验租户、Session 绑定、操作权限、审批状态及当前凭证有效性。

统一接入层继续优先复用供应商原生能力；没有等价能力时走既有受限凭证代理。能力不足时明确拒绝，不能静默把 secret 降级为普通 env。此机制是凭证与工具访问边界，不增加模型路由、计费等完整 LLM Gateway 职责。

### 8. 审批与恢复：未完成结果和外部副作用必须显式处理

**官方设计。** Agents SDK 把最终输出、可延续历史、待审批 interruptions 和可恢复 state 分开；等待审批时最终输出可以为空，应用保存状态并在批准/拒绝后恢复。[来源：Results and state](https://developers.openai.com/api/docs/guides/agents/results)

LangGraph 的 interrupt 将状态持久化，调用方使用同一 thread ID 和恢复值继续。恢复会从被中断节点的开头重新执行，因此中断之前的副作用可能再次运行，官方要求考虑幂等性。[来源：Interrupts](https://docs.langchain.com/oss/python/langgraph/interrupts)

**Hexagon 建议。** 统一 required action 对象，包含动作 ID、类型、关联 Run/tool call、到期时间和允许的响应；用户决策以持久记录推进原 Run，不要求重新提交任务。审批确认需绑定被批准的参数摘要，参数变化必须重新评估。

外部写操作分开记录“授权”“提交”“确认结果”“结果不确定”。恢复既不能跳过权限校验，也不能盲目重发已提交的 CRM 更新、消息或付款。只有可证明未执行或具有供应商幂等保障时才安全重试；其他情况进入现有对账流程。

### 9. 执行持久化与长期记忆是两个项目

**官方设计。** LangGraph 的 checkpointer 保存 thread 的执行状态，用于会话、人工介入和故障恢复；跨 thread 的长期数据使用独立 Store。生产持久化也不能依赖随进程丢失的内存实现。[来源：Persistence](https://docs.langchain.com/oss/python/langgraph/persistence)

**Hexagon 建议。** 继续推迟长期记忆，但不能推迟 Agent 生效定义、任务、审批、消息、恢复引用与产物的持久化。数据库 checkpoint、Harness 原生历史和 Sandbox 文件快照是三种不同恢复对象，必须记录彼此对应的版本或恢复点。

不为实现统一接口重造 LangGraph 式通用编排框架。先补齐现有 Session/Run 状态机和 Harness 恢复契约，已有原生状态优先复用。

### 10. 输出、预算与通知：对应用稳定，对内部实现克制

基于上述 SDK 结果与结构化输出设计，Hexagon 建议返回稳定的终态、文本、结构化结果、产物引用和错误；等待动作作为独立状态，不能被包装成空字符串成功。保留原生详情用于诊断，但应用主流程不解析 Harness stdout。

这里的预算与通知属于 **Hexagon 待设计项**，本次没有据此确认任何竞品具有跨任意 Harness 的等价保证：

- 时间、工具次数等平台可强制限制，与模型 token 用量等观测指标分别声明。
- 结构化输出分别标记模型原生支持、Harness 支持及平台事后验证；有限修复不能伪装成原生约束。
- 事件先落库再推送；通知允许重复投递，按稳定事件 ID 去重，并提供补拉入口。
- Webhook 签名、重试、投递记录不能替代 Run 持久状态；调用方以查询结果对账。

## 调研后追加的实施待办

以下是对前文计划的细化，不代表已完成。实现时合并到原有模块，避免另一套 Agent 平台平行生长。

| 优先级 | 工作项 | 应产生的交付物 | 核心验收 |
| --- | --- | --- | --- |
| P0 | 定义与上下文分层 | 内联/保存 Agent 共用 schema、模型背景与可信上下文边界 | Python/TS 相同定义生成等价快照；伪造身份不改变授权 |
| P0 | Harness 初始化协议 | 注入策略与版本、能力声明、恢复规则 | 各支持组合第二轮/重启/唤醒后不丢指令、不重复历史 |
| P0 | Session/Run/Sandbox 状态分离 | 状态转换与 required action 契约 | 等待审批不完成；重复请求不重复启动；新任务自动唤醒 |
| P0 | 授权和外部写恢复审计 | 当前授权检查、参数绑定审批、操作对账记录 | 撤销后拒绝；重复审批幂等；超时写不盲重试 |
| P0 | 可观测结果 | 生效配置、消息/动作关联、终态与产物对象 | SDK 不解析 stdout；Console 展示同一事实；断线可续读 |
| P1 | 有界输出与预算 | 输出 schema、验证结果、限制能力等级 | 格式失败可识别；超限停止；不无限修复 |
| P1 | 通知与回归 | 去重补拉契约、固定 Agent 版本的回归集 | 重复/乱序通知可对账；升级适配器能发现语义退化 |

建议新增的验收用例：

- [ ] 同一个内联定义与其保存版本分别创建 Session，比较实际生效字段，而非只比较模型回答。
- [ ] 名称、模型身份、平台调用者和 CRM 外部账号各不相同，操作审计仍准确归因。
- [ ] 背景资料含伪造指令、跨租户文件引用或超限内容，按定义的边界拒绝/处理。
- [ ] 两轮任务间暂停并重建 Sandbox，验证指令、原生会话、文件和工具授权。
- [ ] 同时提交两条消息、重复投递同一请求、收到过期唤醒事件，保持单一执行所有权。
- [ ] 审批等待期间重启控制面并撤销工具权限，恢复时不会沿用旧权限执行。
- [ ] CRM 写提交后连接中断，任务进入结果不确定/对账状态，不重复创建记录。
- [ ] 结构化结果不符合 schema、预算耗尽、事件订阅断开，均能程序化识别并恢复读取。
- [ ] 上述场景覆盖 Python/TS；真实云端、确定性模拟与未验证组合分别记载，不以文档研究作为通过证据。

设计结论：优先补齐 **行为定义、可信身份、持久执行、授权恢复和稳定结果** 五个契约。复用各 Harness 的原生能力及现有控制面模块；多 Agent、长期记忆和通用工作流编排继续后置。
