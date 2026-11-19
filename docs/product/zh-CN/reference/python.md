# Python SDK 参考

当前软件包名为 `hexagon-agent-sdk`，版本 `0.1.0`，导入名为 `hexagon`，要求 Python 3.10+。在确认公开分发可用之前，从当前 checkout 安装：

```sh
python3 -m venv .venv
. .venv/bin/activate
python3 -m pip install ./sdk/python
```

客户端使用同步标准库 HTTP，不是异步客户端；调用与事件迭代会阻塞当前线程。软件包版本不能区分全部开发快照，应记录安装产物及服务端 revision。参见[包元数据](../../../../sdk/python/pyproject.toml)。

## 客户端与身份

```python
import os
from hexagon import Hexagon, HexagonError

# 已启动本地控制平面，通过私有工作区文件发现身份。
client = Hexagon.local()

# 远程控制平面的替代方式，仅在受信任后端使用。
# client = Hexagon(os.environ['HEXAGON_API_URL'],
#                  os.environ['HEXAGON_API_TOKEN'], timeout=90)
```

`base_url` 不包含 `/v1`，客户端会追加该前缀。构造函数不发请求验证凭据。`timeout` 默认 90 秒，用于 HTTP 操作及读取，不是 Run 执行期限。

`local(data_directory=None, base_url=None, timeout=90)` 读取本地发现和 owner 文件。显式数据目录选择该工作区，否则查找工作区及配置的或用户级描述文件。可选 base_url 用于核对端点一致性，不会把 local 转成远程认证。私有文件和回环检查可能在请求前失败，见 [local.py](../../../../sdk/python/hexagon/local.py)。local 请求禁止重定向；显式客户端采用 urllib 默认重定向行为，因此应配置真实可信 origin，不依赖跳转。

没有客户端级无参数 close 或异步上下文管理器。`client.close(session_id)` 关闭 Session 并执行资源生命周期，不是释放 HTTP 客户端。普通响应内部使用上下文管理器；保留了部分消费的生成器时应显式关闭它，但停止观察不取消 Run。

## 公共方法清单

下表从 Python AST 提取真实签名和请求表达式，保留 keyword-only 参数与默认值。路径显示 SDK 表达式，其中 `{...}` 是实现插入并编码的值。除构造函数、二进制下载、事件生成器和 HTTP 204 外，返回值是直接解析的 JSON（通常为 dict），不会转换成模型对象。列表 envelope 原样保留，例如 `events()['events']`、`artifacts()['artifacts']`，不自动翻页。

<!-- python-methods:begin -->

