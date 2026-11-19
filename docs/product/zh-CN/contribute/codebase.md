# 代码地图与模块边界

阅读本页可以沿一次 Run 找到对应实现。改变行为前先阅读[工程架构](../../../architecture.md)和[验收旅程](../../../../testing/acceptance.md)。用户旅程是接受标准，不能因当前代码缺少某步就删掉该要求。

## 目录职责

| 位置 | 责任 |
| --- | --- |
| `apps/control-plane` | HTTP 装配、管理 API、凭据入口与预览入口 |
| `apps/console` | 消费同一 API 的管理界面；双语言 catalog 与应用自有交互组件 |
| `modules/execution` | Session/Run、输入、初始化、调度、结果解释 |
| `modules/sandboxes` | 资源生命周期、操作记录、快照、暂停与清理 |
| `modules/harnesses` | Harness 注册、协议、镜像与执行适配 |
| `modules/connections / credentials / access` | 账户配置、密钥及受保护访问策略 |
| `modules/tools / apps` | ToolBroker、调用对账、应用与 OAuth 管理 |
| `modules/artifacts / storage` | 产物与 PostgreSQL 事务、迁移 |
| `integrations` | 云 Provider、模型、应用、HTTP Tool 与 MCP 的外部协议适配 |
| `runtime` | Sandbox 内 Python 监督服务与 Tool bridge |
| `sdk` | Python 与 TypeScript 的公共客户端 |
| `tooling / testing` | 管理、验证脚本与旅程/证据，不是业务实现替代 |

## 沿一次提交读代码

1. **客户端入口**：[TypeScript SDK](../../../../sdk/typescript/index.ts)和[Python SDK](../../../../sdk/python/hexagon/__init__.py)发起相同 HTTP 操作。Console 也调用这些公共接口，不拥有另一套执行状态。
2. **身份与路由**：[server.ts](../../../../apps/control-plane/server.ts)校验请求身份和调用范围，解析 Session ID、输入与幂等键，交给领域服务。每次资源查找和跨资源绑定都要验证租户归属。
3. **持久提交**：[runs.ts](../../../../modules/execution/runs.ts)管理幂等、活动 Run 约束、状态推进与事件；[sessions.ts](../../../../modules/execution/sessions.ts)固定配置与资源关联。状态和事件必须先落库再向客户端发送。
4. **调度执行**：[worker.ts](../../../../modules/execution/worker.ts)持租约执行准备、原调用恢复、事件摄取和结果完成。旧 worker 不能在租约失效后更新新状态；客户端断开不取消任务。
5. **云资源**：[connector 契约](../../../../modules/sandboxes/connector.ts)与[注册表](../../../../integrations/sandboxes/registry.ts)提供创建、检查、文件、命令和私有访问。具体 Provider 差异留在 adapter，不把供应商分支散落到通用 Run 编排。
6. **Sandbox 进程**：[Runtime](../../../../runtime/server.py)监督 Harness 进程；[Harness 契约](../../../../modules/execution/harness.ts)定义安装、调用与结果。控制平面不执行上传的用户源码，Runtime 不持有云资源管理职责。
7. **外部 Tool**：[tool_bridge.py](../../../../runtime/tool_bridge.py)衔接调用，[broker.ts](../../../../modules/tools/broker.ts)处理授权、审批、派发与持久结果。原始账户凭据留在控制平面；不确定副作用进入[reconciliation.ts](../../../../modules/tools/reconciliation.ts)。
8. **完成与交付**：[Artifacts](../../../../modules/artifacts/artifacts.ts)保存交付文件；worker 检查实际结果和产物后推进终态。自然语言“已完成”不是执行成功证据。客户端查询持久结果，并单独关闭 Session 清理资源。

## 状态恢复从哪里看

- Run 和调用恢复：execution/worker 与 runs；不要重放已开始但结果未知的操作。
- 暂停、快照和资源删除：[lifecycle.ts](../../../../modules/sandboxes/lifecycle.ts)与[checkpoints.ts](../../../../modules/sandboxes/checkpoints.ts)。空闲、paused、closed 与云资源删除不是同一状态。
- 凭据访问：[access-server.ts](../../../../apps/control-plane/access-server.ts)和 modules/access；不能把原始 key 注入 env 作为兼容性回退。
- 存储升级：[migrate.ts](../../../../modules/storage/migrate.ts)与编号 SQL；不要修改已应用迁移去伪装新 schema。

## 如何选修改位置

| 改动 | 首先查看 | 同步检查 |
| --- | --- | --- |
| 新增 Sandbox | connector + integrations/sandboxes | 能力声明、未知创建、清理、双 SDK 旅程 |
| 新增 Harness | harness 契约 + modules/harnesses | 协议、Tools、native history、结果和取消 |
| 新增应用操作 | integrations/apps + ToolBroker | schema、权限、写审批、未知副作用 |
| 调整控制台交互 | apps/console | en/zh-CN、键盘、焦点、应用自有组件 |
| 调整公共字段 | server + 领域契约 + 两套 SDK | 类型、权限、示例与现有版本兼容 |
| 修改状态推进 | runs / worker / lifecycle | 事务、事件先持久化、租约 fence、恢复 |

阅读源码时完成一项不创建云资源的走查：找到 submit 路由、幂等键检查、worker 的调用持久化、Runtime 执行入口、Tool 派发边界和结果落库位置。能够说明各步失败后谁恢复、哪些动作不可盲重试，才算理解执行路径；仅能列目录不够。

本页基于当前文件结构与实现核对，不声称新增测试已通过。确定性验证与真实 Provider/模型验收分别记录，敏感资源标识留在本地私有证据。

下一步：[执行架构](../concepts/execution-architecture.md)、[能力与证据](../concepts/capabilities-and-evidence.md)、[故障对账](../operate/reconciliation.md)。
