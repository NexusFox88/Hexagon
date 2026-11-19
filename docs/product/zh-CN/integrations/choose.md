# 选择执行组合

从任务需要的能力选择 Sandbox、Harness、模型协议和 Tools，再用预检检查结构兼容，最后用真实旅程验证。不要先按 Logo 随意组合，再把失败当作网络问题。

## 选择顺序

1. 明确任务：是否需要工具、对话继续、文件、预览、网络限制或休眠恢复。
2. 选择 Harness 的准确 id/version，确认工具、初始化和模型协议支持。
3. 确认你的模型端点提供所需协议及目标模型，配置并验证连接。
4. 选择能运行该 Harness 的 Sandbox；OCI、私有镜像、网络 allowlist 都有独立能力要求。
5. 绑定获准 Tools，明确必需 / 可选与审批策略。
6. 预检后创建 Session，执行任务、结果和清理验证。

可从 `client.catalog()` 读取当前注册项；Python 与 TypeScript 方法同名，TypeScript 需 await。目录是能力声明，不是实时账户健康或实云认证。

## 起步与替代路线

已有历史完整旅程包括 E2B / Pi 1.5.2 / SiliconFlow，以及 E2B / OpenCode 1.2.27 / SiliconFlow 的双 SDK 验证。参阅[精确历史记录](../../../../testing/execution-matrix.md)，同时核对端点、协议、任务范围和日期。这些是选择试验起点的证据，不代表你的当前账户和模型仍无需验证。

需要 OCI 镜像时，原生路线为 Modal 或 Fly Machines；E2B 另有通过 Session 自有 Template 准备公开 OCI 镜像的路线。构建、运行和模板清理需要分别核验，私有镜像能力另行检查。不要把内置 OpenCode 在某 Provider 成功推断成该 Provider 支持 OCI OpenCode。

需要固定网络 allowlist 时，选择明确声明对应能力的 Provider，并包含凭据通道主机。需要 serverless 时，另外查[休眠恢复矩阵](../../../../testing/evidence/2026-11-19-harness-serverless-matrix.json)，不能从普通执行成功外推。

## 常见拒绝含义

| 原因 | 修复方向 |
| --- | --- |
| unsupported_harness | 使用实际注册的准确版本 |
| incompatible_model | 更换匹配的协议连接或 Harness，不做隐式协议转换 |
| harness_tools_unsupported | 选择支持 Tools 的 Harness |
| sandbox_oci_image_unsupported | 选择有 OCI 能力的 Provider |
| sandbox_private_image_unsupported | 核对私有镜像路径与权限 |
| missing_capability | 对照需要的能力与各层声明 |
| network_policy_unsupported | 保留策略需求，选择能执行它的 Provider |
| connection_not_ready / tool_not_ready | 正确验证并启用所需连接 |

例如 Codex 的 `codex-v1` 使用 Responses；把它与 Messages 连接配对会被拒绝。不能靠把连接名称改成“OpenAI”来改变实际协议。

预检成功后仍可能遇到配额、实际模型行为、云网络和初始化问题。保留原请求和资源 ID，按[恢复指南](../build/recovery.md)处理。下一步：[模型配置](models.md)、[协议表](model-protocols.md)。依据：[组合解析](../../../../modules/execution/compatibility.ts)。