| 签名（省略 self/cls） | HTTP 映射／返回方式 |
| --- | --- |
| `local(*, data_directory=None, base_url=None, timeout=90)` | Local discovery → Hexagon instance / 本地发现 |
| `__init__(base_url, token, timeout=90)` | Hexagon instance; no HTTP request / 无请求 |
| `request(method, path, body=None, headers=None)` | JSON-decoded value; 204 → None |
| `create_preview(session_id, port, ttl_seconds=600)` | `POST` `f"/sessions/{quote(session_id, safe='')}/previews"` |
| `revoke_preview(preview_id)` | `DELETE` `f"/previews/{quote(preview_id, safe='')}"` |
| `register_harness(*, image, **configuration)` | `POST` `'/harnesses'` |
| `register_harness_package(**package)` | `POST` `'/harness-packages'` |
| `catalog()` | `GET` `'/catalog'` |
| `applications()` | `GET` `'/applications'` |
| `configure_application_oauth(provider, **configuration)` | `PUT` `f"/applications/{quote(provider, safe='')}/oauth-client"` |
| `authorize_connection(connection_id)` | `POST` `f"/connections/{quote(connection_id, safe='')}/authorize"` |
| `authorization_flow(flow_id)` | `GET` `f"/authorization-flows/{quote(flow_id, safe='')}"` |
| `cancel_authorization(flow_id)` | `DELETE` `f"/authorization-flows/{quote(flow_id, safe='')}"` |
| `create_secret(*, name, value)` | `POST` `'/secrets'` |
| `session_environment(session_id)` | `GET` `f"/sessions/{quote(session_id, safe='')}/environment"` |
| `session_authorization(session_id)` | `GET` `f"/sessions/{quote(session_id, safe='')}/authorization"` |
| `revoke_session_connection(session_id, connection_id)` | `DELETE` `f"/sessions/{quote(session_id, safe='')}/connections/{quote(connection_id, safe='')}"` |
| `list_secrets()` | `GET` `'/secrets'` |
| `secret(secret_id)` | `GET` `f"/secrets/{quote(secret_id, safe='')}"` |
| `update_secret(secret_id, **changes)` | `PATCH` `f"/secrets/{quote(secret_id, safe='')}"` |
| `delete_secret(secret_id)` | `DELETE` `f"/secrets/{quote(secret_id, safe='')}"` |
| `create_access(session, connection_id)` | `POST` `f"/sessions/{quote(session, safe='')}/access"` |
| `list_access(session)` | `GET` `f"/sessions/{quote(session, safe='')}/access"` |
| `revoke_access(grant_id)` | `DELETE` `f"/access/{quote(grant_id, safe='')}"` |
| `overview()` | `GET` `'/overview'` |
| `list_sessions(**query)` | `GET` `'/sessions?' + urlencode(query)` |
| `list_runs(**query)` | `GET` `'/runs?' + urlencode(query)` |
| `pending(limit=25, offset=0)` | `GET` `f'/pending?limit={limit}&offset={offset}'` |
| `approvals(run_id)` | `GET` `f"/runs/{quote(run_id, safe='')}/approvals"` |
| `connection_dependencies(connection_id)` | `GET` `f"/connections/{quote(connection_id, safe='')}/dependencies"` |
| `list_tokens()` | `GET` `'/tokens'` |
| `create_token(label, expires_in_days=30)` | `POST` `'/tokens'` |
| `rotate_token(token_id)` | `POST` `f"/tokens/{quote(token_id, safe='')}/rotate"` |
| `revoke_token(token_id)` | `DELETE` `f"/tokens/{quote(token_id, safe='')}"` |
| `deployment()` | `GET` `'/deployment'` |
| `update_deployment(config, expected_revision)` | `PUT` `'/deployment'` |
| `retry_ingress()` | `POST` `'/deployment/ingress/retry'` |
| `resource_operations(limit=50, offset=0)` | `GET` `f'/resource-operations?limit={limit}&offset={offset}'` |
| `resource_operation(operation_id)` | `GET` `f"/resource-operations/{quote(operation_id, safe='')}"` |
| `review_resource_operation(operation_id, action, note='')` | `POST` `f"/resource-operations/{quote(operation_id, safe='')}/review"` |
| `list_agents()` | `GET` `'/agents'` |
| `agent(agent_id)` | `GET` `f"/agents/{quote(agent_id, safe='')}"` |
| `revise_agent(agent_id, definition, expected_revision)` | `PUT` `f"/agents/{quote(agent_id, safe='')}"` |
| `archive_agent(agent_id)` | `POST` `f"/agents/{quote(agent_id, safe='')}/archive"` |
| `copy_agent(agent_id, name)` | `POST` `f"/agents/{quote(agent_id, safe='')}/copy"` |
| `preflight_agent(definition, bindings)` | `POST` `'/agents/preflight'` |
| `preflight_session(**definition)` | `POST` `'/sessions/preflight'` |
| `list_connections()` | `GET` `'/connections'` |
| `connection(connection_id)` | `GET` `f"/connections/{quote(connection_id, safe='')}"` |
| `create_connection(**definition)` | `POST` `'/connections'` |
| `discover_mcp_tools(connection_id)` | `POST` `f"/connections/{quote(connection_id, safe='')}/discover-mcp"` |
| `connection_authorization(connection_id)` | `GET` `f"/connections/{quote(connection_id, safe='')}/authorization"` |
| `disconnect_connection(connection_id)` | `POST` `f"/connections/{quote(connection_id, safe='')}/disconnect"` |
| `validate_connection(connection_id)` | `POST` `f"/connections/{quote(connection_id, safe='')}/validate"` |
| `update_connection(connection_id, **changes)` | `PATCH` `f"/connections/{quote(connection_id, safe='')}"` |
| `delete_connection(connection_id)` | `DELETE` `f"/connections/{quote(connection_id, safe='')}"` |
| `create_agent(*, env=None, **definition)` | `POST` `'/agents'` |
| `create_session(*, env=None, **definition)` | `POST` `'/sessions'` |
| `session_initialization(session_id)` | `GET` `f"/sessions/{quote(session_id, safe='')}/initialization"` |
| `session(session_id)` | `GET` `f"/sessions/{quote(session_id, safe='')}"` |
| `upload(session_id, files)` | `POST` `f"/sessions/{quote(session_id, safe='')}/files"` |
| `submit(session_id, text, idempotency_key, *, origin=None)` | `POST` `f"/sessions/{quote(session_id, safe='')}/runs"` |
| `run(run_id)` | `GET` `f"/runs/{quote(run_id, safe='')}"` |
| `tool_calls(run_id)` | `GET` `f"/runs/{quote(run_id, safe='')}/tool-calls"` |
| `deny_tool_authorization(run_id, call_id, request_hash)` | `POST` `f"/runs/{quote(run_id, safe='')}/tool-calls/{quote(call_id, safe='')}/deny-authorization"` |
| `resolve_tool_call(run_id, call_id, **resolution)` | `POST` `f"/runs/{quote(run_id, safe='')}/tool-calls/{quote(call_id, safe='')}/resolve"` |
| `cancel(run_id)` | `POST` `f"/runs/{quote(run_id, safe='')}/cancel"` |
| `pause(session_id, scope='session')` | `POST` `f"/sessions/{quote(session_id, safe='')}/pause"` |
| `resume(session_id)` | `POST` `f"/sessions/{quote(session_id, safe='')}/resume"` |
| `session_activity(period='24h')` | `GET` `f'/sessions/activity?period={period}'` |
| `close(session_id)` | `POST` `f"/sessions/{quote(session_id, safe='')}/close"` |
| `decide(approval_id, approved)` | `POST` `f"/approvals/{quote(approval_id, safe='')}/decision"` |
| `events(run_id, after='0')` | `GET` `f"/runs/{quote(run_id, safe='')}/events?after={quote(str(after), safe='')}"` |
| `artifacts(run_id)` | `GET` `f"/runs/{quote(run_id, safe='')}/artifacts"` |
| `download_artifact(artifact_id)` | `GET` `f"/artifacts/{quote(artifact_id, safe='')}/content"`; bytes |
| `stream(run_id, after='0')` | `GET` `f"/runs/{quote(run_id, safe='')}/stream?after={quote(str(after), safe='')}"`; generator[dict] |

