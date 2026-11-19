# Sessions HTTP 契约

Session 固定工作配置并承载连续的 Runs。创建 Session 不会提交任务，也不证明云 Sandbox 能够执行任务。本文说明创建、检查、初始文件和生命周期操作的源码契约。路径均包含 `/v1`；示例假定使用可信后端 Token，`HEXAGON_API_URL` 为不带该前缀的控制平面 origin。

## 创建与预检

| 操作 | 成功响应 | 效果 |
| --- | --- | --- |
| `POST /v1/sessions/preflight` | 200，就绪对象 | 校验定义与绑定，不插入 Session，不创建其 Sandbox |
| `POST /v1/sessions` | 201，Session 对象 | 保存固定配置、环境和绑定；通过单独提交 Run 开始执行 |

两者接受相同的严格 JSON 请求体，允许 owner 和应用 Token。预检也会调用已配置的凭据入口就绪处理，并检查租户内的连接状态、Secret 和兼容性。它不是纯离线 schema 校验、容量预留、模型推理或云执行证明。预检成功不代表检查后的配置不会再发生变化。

### 请求字段

| 字段 | 要求与默认值 |
| --- | --- |
| `harness` | 直接 Session 使用严格对象 `{id: string, version: string}`，精确组合必须存在于当前租户目录 |
| `agent_id` | 可选的已保存 Agent UUID；与 harness 必须且只能提供一个 |
| `agent_revision` | 正整数，只能与 agent_id 使用；省略时取创建当时的当前 revision |
| `sandbox_connection_id` | 必填 UUID，租户拥有的 Sandbox 连接 |
| `model_connection_id` | 必填 UUID，租户拥有的模型连接 |
| `name` | 直接 Session 的可选名称，1–200 字符，默认 `Session` |
| `resources` | 可选严格对象；idle_timeout_seconds 为 15–3600 整数，默认 60；timeout_seconds 为 60–3600 整数，默认 600 |
| `network` | 可选严格对象；mode 为 unrestricted（默认）或 allowlist；allowed_hosts 默认空数组，各项为非空字符串 |
| `required_capabilities` | 可选字符串数组，默认不额外要求 capability |
| `tools` | 名称到 Tool 连接 UUID 的映射，默认 `{}`；直接 Session 的名称匹配 `^[a-z][a-z0-9_]*$` |
| `optional_tools` | tools 中的名称数组，默认空数组，仅直接 Session 使用 |
| `connections` | 受保护 API 别名到 HTTP 连接 UUID 的映射，默认 `{}`；别名匹配 `^[a-z][a-z0-9_]{0,63}$` |
| `variables` | 可选环境变量名称到字符串的映射，推荐使用 |
| `env` | 旧环境字段，默认 `{}`；非空 env 与 variables 同时出现会被拒绝 |
| `identity`、`instructions`、`context` | 直接 Session 的可选行为字段，见下文 |

使用已保存 Agent 时，不能覆盖 identity、instructions、context、name、resources、network、required_capabilities，也不能提供非空 optional_tools。仍需明确提供 Sandbox、模型 ID 和所需 Tool 绑定，不要假定此接口自动补齐 Agent 保存的绑定。环境变量覆盖 Agent 的默认值。已归档 Agent 不能创建新 Session，即使指定旧 revision。

所有声明的 Tool 都需要绑定，包括 optional-at-start Tool。“可选”表示可延后就绪，不代表可以省略绑定。Sandbox、模型和受保护 HTTP 连接必须启用且 ready；所有连接都要属于当前租户并具有正确 kind。已保存 Agent 会拒绝未声明的 Tool 名称或缺少的声明绑定。

### 初始化与环境

| 字段 | 形状与限制 |
| --- | --- |
| `identity` | 严格对象：必填非空 name ≤200；可选 description ≤4000、role ≤2000 |
| `instructions` | 字符串 ≤32,768 字符 |
| `context` | 严格对象：可选 text ≤32,768、可选 files，documents 默认空数组 |
| `context.files` | 最多 8 个严格 `{path, sha256}` 对象；相对路径 ≤500 字符，SHA-256 为 64 位小写十六进制 |
| `context.documents` | 最多 8 个严格 `{name, text}` 对象；非空 name ≤200，text ≤16,384 |

行为文本不能含 NUL。文件路径不能为绝对路径，不能包含反斜线、空段、`.` 或 `..`。行为 JSON 和编译后的初始化另有 65,536 字节限制。Identity 是行为指导，不是认证身份。文件引用描述初始上传内容；存在性、哈希和有效文本在提交 Run 时检查，预检不证明文件已经上传。

环境变量名称匹配 `^[A-Za-z_][A-Za-z0-9_]{0,127}$`。保留名称包括 `HEXAGON_`、`OPENCODE_`、`PI_` 前缀，以及 `PORT`、`NODE_OPTIONS`、`PYTHONPATH`、`PYTHONHOME`、`LD_PRELOAD`、`LD_LIBRARY_PATH`。值为最多 16,384 字符且不含 NUL 的字符串；最多 64 项，序列化 JSON 不超过 65,536 UTF-8 字节。普通环境值对 Agent 进程可读，不提供受保护 Provider/模型凭据的边界。参见[配置](configuration.md)和[凭据边界](../concepts/security-boundaries.md)。

