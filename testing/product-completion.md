# Product completion delivery ledger

Source: `docs/product-completion-plan.md`. Original journey remains `testing/journey-source.md`; historical evidence remains in `testing/acceptance.md`. This ledger adds requirements and does not reset or replace that journey.

Statuses: pending / implementing / verified. Verification requires linked evidence, not just source files.

| ID | Requirement | Status | API / SDK / Console and evidence |
|---|---|---|---|
| M0.1 | 建立“功能 → 页面 → API → SDK → 测试 → 真实证据”矩阵。 | verified | This ledger + original journey mapping below |
| M0.2 | 将当前原始用户旅程逐条映射，保留全量需求，不按现有代码缩减。 | verified | This ledger + original journey mapping below |
| M0.3 | 建立缺陷列表，至少覆盖启动失败、代理/隧道故障、未知创建、未知删除、缺少 Agent 管理、首次与持续调用混淆。 | verified | This ledger + original journey mapping below |
| M0.4 | 固定 Console 页面清单、实体名称与状态词汇；后续新增入口须对应可完成的操作。 | verified | This ledger + original journey mapping below |
| M1.1 | 将控制面出站代理、供应商域名直连例外、凭证入口配置变为持久化本地部署配置，提供明确优先级与生效方式。重启不能丢失 Instabox 直连例外。 | verified | `evidence/2026-11-16-product-completion-final.md`, M1; limitations recorded there |
| M1.2 | 分开检测：控制面 → 供应商、控制面 → 模型、Sandbox → 控制面入口。前两者成功不能被显示成第三者已成功；需要创建测试资源的探测单独说明作用和清理责任。 | verified | `evidence/2026-11-16-product-completion-final.md`, M1; limitations recorded there |
| M1.3 | 临时隧道异常不阻止 Console/管理 API 启动；对依赖入口的新任务显示明确阻塞原因。生产托管使用显式稳定 HTTPS 配置。 | verified | `evidence/2026-11-16-product-completion-final.md`, M1; limitations recorded there |
| M1.4 | 将创建/删除不确定性显示为可管理的操作记录：操作 ID、供应商、已知资源 ID、最后证据、最近检查、下一次检查和可用动作。 | verified | `evidence/2026-11-16-product-completion-final.md`, M1; limitations recorded there |
| M1.5 | 对账有退避、并发上限和持久化调度。供应商能够提供权威失败/取消/不存在证据时，使用该证据结束操作；不能提供时，转为“需要人工确认”，保留审计与未知语义。 | verified | `evidence/2026-11-16-product-completion-final.md`, M1; limitations recorded there |
| M1.6 | 明确区分“归档待处理事项”和“确认资源已清理”。操作员提供证据的处置也不能抹去此前未知状态；恢复写操作继续受租户与权限约束。 | verified | `evidence/2026-11-16-product-completion-final.md`, M1; limitations recorded there |
| M1.7 | 处理当前 Instabox 未决案例：恢复网络后查询操作和资源，保留结论及其限制；没有足够证据时给出可操作的待办，不伪造关闭。 | verified | `evidence/2026-11-16-product-completion-final.md`, M1; limitations recorded there |
| M2.1 | 初次启动向导：部署健康 → Sandbox → 模型 → 可选工具 → Agent 配置 → API 调用。每步可返回、跳过可选项和继续未完成配置。 | verified | `evidence/2026-11-16-product-completion-final.md`, M2; limitations recorded there |
| M2.2 | 将“已保存”“凭证验证通过”“能力/权限已确认”“已启用”“组合可执行”分开表达，展示验证时间及其范围。 | verified | `evidence/2026-11-16-product-completion-final.md`, M2; limitations recorded there |
| M2.3 | 表单按供应商声明呈现必填项、凭证获取入口、权限需求与资源默认值；结构化多字段凭证、OAuth 和托管 Secret 各有明确路径。 | verified | `evidence/2026-11-16-product-completion-final.md`, M2; limitations recorded there |
| M2.4 | 字段级错误、保存反馈和下一步动作统一；验证失败保留非敏感草稿，凭证仅驻留页面内存。 | verified | `evidence/2026-11-16-product-completion-final.md`, M2; limitations recorded there |
| M2.5 | 默认先推荐最少输入的基础对话路径；能力限制明确显示，不以复杂配置堆叠代替引导。 | verified | `evidence/2026-11-16-product-completion-final.md`, M2; limitations recorded there |
| M2.6 | 保存成功后根据真实状态推荐验证、启用、绑定 Agent 或进入调用页；不自动启用未知权限，不自动授权写操作。 | verified | `evidence/2026-11-16-product-completion-final.md`, M2; limitations recorded there |
| M3.1 | Agent 列表、详情、创建、复制、修订、归档和依赖展示；增加缺失的 API 与双 SDK 方法。 | verified | `evidence/2026-11-16-product-completion-final.md`, M3; limitations recorded there |
| M3.2 | Agent 修订明确版本语义；已创建 Session 的定义与配置继续固定，修改/归档不会改变历史会话。 | verified | `evidence/2026-11-16-product-completion-final.md`, M3; limitations recorded there |
| M3.3 | Harness 页面展示内置版本、兼容模型类型、工具支持及自定义包注册信息；不能支持的组合提前解释。 | verified | `evidence/2026-11-16-product-completion-final.md`, M3; limitations recorded there |
| M3.4 | 调用页支持选择已保存 Agent，避免每次示例运行都创建同名 Agent。保留“一次性首次调用”作为独立模式。 | verified | `evidence/2026-11-16-product-completion-final.md`, M3; limitations recorded there |
| M3.5 | 明确三种示例：首次调用；复用 Agent 新建 Session；继续已有 Session 的多轮调用。持续会话示例不在首轮结束就自动关闭 Session。 | verified | `evidence/2026-11-16-product-completion-final.md`, M3; limitations recorded there |
| M3.6 | 提供 Python、TypeScript 和可独立理解的 HTTP 示例，使用同一组数据构建请求；输出字段、鉴权、幂等键、错误处理与 cleanup 语义一致。 | verified | `evidence/2026-11-16-product-completion-final.md`, M3; limitations recorded there |
| M3.7 | 提供事件流断线恢复和轮询两条路径。支持保留 Session/Run/幂等请求标识，以便在客户端退出后重新连接同一任务；不把重跑程序当作恢复。 | verified | `evidence/2026-11-16-product-completion-final.md`, M3; limitations recorded there |
| M3.8 | 用组合预检报告解释缺失配置、能力不兼容、失效连接和网络限制。预检能力不必先产生永久 Agent 垃圾记录；设计为校验定义或已有 Agent 的共享服务。 | verified | `evidence/2026-11-16-product-completion-final.md`, M3; limitations recorded there |
| M3.9 | 原始请求体和调用示例可折叠，首次使用优先展示运行命令、凭证来源、预期输出与错误去向。 | verified | `evidence/2026-11-16-product-completion-final.md`, M3; limitations recorded there |
| M4.1 | 运行概览：控制面依赖健康、可用连接、活跃 Session/Run、待审批/待授权和异常资源操作。 | verified | `evidence/2026-11-16-product-completion-final.md`, M4; limitations recorded there |
| M4.2 | 拆清 Session、Run、Sandbox、Runtime 四种状态；它们可互相导航，但不合并成一个笼统的“运行中”。 | verified | `evidence/2026-11-16-product-completion-final.md`, M4; limitations recorded there |
| M4.3 | Sessions/Runs 独立列表、分页、搜索、筛选、深链接；Fleet 聚焦真实云资源及生命周期。 | verified | `evidence/2026-11-16-product-completion-final.md`, M4; limitations recorded there |
| M4.4 | 详情页按当前任务阶段组织：输入 → 执行进度 → 等待事项 → 回答与产物 → 资源状态；原始事件和日志作为高级视图。 | verified | `evidence/2026-11-16-product-completion-final.md`, M4; limitations recorded there |
| M4.5 | 统一待办：授权、审批、对账异常、清理失败；显示影响对象、原因、可执行动作和处理记录。 | verified | `evidence/2026-11-16-product-completion-final.md`, M4; limitations recorded there |
| M4.6 | SDK 打印的链接能直达对应 Session/Run，不再只跳到 Fleet 首页。 | verified | `evidence/2026-11-16-product-completion-final.md`, M4; limitations recorded there |
| M4.7 | 对无数据、加载、部分失败、失去连接和刷新中的状态采用统一规范，保留最后一次成功数据与更新时间。 | verified | `evidence/2026-11-16-product-completion-final.md`, M4; limitations recorded there |
| M5.1 | 应用目录按用途筛选，支持多个账号和清晰命名；搜索、账号选择、权限与操作配置形成一致流程。 | verified | `evidence/2026-11-16-product-completion-final.md`, M5; limitations recorded there |
| M5.2 | OAuth 客户端配置与最终账号授权分别说明。缺少服务端客户端配置时直接指出原因，不能只给不可用授权按钮。 | verified | `evidence/2026-11-16-product-completion-final.md`, M5; limitations recorded there |
| M5.3 | 持续显示授权状态、验证范围、失效后的重新授权入口及 Secret 轮换影响；变更前展示依赖的 Agent/Session。 | verified | `evidence/2026-11-16-product-completion-final.md`, M5; limitations recorded there |
| M5.4 | Sandbox 目录展示实际适配能力及限制，如网络策略、预览、暂停、有效期，而非只列供应商品牌。 | verified | `evidence/2026-11-16-product-completion-final.md`, M5; limitations recorded there |
| M5.5 | 应用和 Sandbox 使用不同的证据标签：已实现、模拟覆盖、真实账号/资源验证、限制项；没有实测的应用不能被暗示为已认证可用。 | verified | `evidence/2026-11-16-product-completion-final.md`, M5; limitations recorded there |
| M5.6 | 统一权限最小化与写操作审批说明；本轮不新增 SaaS 数量作为完成指标。 | verified | `evidence/2026-11-16-product-completion-final.md`, M5; limitations recorded there |
| M6.1 | 一套可复现的本地安装与启动入口：检查运行时/数据库等前置条件、创建数据目录、生成控制面访问凭证、提供状态检查、升级与备份说明。 | verified | `evidence/2026-11-16-product-completion-final.md`, M6; limitations recorded there |
| M6.2 | SDK 的本地包、wheel/tarball 和文档能在干净环境安装；公开发布前仍使用可验证的本地分发，不写不存在的 npm/PyPI 安装命令。 | verified | `evidence/2026-11-16-product-completion-final.md`, M6; limitations recorded there |
| M6.3 | 将 owner 引导凭证与日常应用访问令牌区分；提供创建、到期、轮换、撤销和最近使用管理，服务端只保存令牌哈希，不扩展成完整企业权限系统。 | verified | `evidence/2026-11-16-product-completion-final.md`, M6; limitations recorded there |
| M6.4 | Console 按页面和职责拆分，逐步抽出连接编辑器、运行详情、调用生成、共享交互组件和请求/错误处理。遵循功能交付边界迁移，避免一次性框架重写。 | verified | `evidence/2026-11-16-product-completion-final.md`, M6; limitations recorded there |
| M6.5 | API schema、SDK 类型、请求示例与文档共享契约来源或契约检查，防止 UI 示例再次脱离真实 cleanup/取消语义。 | verified | `evidence/2026-11-16-product-completion-final.md`, M6; limitations recorded there |
| M6.6 | 自动化静态门槛：类型、格式/schema、翻译完整性、禁用原生 UI、关键流程测试。关键页面增加可重复的双语浏览器回归。 | verified | `evidence/2026-11-16-product-completion-final.md`, M6; limitations recorded there |
| M6.7 | 完成本地/托管配置边界：核心领域与 SDK 不读取开发机路径；本地启动器可使用 owner.json，托管模式要求显式身份和入口配置。 | verified | `evidence/2026-11-16-product-completion-final.md`, M6; limitations recorded there |