<!-- python-methods:end -->

使用 `python3 tooling/generate-python-doc-index.py` 重新生成。它提取签名和请求映射，不生成服务端 schema 或权限定义。`**definition`、`**changes`、`**package`、`**resolution`、`**configuration` 转发服务端验证的 JSON 字段，详见[配置](configuration.md)、[限制](limits.md)及下方工作流。方法存在不代表调用者拥有管理权限。

## 工作流与返回值处理

| 方法组 | 输入与返回值使用 | 说明 |
| --- | --- | --- |
| catalog、applications、preflight_* | 查看能力、就绪与证据范围；预检返回 SessionPreflight 形状的 JSON | [选择集成](../integrations/choose.md) |
| create/validate/update/delete_connection、connection_dependencies | Provider 配置与凭据或 Secret 引用；启用、删除前看验证及依赖 | [连接生命周期](../build/connection-lifecycle.md) |
| register_harness／register_harness_package | OCI image 与源码 files 是不同格式，保留 id/version/digest | [OCI](../integrations/harnesses/oci.md)、[源码包](../integrations/harnesses/source-package.md) |
| create/revise/copy/archive_agent | 不可变 revision，expected_revision 保护编辑 | [Agent 模板](../build/agent-templates.md) |
| create_session、session、session_initialization | 直接 Harness 或保存 Agent，加连接 ID；保存 id 并核对快照 | [首个 Session](../start/first-session.md) |
| upload | 相对路径到 bytes 的映射，客户端逐项 Base64 编码 | [项目上下文](../build/project-context.md) |
| submit、run、cancel | 保存精确 input/origin/key 与 Run id，查询终态 | [后端集成](../build/backend-integration.md) |
| stream、events | 字符串游标；分别返回生成器与 events envelope | [事件流](../build/stream-events.md) |
| approvals、decide、tool_calls、deny_tool_authorization、resolve_tool_call | 审批布尔值不同于账户授权，对账使用原 call/hash | [审批](../build/approvals.md)、[恢复](../build/recovery.md) |
| create_preview、revoke_preview、artifacts、download_artifact | 预览授权敏感，下载返回 bytes | [预览](../build/private-preview.md)、[产物](../build/artifacts.md) |
| pause、resume、close、session_activity | 生命周期请求不直接证明 Provider 清理，period 仅接受 24h/7d | [空闲唤醒](../build/idle-and-wake.md) |
| Secret、access、OAuth、Token 方法 | 敏感管理操作，保持租户边界，不记录返回凭据或 grant | [访问控制](../operate/access-control.md)、[凭据](../operate/credentials.md) |
| deployment、update_deployment、retry_ingress、resource_operation* | revision 检查与持久操作调查，review 不证明资源不存在 | [配置](configuration.md)、[对账](../operate/reconciliation.md) |