### 请求示例

保存为 `session-request.json`，将两个示例 UUID 替换为已验证的连接 ID。这些 UUID 是占位符，不是已创建资源：

```json
{
  "harness": {"id": "pi", "version": "1.5.2"},
  "sandbox_connection_id": "00000000-0000-4000-8000-000000000001",
  "model_connection_id": "00000000-0000-4000-8000-000000000002",
  "name": "Project review",
  "resources": {"idle_timeout_seconds": 60, "timeout_seconds": 600},
  "instructions": "Explain changes and report actual test results."
}
```

先预检，再明确使用保存的相同请求体创建：

```sh
curl --fail-with-body --silent --show-error \
  -H "Authorization: Bearer $HEXAGON_API_TOKEN" -H 'Content-Type: application/json' \
  --data-binary @session-request.json "$HEXAGON_API_URL/v1/sessions/preflight"
```

```sh
curl --fail-with-body --silent --show-error \
  -H "Authorization: Bearer $HEXAGON_API_TOKEN" -H 'Content-Type: application/json' \
  --data-binary @session-request.json "$HEXAGON_API_URL/v1/sessions"
```

创建 Session 不具有 Run 提交的幂等保证。响应丢失后先调查原创建，不要立即重试。保存返回的 Session ID，然后上传初始文件并[提交 Run](runs.md)。

### 响应形状

预检返回 `ready:true`、`combination`、`readiness:{status:"ready",checked_at}`、`lifecycle` 和 `connections`。失败使用错误响应，不返回 `{ready:false}`。Combination 是解析后的能力与协议契约，不是执行测量结果。

Lifecycle 包含 mode（serverless/provider_managed/retained）、preservation（filesystem/memory/provider_managed/none）、`automatic_wake:true` 和实际 idle_timeout_seconds，后者最大为 timeout 减十秒。Connections 将 model 和受保护 API 别名映射到 implementation、`raw_secret_in_sandbox:false`、delegated_token_in_sandbox。声明 native credential auth 时 implementation 为 external_proxy_with_native_auth，否则为 external_proxy。此映射不是 Tool 就绪状态列表。

创建返回 id、可空 agent_id/agent_revision、definition、env_names、state、可空 sandbox、created_at、updated_at，不返回环境变量值。Definition 包含有效行为/资源/网络配置、解析后的 capabilities/combination、可选初始化摘要与 OCI 镜像、固定的连接配置和版本、tool_bindings、protected_api_bindings、`message_policy:"reject_if_busy"`、lifecycle 和凭据边界。嵌套 Provider 字段是随版本演进的元数据，不是跨 Provider 通用 Sandbox schema。

## 检查 Session 与初始化

`GET /v1/sessions/{id}` 返回 **200**，包含以上 Session 字段并增加 pause_scope。State 为 open、pausing、paused、resuming、closing、closed；sandbox 是可空的 Provider 资源描述。Session 存在或 open 不证明 Harness 进程存活。Owner 和应用 Token 都可读取。资源不存在或属于其他租户时返回 `404 session_not_found`。

```sh
curl --fail-with-body --silent --show-error \
  -H "Authorization: Bearer $HEXAGON_API_TOKEN" \
  "$HEXAGON_API_URL/v1/sessions/$HEXAGON_SESSION_ID"
```

`GET /v1/sessions/{id}/initialization` 返回 **200**，包含 schema_version:1、session_id、created_at、source:{kind,agent_id,agent_revision}、definition、environment:{names,values_redacted:true}。Kind 为 direct 或 agent。它读取历史有效快照，不重新解析最新 Agent 定义或连接版本。

```sh
curl --fail-with-body --silent --show-error \
  -H "Authorization: Bearer $HEXAGON_API_TOKEN" \
  "$HEXAGON_API_URL/v1/sessions/$HEXAGON_SESSION_ID/initialization"
```

## 上传与列出初始文件

`POST /v1/sessions/{id}/files` 允许 owner 和应用 Token，返回 **200** 与 `{files:[{path,sha256,size}]}`，只包含本次请求上传的文件。请求体为严格 `{files:[{path,content_base64}]}`。一次 1–100 项，相对路径唯一、最长 500 字符，并符合上面的路径限制。Base64 使用 schema 规定的带填充编码字母表，每项最多 2,097,152 字符；本次请求解码后的总大小最多 8 MiB。编码与解码大小的区别见[限制](limits.md)。

允许上传时，同路径文件替换已保存初始输入，其他路径不变。必须是 open Session，且没有提交过 Run，也没有已分配 Sandbox；接口不能修改运行中的工作区。即使第一个 Run 已取消，也不能重新打开初始上传窗口。启用 initialization 时，`SOUL.md` 为保留路径。

将以下内容保存为 `files-request.json`，示例文件内容为 `hello`：

```json
{"files":[{"path":"notes.txt","content_base64":"aGVsbG8="}]}
```

