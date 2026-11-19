# 错误码与处理建议

先确定错误发生在 HTTP 请求、后台 Run、Tool 调用，还是本地命令。请求被接受后，Run 仍可能失败或等待；HTTP 成功不能证明云任务成功。下表是常见错误的处理索引，不是全部内部错误字符串的公开稳定承诺。

## HTTP 与 SDK 错误格式

```json
{"error":{"code":"invalid_request","fields":["harness","resources.timeout_seconds"]}}
```

这是说明格式的示例，不是执行日志。[HTTP handler](../../../../apps/control-plane/server.ts)将 Zod 校验失败转换为 400 `invalid_request` 和字段路径；ExecutionError 返回自己的状态码及 `error.code`。Fastify 的客户端请求错误变为对应 4xx 的 `invalid_http_request`，例如请求体过大；未分类异常返回 500 `internal_error`，不泄露数据库查询或上游异常。

缺失或无效身份返回 401 `unauthorized`。不能通过重试修复权限；核对部署 URL、Token 和角色。租户范围查不到的资源可返回 404，不透露它是否属于其他租户。

Python 与 TypeScript 的 `HexagonError` 均提供 `status`、`code`，普通请求在响应缺少结构化码时使用 `http_error`。SDK 不保留上述 `fields` 数组为异常属性。网络断开、超时、JSON 解析或本地发现错误不保证包装成 HexagonError；TypeScript 流打开失败使用 `event_stream_failed`，Python 流截断可能抛 ConnectionError。不要把所有异常都当作服务端已拒绝请求。实现见 [Python](../../../../sdk/python/hexagon/__init__.py)、[TypeScript](../../../../sdk/typescript/index.ts)。

## 按阶段处理

“HTTP”列记录对应 ExecutionError 分支的状态；后台 worker 路径也可能把该错误记录到 Run 或事件中，而不是直接作为当前客户端响应。源码链接标识真实分支，不能据此推断该分支本轮已测试通过。

| 错误码 | HTTP | 阶段 | 下一步与资源影响 | 来源 |
| --- | --- | --- | --- | --- |
| `invalid_submission` | 400 | 提交 | 修正空白输入或 key，不原样重试。 | [runs.ts](../../../../modules/execution/runs.ts) |
| `idempotency_conflict` | 409 | 提交 | 已有原请求，比对 input/origin，恢复原意图，不换新 key。 | [runs.ts](../../../../modules/execution/runs.ts) |
| `session_busy` | 409 | 提交 | 已有活动 Run，先观察，由应用保留后续消息。 | [lifecycle.ts](../../../../modules/sandboxes/lifecycle.ts) |
| `session_closed` | 409 | 提交 | 查询当前 Session 状态，确需新上下文时再创建。 | [lifecycle.ts](../../../../modules/sandboxes/lifecycle.ts) |
| `sandbox_expired` | 409 | 提交 | 新任务前检查原资源清理。 | [lifecycle.ts](../../../../modules/sandboxes/lifecycle.ts) |
| `connection_not_ready` | 409 | 提交 | 验证并启用所选连接，旧资源可能仍存在。 | [lifecycle.ts](../../../../modules/sandboxes/lifecycle.ts) |
| `context_file_missing` | 409 | 提交 | 先向同一 Session 上传被引用文件。 | [runs.ts](../../../../modules/execution/runs.ts) |
| `context_file_changed` | 409 | 提交 | 比对固定 SHA-256 与上传字节，不忽略差异。 | [runs.ts](../../../../modules/execution/runs.ts) |
| `context_file_encoding` | 400 | 提交 | 提供不含 NUL 的有效 UTF-8。 | [runs.ts](../../../../modules/execution/runs.ts) |
| `context_file_too_large` | 413 | 提交 | 缩小引用背景文本，见限制参考。 | [runs.ts](../../../../modules/execution/runs.ts) |
| `input_too_large` | 413 | 提交 | 缩小 input 与编译背景的合计字节。 | [runs.ts](../../../../modules/execution/runs.ts) |
| `initialization_too_large` | 413 | 初始化 | 缩小序列化或编译后的初始化内容。 | [initialization.ts](../../../../modules/execution/initialization.ts) |
| `upload_too_large` | 413 | 上传 | 缩小解码总量或分批，单文件限制仍生效。 | [inputs.ts](../../../../modules/execution/inputs.ts) |
| `connection_changed_during_validation` | 409 | 连接验证 | 读取当前配置，重新验证当前版本。 | [connections.ts](../../../../modules/connections/connections.ts) |
| `connection_in_use` | 409 | 删除连接 | 检查依赖 Session 或定义，处理依赖时保留清理访问。 | [connections.ts](../../../../modules/connections/connections.ts) |
| `harness_version_conflict` | 409 | 注册 | 复用相同定义，或明确注册新的不可变版本。 | [images.ts](../../../../modules/harnesses/images.ts) |
| `preview_session_unavailable` | 409 | 预览 | 检查 Session 和资源状态，预览不可用不等于 Run 失败。 | [previews.ts](../../../../modules/sandboxes/previews.ts) |
| `preview_unauthorized` | 401 | 访问预览 | 检查授权过期、撤销和访问权限，不记录含授权的 URL。 | [previews.ts](../../../../modules/sandboxes/previews.ts) |
| `tool_call_conflict` | 409 | Tool 调用或对账 | 比对调用身份、参数和精确 hash，不修改证据强行通过。 | [broker.ts](../../../../modules/tools/broker.ts) |
| `tool_call_in_flight` | 409 | Tool 对账 | 等待 broker 锁释放后重新查询，不并发强行对账。 | [reconciliation.ts](../../../../modules/tools/reconciliation.ts) |
| `tool_outcome_not_unknown` | 409 | Tool 对账 | 读取当前调用状态，resolve 只处理未知结果。 | [reconciliation.ts](../../../../modules/tools/reconciliation.ts) |
| `tool_resolution_conflict` | 409 | Tool 对账 | 已有不同结论，检查记录，不覆盖。 | [reconciliation.ts](../../../../modules/tools/reconciliation.ts) |
| `tool_authorization_not_pending` | 409 | 拒绝授权 | 重新查询原调用，其授权等待状态已经变化。 | [reconciliation.ts](../../../../modules/tools/reconciliation.ts) |
| `tool_run_not_active` | 409 | Tool 决定 | 不要恢复已终止或取消中的工作，检查已记录副作用。 | [broker.ts](../../../../modules/tools/broker.ts) |
| `tool_account_changed` | 409 | Tool 执行 | 核对账户身份与固定绑定，不静默切换账户。 | [broker.ts](../../../../modules/tools/broker.ts) |
| `mcp_schema_changed` | 409 | Tool 执行 | 重新验证发现结果，必要时选择新的兼容绑定或 Session。 | [broker.ts](../../../../modules/tools/broker.ts) |
| `tool_operation_unavailable` | 400 | Tool 执行 | 检查选定和固定操作目录，不自动扩大权限。 | [broker.ts](../../../../modules/tools/broker.ts) |
| `lease_lost` | 409 | worker 更新 | 执行权限已过期，由当前持有者恢复，不强行重复调用。 | [artifacts.ts](../../../../modules/artifacts/artifacts.ts) |
| `invalid_artifact_manifest` | 400 | 产物捕获 | 检查重名和总量，捕获失败不撤销任务。 | [artifacts.ts](../../../../modules/artifacts/artifacts.ts) |
| `artifact_integrity_failed` | 400 | 产物捕获 | 核对大小、规范 Base64 与 SHA-256，不交付损坏内容。 | [artifacts.ts](../../../../modules/artifacts/artifacts.ts) |
| `artifact_conflict` | 409 | 产物捕获 | 同一 Run/name 已有不同字节，保留并调查。 | [artifacts.ts](../../../../modules/artifacts/artifacts.ts) |

