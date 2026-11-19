# 能力声明、兼容性与验证证据

“支持”可能表示接口已实现、账户可连接、一次任务成功，或完整恢复旅程已验证。选择执行组合时必须知道这个词对应哪一种证据。

## 不同层次回答不同问题

| 信息 | 能回答 | 不能推出 |
| --- | --- | --- |
| adapter capability | 当前适配器声明实现该接口 | 你的账户、配额和网络可用 |
| 连接验证 | 指定配置通过该 adapter 的检查 | 所有操作均已执行；通用 HTTP 验证可能仅查结构 |
| Session preflight | 定义和已知能力相容 | 真实云创建、模型任务或未来资源一定成功 |
| 单轮真实执行 | 指定组合完成该次任务 | 多轮、审批、预览和休眠全部可用 |
| 双 SDK 完整旅程 | 两种客户端分别完成已记录步骤 | 任意版本、模型端点或并发负载都通过 |
| 故障 / 清理验证 | 特定失败分支按记录恢复 | 当前账户没有其他未决资源 |

## 能力有归属

Sandbox 声明云资源与网络能力；Harness 声明对话、Tools 和初始化能力；Tool adapter 参与审批能力。一个 adapter 不能替另一层授予能力。`required_capabilities` 只是请求条件，不是创建能力的开关。

例如 OCI recipe 可以构建，但所选 Provider 没有 `oci_image`，组合仍不支持。又如模型端点通过验证，不表示该 Harness 的所有 Tool calling 和 continuation 行为都已实际验证。

## 读懂矩阵

一条结果至少核对 Provider、Harness 版本或镜像 digest、模型端点和协议、SDK、任务范围、日期与清理结果。将 passed、failed、未执行和明确 unsupported 分开。未知结果保留 unknown；不能为了整齐把它归为成功或不存在。

历史矩阵证明当时的具体执行。当前 preflight 的 `verification` 保持 unverified，避免把历史通过自动认证到新配置。供应商账户、端点和部署状态发生变化时，需要新的验证。

## 如何建立你自己的证据

从已验证组合开始，保存任务与检查方法。先运行最小结果和清理，再测试实际需要的文件、Tools、审批、预览和恢复。两种 SDK 都是产品支持要求时，分别执行完整旅程。记录实际命令与观察，失败尝试也保留；私有资源 ID 留在本地证据，公开文档使用脱敏摘要。

依据：[组合解析](../../../../modules/execution/compatibility.ts)、[验收](../../../../testing/acceptance.md)、[执行矩阵](../../../../testing/execution-matrix.md)。下一步：[网络策略验证](../build/sandbox-policy.md)、[首个 Session](../start/first-session.md)。