```sh
curl --fail-with-body --silent --show-error \
  -H "Authorization: Bearer $HEXAGON_API_TOKEN" -H 'Content-Type: application/json' \
  --data-binary @files-request.json \
  "$HEXAGON_API_URL/v1/sessions/$HEXAGON_SESSION_ID/files"
```

相同路径的 GET 返回 **200**，`{files:[{path,sha256,size}]}` 按路径排列。它列出保存的初始输入元数据，不返回文件内容或当前被 Agent 修改后的工作区。上传响应丢失时可核对这些哈希。

```sh
curl --fail-with-body --silent --show-error \
  -H "Authorization: Bearer $HEXAGON_API_TOKEN" \
  "$HEXAGON_API_URL/v1/sessions/$HEXAGON_SESSION_ID/files"
```

上传专有错误包括 `400 duplicate_input_path`、`400 reserved_initialization_path`、`413 upload_too_large`、`409 workspace_already_started`、`409 session_closed`；请求结构无效为 `400 invalid_request`。Session 不存在或属于其他租户为 404。结构校验可能先于资源查找失败。

## 暂停、恢复与关闭

配置 lifecycle 服务时才注册这些路由。暂停和恢复要求 owner Token；关闭也允许应用 Token。均为租户范围内的 POST 操作。

| `/v1/sessions/{id}` 后的路径 | 请求体 | 成功响应 |
| --- | --- | --- |
| `/pause` | 可选严格 `{scope:"session"}` 或 `{scope:"sandbox"}`，默认 session | 200，state/scope，完成转换时附计算与待机标志 |
| `/resume` | 无必需请求体 | 200，state/scope，可能附计算与待机标志 |
| `/close` | 无必需请求体 | 确认清理后返回 200、`{state:"closed"}` |

```sh
curl --fail-with-body --silent --show-error --request POST \
  -H "Authorization: Bearer $HEXAGON_API_TOKEN" -H 'Content-Type: application/json' \
  --data '{"scope":"sandbox"}' \
  "$HEXAGON_API_URL/v1/sessions/$HEXAGON_SESSION_ID/pause"
```

```sh
curl --fail-with-body --silent --show-error --request POST \
  -H "Authorization: Bearer $HEXAGON_API_TOKEN" \
  "$HEXAGON_API_URL/v1/sessions/$HEXAGON_SESSION_ID/resume"
```

逻辑 scope=session 不证明计算停止。Scope=sandbox 依赖 Provider 能力，Provider 管理的待机另行报告。完成转换时可能包含 compute_paused 和 provider_managed_standby，已经在目标状态时重复调用可能只返回 state/scope，不能把缺少字段理解为完整的新检查。暂停要求没有非终态 Run；转换或 scope 冲突分别返回 session_transition_pending 或 session_pause_scope_conflict，不支持原生暂停为 sandbox_pause_unsupported，均为 409。Closing/closed 拒绝暂停和恢复。提交 Run 可以自动唤醒暂停的 Session，不必每次先显式 resume。

```sh
curl --fail-with-body --silent --show-error --request POST \
  -H "Authorization: Bearer $HEXAGON_API_TOKEN" \
  "$HEXAGON_API_URL/v1/sessions/$HEXAGON_SESSION_ID/close"
```

显式关闭遇到非终态 Run 返回 `409 session_busy`，应先取消并观察终态。Close 先保存意图，再对账其拥有的资源，之后才确认关闭。Sandbox creation/checkpoint/deletion unconfirmed 错误需要检查资源操作；超时或错误不证明资源已不存在。对原 Session 重复 close 会对账原资源，已关闭时返回 `{state:"closed"}`。导出产物和历史 Runs 仍可访问，预览授权失效。参见[资源对账](../operate/reconciliation.md)。

## 创建错误与相关操作

严格 schema 校验失败返回 `400 invalid_request`。常见领域错误包括 `404 agent_not_found`、`404 agent_revision_not_found`、`409 agent_archived`、`404 connection_not_found`、`400 connection_kind_mismatch`、`409 connection_not_ready`、`409 tool_not_ready`、`400 missing_tool_binding`、`400 undeclared_tool_binding`、`400 ambiguous_variables`、`413 initialization_too_large`。Harness、模型、网络或能力不兼容时返回对应 reason，状态码 400；凭据入口就绪也可能先于定义校验失败。不要将所有错误归因于云配额，参见[错误参考](errors.md)。

本文不替代仍需展开的其他接口参考：租户 Session 列表/活动、敏感环境值读取、当前授权、Session 内连接撤销、访问与预览授权。权限见 [HTTP 总览](http.md)，行为说明见[连接生命周期](../build/connection-lifecycle.md)、[私有预览](../build/private-preview.md)和[初始化](../concepts/initialization.md)。

来源：[Session schema 与操作](../../../../modules/execution/sessions.ts)、[初始化](../../../../modules/execution/initialization.ts)、[环境](../../../../modules/execution/environment.ts)、[初始文件](../../../../modules/execution/inputs.ts)、[生命周期](../../../../modules/sandboxes/lifecycle.ts)、[HTTP 路由](../../../../apps/control-plane/server.ts)。示例经过源码审阅，不宣称本轮执行了 HTTP 或云任务。