## Original journey mapping

| Source stage | Product surfaces / API / SDK | Historical evidence and new requirements |
|---|---|---|
| 1 Startup | local launcher, health, network settings | acceptance main #1; M1, M2, M6 |
| 2 Sandbox CRUD | Sandbox page; connections methods | connection-lifecycle-gui; M2, M5 |
| 3 Requirements Tool | Tools page; connection/OAuth APIs | original Web journey, GUI authorization; M2, M5 |
| 4 Execution combination | Agents/Harnesses/catalog/preflight | execution matrix, custom-harness tests; M3 |
| 5 Session | create/query Session in both SDKs | full dual SDK journeys; M3, M4 |
| 6 Inputs/idempotent submit | upload/submit/events | Web fixture and retained audits; M3 |
| 7 Provision/runtime | Fleet / operations / durable worker | provider and fault journeys; M1, M4 |
| 8 Actual task/tests | Runs, tools, files/artifacts | fixed eight-assertion Web fixture; M4 |
| 9 Preview | Fleet grant/proxy/expiry | natural expiry and tenant boundary evidence; M4 |
| 10 Authorization | Tools + pending actions; same Run resumes | authorization refusal and lifecycle; M2, M4, M5 |
| 11 Approval | pending actions + decide in both SDKs | zero-before/one-after external write evidence; M4 |
| 12 Final result | run/events/artifacts, both SDKs | retained journey audits; M3, M4 |
| Disconnect + follow-up | replay cursor, same Session, new Run | cross-language continuation; M3 |
| Branch A | connection/credential lifecycle | original lifecycle evidence; M2, M5, M6 |
| Branch B | alternate provider/Harness/custom | declared current matrix (Daytona excluded); M3, M5 |
| Branch C | worker/runtime/cloud faults and cancellation | original fault evidence; M1, M4 |
| Branch D | tenant, network and preview isolation | original boundary evidence; all new endpoints repeat tenant tests |
| Teardown 1–6 | retained outputs, exact provider cleanup, dependency deletion | original cleanup audits; M1, final cross-SDK cloud journeys |