## 带上下文的最小调用序列

片段要求已有客户端、就绪连接 ID、应用保存的 key 与持久化回调，不是包含完整清理的可执行程序；完整流程见[示例](../../../../examples/documentation/first-session.py)。

```python
session = client.create_session(
    harness={'id': 'pi', 'version': '1.5.2'},
    sandbox_connection_id=sandbox_id, model_connection_id=model_id,
)
save_session_id(session['id'])
client.upload(session['id'], {'README.txt': b'Project context\n'})
run = client.submit(session['id'], saved_input, saved_key,
                    origin={'request_id': business_request_id})
save_run_id(run['id'])
for event in client.stream(run['id'], saved_cursor or '0'):
    if event.get('id'):
        store_event_and_cursor_atomically(run['id'], event)
result = client.run(run['id'])
```

创建前先保存创建意图，Session 创建不继承 Run 幂等性。流中断后从已提交游标恢复，流结束后仍查询最终状态。授权审批等待通过对应用户流程处理，不在事件处理器中无条件批准。资源对账结束前保留失败记录。

## 类型、错误与覆盖边界

`hexagon` 导入了 `SessionPreflight`，其他 TypedDict 位于 [contracts.py](../../../../sdk/python/hexagon/contracts.py)。它们描述 JSON 形状，不验证运行时数据，也不把 dict 转成对象。多数方法没有返回类型注解，不能推断存在更完整的强类型接口。

HTTP 错误转成 `HexagonError(status, code)`，缺省码为 `http_error`。网络、超时、JSON 解码、本地发现可能产生其他异常。stream 遇到截断或意外 EOF 抛 ConnectionError，收到 `stream.end` 正常结束，没有无限自动重连。session_activity 对非法 period 本地抛 ValueError。重试前看[错误参考](errors.md)。