## 预检原因不是另一套重试指令

[组合预检](../../../../modules/execution/compatibility.ts)返回 `compatibility.reasons`，包括 `incompatible_model`、`harness_tools_unsupported`、`sandbox_oci_image_unsupported`、`sandbox_private_image_unsupported`、`harness_initialization_unsupported`、`missing_capability`、`network_policy_unsupported`、`credential_proxy_not_allowed_by_network_policy`。它们是能力不匹配原因，不应一律解释成相同 HTTP 响应或远程分配失败。修正组合或明确调整用户要求；不能把 allowlist 静默改为 unrestricted。

## 重试之前确认原操作

- 查询或事件流的传输故障：有界退避，重连同一 Run 与已提交游标，认证错误先修正身份。
- Run 提交响应丢失：用同一 Session、input、origin、幂等键恢复原提交，不生成新键。
- Session 或云资源创建响应丢失：保留意图、原 ID 和时间，查询原对象及操作，不假设有 Run 提交同样的幂等契约。
- Tool 写入结果未知：检查调用、request hash 和固定执行策略，核实上游结果后 resolve，不重发写入。
- 关闭或删除未确认：保留资源与删除回执，对账原操作；停止服务或没有列表结果并不普遍证明清理完成。

资源可能已存在、写入可能已生效。`internal_error` 或客户端超时都不能保证“没有发生任何事情”。参考[恢复](../build/recovery.md)与[对账](../operate/reconciliation.md)。

## 未分类错误与本地命令

记录发生时间、请求方法和去除秘密的路径、HTTP 状态、结构化码、应用关联 ID，以及私有 Session/Run/操作标识。查询持久 Run、Tool call 和资源操作状态，再导出[诊断](../operate/observability.md)。不要记录 Authorization、带访问授权的预览 URL、原始凭据或完整用户输入。

本地启动器、依赖探测、Provider SDK 和部分 Runtime 错误仍可能是文本或普通异常，没有统一 HTTP 码。按 [CLI](cli.md)及对应集成页处理，不能为它们臆造 API code。源码或证据仍不明确时保留未知状态，并报告已观察事实与未验证部分。

本页通过错误分支和 SDK 源码核对，未在本轮触发故障注入。下一步：[按症状排查](../operate/troubleshooting.md)、[限制](limits.md)、[恢复](../build/recovery.md)。