## Defect inventory

- REL-001: proxy bypass exists only in process environment → M1.1.
- REL-002: unavailable development tunnel prevents management startup → M1.3.
- REL-003: unconfirmed create without a matching machine has no operator workflow → M1.4–7.
- REL-004: unknown deletion requires durable backoff and clear pending actions → M1.4–6.
- UX-001: saved/validated/enabled/compatible states insufficiently explained → M2.
- UX-002: Agent revisions, archive and GUI missing → M3.1–3.
- UX-003: first-use program is not a reusable/conversational client workflow → M3.4–9.
- UX-004: overview, direct Run URLs, paginated history and unified actions missing → M4.
- INT-001: implementation vs real provider/account evidence not visible → M5.
- DIST-001: clean install, application-token lifecycle and repeatable release checks incomplete → M6.

## Vocabulary and navigation

Use `Session`, `Run`, `Sandbox`, `Runtime`, `Agent revision`, `Connection`, `Secret`, `Access token`, `Resource operation` as distinct entities. GUI localizes descriptive text while preserving API identifiers. Target navigation is fixed in the source plan; new pages appear only with working interactions.

## Current execution notes

- M0 mapping completed by source/route/SDK inspection on 2026-11-16. This is planning evidence, not new runtime test evidence.
- M0–M6 delivery items implemented and checked; see final evidence for deterministic, browser and real-cloud scopes. “Verified” describes the delivery item, not every provider/account or independent human usability.
- Gate A functional journey passed. Gate B independent developer usability remains unmeasured; two Instabox unknown creates remain explicitly pending external reconciliation.