`request(method, path, body=None, headers=None)` 可访问已实现但没有便捷方法的 JSON 路由，例如某个 Session 的 Run 列表。它追加 `/v1`，不创造端点也不绕过权限。浏览器预览传输、凭据代理流量与 OAuth 浏览器跳转不是通用 JSON SDK 操作。SDK 没有完整 HTTP schema 模型层或内置持久业务 journal。

本清单由源码生成；逐方法可执行示例和完整响应 schema 审查仍属于草稿待验收项，表格本身不能替代它们。已有安装包与实云证据保持原日期和范围，本轮不宣称重新完成 SDK 旅程。

## 按资源查阅响应契约

生成的签名说明客户端如何调用；精确响应投影、状态码、角色、状态前提和副作用应查看对应 HTTP 契约。大部分管理方法直接返回解码后的 JSON；调用没有抛异常，仍可能包含 invalid 的连接验证结果或 reconciliation_error，不能据此认定业务成功。

| 资源 | 契约 |
| --- | --- |
| Runs、事件与取消 | [Runs、事件与取消](runs.md) |
| Session 创建、文件和生命周期 | [Session 创建、文件和生命周期](sessions.md) |
| Session 环境、授权与访问凭据 | [Session 环境、授权与访问凭据](session-access.md) |
| 产物内容与私有预览 | [产物内容与私有预览](artifacts-previews.md) |
| 审批与 Tool 恢复 | [审批与 Tool 恢复](approvals-tools.md) |
| 连接、验证与使用记录 | [连接、验证与使用记录](connections.md) |
| 应用与 OAuth | [应用与 OAuth](oauth.md) |
| Managed Secrets | [Managed Secrets](secrets.md) |
| 应用 Token | [应用 Token](tokens.md) |
| Agent 模板与修订 | [Agent 模板与修订](agents.md) |
| 目录与 Harness 注册 | [目录与 Harness 注册](harness-registration.md) |
| 资源操作对账 | [资源操作对账](resource-operations.md) |
| 监控与集合查询 | [监控与集合查询](monitoring.md) |
| 本地部署配置 | [本地部署配置](deployment.md) |

产物二进制下载和事件流使用上文说明的特殊返回路径。DELETE 并非统一空响应：Token 撤销返回 JSON，预览/access/Secret/连接删除使用 204，OAuth flow 取消返回 flow 对象。构建通用应用封装时必须保留这些差异。

## 查询已有 Run，不提交新工作

从仓库根目录运行[完整诊断示例](../../../../examples/documentation/inspect-run.py)。Python 先安装本地 SDK；TypeScript 先执行 `npm --prefix sdk/typescript run build`。

```sh
python3 examples/documentation/inspect-run.py --session YOUR_SESSION_ID --run YOUR_RUN_ID --after 0 --max-pages 20
```

程序核对 Run/Session 关联，读取 Session 状态和有页数上限的事件，重新查询 Run 并列出产物 ID/大小/摘要。报告不包含任务文本、事件 payload、最终输出或产物名称，资源 ID 仍需私有保存。它不会提交、审批、取消或关闭任务。事件 ID 保持十进制字符串，比较使用任意精度整数，不转换成有精度损失的数字。

Last_observed_cursor 是诊断观察位置，不是应用消费者检查点：程序只计数，没有持久保存事件内容。Reached_empty_event_page 只说明该次查询暂时没有后续页，不表示 Run 完成。状态、事件和产物是分开的读取，不是原子快照。达到页数上限可使用返回游标继续诊断，但不能据此跳过应用尚未处理的事件。

本地语法/类型与假客户端检查不证明真实 API 或云行为。解释结果请结合 [Run 契约](runs.md)与[恢复指南](../build/recovery.md)。

[示例安装、阶段与恢复说明](../../../../examples/documentation/README.zh-CN.md)。
