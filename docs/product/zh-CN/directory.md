# 文档完整目录

按当前工作选择栏目：开始使用完成首次任务，构建应用接入业务后端，集成选择兼容服务，概念解释行为，运维管理实例，参考查询术语与命令，贡献扩展项目。本目录列出已存在的草稿页面，不列尚未落地的路由。

## 开始使用

- [了解 Hexagon](start/overview.md)
- [适用场景](start/use-cases.md)
- [安装](start/install.md)
- [第一个 Session](start/first-session.md)
- [理解刚才发生的事](start/what-happened.md)

- [完成一个真实项目任务](start/project-task.md)

## 构建应用

- [接入后端](build/backend-integration.md)
- [文件与上下文](build/project-context.md)
- [连续多轮工作](build/multi-turn.md)
- [显示与恢复事件流](build/stream-events.md)
- [获取与保留产物](build/artifacts.md)
- [私有 Web 预览](build/private-preview.md)
- [Tools 与 MCP](build/tools.md)
- [授权与重新授权](build/tool-authorization.md)
- [人工审批](build/approvals.md)
- [空闲与自动唤醒](build/idle-and-wake.md)
- [断线、取消与恢复](build/recovery.md)
- [可复用 Agent 配置](build/agent-templates.md)
- [连接生命周期](build/connection-lifecycle.md)
- [资源与网络策略](build/sandbox-policy.md)

## 概念

- [Session / Run / Agent](concepts/sessions-runs-agents.md)
- [执行架构与责任边界](concepts/execution-architecture.md)
- [初始化、预检与配置固定](concepts/initialization.md)
- [持久事件与故障恢复](concepts/events-and-recovery.md)
- [数据持久化边界](concepts/persistence.md)
- [凭据与信任边界](concepts/security-boundaries.md)
- [能力与验证证据](concepts/capabilities-and-evidence.md)
- [Serverless 生命周期](concepts/serverless-lifecycle.md)

## 部署与运维

- [本地工作区](operate/local-workspace.md)
- [自托管](operate/self-host.md)
- [网络与凭据入口](operate/networking.md)
- [身份与 Token](operate/access-control.md)
- [凭据轮换](operate/credentials.md)
- [运行观察与诊断](operate/observability.md)
- [资源与工具对账](operate/reconciliation.md)
- [升级与迁移](operate/upgrades.md)
- [备份与恢复](operate/backup-restore.md)
- [容量、配额与成本](operate/capacity-and-cost.md)
- [按症状排查](operate/troubleshooting.md)

## 连接与兼容性

- [选择执行组合](integrations/choose.md)
- [连接模型端点](integrations/models.md)
- [模型协议兼容性](integrations/model-protocols.md)
- [选择 Harness](integrations/harnesses.md)
- [注册 OCI Harness](integrations/harnesses/oci.md)
- [兼容 source Harness 包](integrations/harnesses/source-package.md)
- [Sandbox 能力总览](integrations/sandboxes.md)
- [接入 E2B](integrations/sandboxes/e2b.md)
- [接入 Modal](integrations/sandboxes/modal.md)
- [接入 Blaxel](integrations/sandboxes/blaxel.md)
- [接入 Fly Sprites](integrations/sandboxes/fly-sprites.md)
- [接入 Upstash Box](integrations/sandboxes/upstash-box.md)
- [接入 Vercel Sandbox](integrations/sandboxes/vercel.md)
- [接入 Agent37](integrations/sandboxes/agent37.md)
- [接入 Boat](integrations/sandboxes/boat.md)
- [接入 Freestyle VMs](integrations/sandboxes/freestyle.md)
- [接入 Fly Machines](integrations/sandboxes/fly-machines.md)
- [接入 Instabox](integrations/sandboxes/instabox.md)
- [连接受保护的 HTTP API](integrations/http-tools.md)
- [连接 Remote MCP](integrations/mcp.md)
- [已验证的执行组合](integrations/verified-combinations.md)
- [连接应用账户](integrations/apps.md)

## 参考

- [HTTP API 参考](reference/http.md)

- [事件与状态](reference/events-and-states.md)

- [TypeScript SDK 参考](reference/typescript.md)

- [Python SDK 参考](reference/python.md)

- [配置与环境变量](reference/configuration.md)

- [错误码与处理建议](reference/errors.md)

- [限制与边界](reference/limits.md)

- [术语表](reference/glossary.md)
- [CLI 与本地管理命令](reference/cli.md)

## 贡献

- [代码地图与模块边界](contribute/codebase.md)
- [编写与翻译文档](contribute/documentation.md)
- [提案与贡献](contribute/proposals-and-prs.md)
- [开发环境与第一个改动](contribute/development.md)
- [测试与验收证据](contribute/testing.md)
- [添加 Sandbox 连接器](contribute/sandbox-connectors.md)
- [添加 Harness 适配器](contribute/harness-adapters.md)
- [添加 Tool 或应用连接器](contribute/tool-connectors.md)

[首页](index.md) · [Agent 指南](agents.md) · [更新记录](changelog.md)
