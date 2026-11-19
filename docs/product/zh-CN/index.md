# Hexagon 产品文档

Hexagon 是可自托管的开源 Agent 控制平面。你的应用创建持续工作的 Session，在云 Sandbox 执行任务，读取持久事件，并获取结果和产物。例如上传 Web 项目，让 Agent 实现筛选功能，检查测试与预览，然后在同一工作区继续修改。

**[创建第一个 Session](start/first-session.md)** · [准备项目任务](build/project-context.md) · [English](../en/index.md)

## 看得见的完成结果

完成[安装](start/install.md)和连接配置后，首个教程直接创建 Session，保存 Agent 模板是可选的。下面片段摘自[完整 Python 程序](../../../examples/documentation/first-session.py)：

```python
session = client.create_session(
    harness={'id': 'pi', 'version': '1.5.2'},
    sandbox_connection_id=sandbox, model_connection_id=model,
)
```

完整程序保存提交幂等键及 Session、Run ID，提交任务、查询结果、下载产物，关闭 Session 后再次读取产物。上面片段不包含这些完整步骤；依赖、Python／TypeScript 运行方式与恢复说明见[教程](start/first-session.md)。

| 完成检查 | 查看什么 |
| --- | --- |
| 工作可识别 | 私有记录中返回的 Session 与 Run ID |
| 任务完成 | 持久查询的 Run 状态为 `completed`，有实际最终回复 |
| 产物可用 | 下载内容匹配 `Hello from Hexagon` |
| 生命周期收尾 | Session 为 `closed`，导出产物仍可下载 |

这些是教程要求的检查，不是伪造输出，也不代表本轮新执行了云任务。模型声称“完成”不能替代检查；云资源与模型使用由已配置账户计费。

## 选择下一项工作

| 目标 | 主要指南 |
| --- | --- |
| 将 Agent 执行接入业务后端 | [后端集成](build/backend-integration.md) |
| 给 Agent 项目文件并验证修改 | [项目文件与上下文](build/project-context.md) |
| 选择和管理不同执行组合 | [选择集成](integrations/choose.md) |

[完整项目任务教程](start/project-task.md)覆盖上传、固定测试、私有预览、第二轮修改和产物留存；新一轮双 SDK 实云验收仍待执行。[适用场景](start/use-cases.md)说明产品适合什么工作及其边界。

## 工作在哪里运行

```mermaid
flowchart LR
  A[你的应用 / SDK] --> C[控制平面]
  B[Console] --> C
  C --> S[云 Sandbox: Runtime + Harness]
  S -->|作用域受限的模型与 Tool 访问| C
  C --> M[模型端点]
  C --> T[外部 Tools]
```

控制平面管理 Session、Run、持久事件、凭据和云资源；Runtime 在云 Sandbox 内监督 Harness 进程。Provider、模型、Tool 的原始凭据留在控制平面，guest 获得作用域受限的访问。“Local”和“hosted”表示控制平面部署位置，不表示任务在本地或云端执行。详见[执行架构](concepts/execution-architecture.md)与[安全边界](concepts/security-boundaries.md)。

## 按职责进入

| 你正在做什么 | 从这里开始 | 随后阅读 |
| --- | --- | --- |
| 首次试用 | [安装](start/install.md) | [第一个 Session](start/first-session.md) → [发生了什么](start/what-happened.md) |
| 开发业务应用 | [后端集成](build/backend-integration.md) | [事件](build/stream-events.md)、[审批](build/approvals.md)、[恢复](build/recovery.md) |
| 维护部署 | [自托管](operate/self-host.md) | [网络](operate/networking.md)、[诊断](operate/observability.md)、[备份](operate/backup-restore.md) |
| 扩展项目 | [开发环境](contribute/development.md) | [代码地图](contribute/codebase.md)、[测试与证据](contribute/testing.md) |

编程 Agent 可使用[集成阅读指南](agents.md)。[完整目录](directory.md)收录已有文章，包括各 Provider、概念、扩展指南和参考入口。

## 核对能力和证据

先看 [Sandbox 能力](integrations/sandboxes.md)、[Harness 契约](integrations/harnesses.md)、[模型协议](integrations/model-protocols.md)，再查[带日期的已验证组合](integrations/verified-combinations.md)。完成注册、声明支持、真实执行证据是不同事实，不能保证所有交叉组合都成立。

客户端断开不取消 Run。不再使用的 Session 需要显式关闭；未知操作完成对账后才能确认清理。进度或清理不确定时阅读[故障排查](operate/troubleshooting.md)或[资源对账](operate/reconciliation.md)。

升级前阅读[更新记录](changelog.md)。产品文档仍在补齐与复核，[覆盖台账](../coverage.json)标记未完成内容。精确 API、SDK、配置参考尚在编写，目前可查[SDK 指南](../../../sdk/README.md)及其实现引用。仓库[发布策略](../../../release-policy.json)尚未批准发布，这些本地页面不代表已有公开托管或下载渠道。

[仓库 README](../../../README.zh-CN.md)
