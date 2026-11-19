# 理解模型协议兼容性

Hexagon 的模型连接 provider 表示请求协议，而不是供应商品牌。代理按允许路径转发，不在 Messages、Chat Completions 和 Responses 之间自动转换，也不在失败时猜测另一种协议。

| Connection provider | 请求接口 | 选择依据 |
| --- | --- | --- |
| anthropic-compatible | /v1/messages | 端点明确提供 Messages 契约 |
| openai-compatible | /v1/chat/completions | 端点提供 Chat Completions |
| openai-responses | /v1/responses | 端点提供 Responses |

## 当前 Harness 协议契约

| Harness / Runtime protocol | Messages | Chat Completions | Responses |
| --- | --- | --- | --- |
| 内置 Pi 1.5.2 / OpenCode 1.2.27 | 声明支持 | 声明支持 | 声明支持 |
| pi-v1 / opencode-v1 / openclaw-v1 | 声明支持 | 声明支持 | 声明支持 |
| codex-v1 | 不支持 | 不支持 | 声明支持 |
| hermes-v1 | 不支持 | 声明支持 | 不支持 |
| claude-code-v1 / deepseek-v1 / aider-v1 / hexagon-json-v1 | 声明支持 | 不支持 | 不支持 |

表格描述当前 Hexagon 适配器契约，不代表上游项目的全部能力，也不代表所有镜像和端点已实云验证。OCI 注册固定版本与兼容性元数据；已有注册不会因为适配器后来更新而自动扩展，按当前注册项核对，需要时注册新版本。

## 协议相同也要验证行为

完整任务依赖文本流、工具调用格式、工具结果、后续对话、错误形状和模型实际能力。只通过一条问候消息不证明 Tool calling 正常。同样，模型端点自称兼容不保证每个可选字段或运行模式都支持。

Responses 的当前验证请求使用 store:false。Hexagon 不据此承诺服务端内置工具、后台任务轮询、WebSocket 模式或其他 Responses 扩展。Harness 工具仍通过平台 Tool mailbox 和审批机制执行。

OpenCode / Pi 的部分 Responses 契约使用真实二进制与确定性端点测试；这证明对应协议分支，不是所有真实供应商账户认证。实云记录应包含精确模型端点、模型 ID、Harness 版本、SDK 与任务范围。

## 如何选择和定位错误

先核对账户端点提供的协议，再选 Harness 支持的交集。比如使用 codex-v1 时应配置真正的 Responses 端点；给 Messages URL 改一个 provider 名称不能完成转换。base URL 不附加最终操作路径，避免生成重复路径。

预检 incompatible_model 时检查协议类型而不是密钥；验证失败时再看实际网络、权限、模型 ID 和响应格式。修正后重新验证与启用，最后运行需要的真实旅程。

依据：[Runtime 协议表](../../../../modules/harnesses/protocols.ts)、[内置 Pi](../../../../integrations/harnesses/pi.ts)、[内置 OpenCode](../../../../integrations/harnesses/opencode.ts)。下一步：[模型配置](models.md)、[组合选择](choose.md)、[验证矩阵](../../../../testing/execution-matrix.md)。
