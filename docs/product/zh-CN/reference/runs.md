# Runs HTTP 契约

使用这些接口向 Session 提交一个任务、恢复查询结果、观察持久事件并请求取消。以下路径均包含 `/v1`。Owner 和应用 Token 可以访问这些路由，但仍须通过租户归属和状态检查。本文描述当前源码契约，不代表本轮已经完成 HTTP 或实云验收。

## 提交 Run

`POST /v1/sessions/{session_id}/runs` 返回 **202** 和 Run 对象。`{session_id}` 必须是当前认证租户拥有的 UUID。

| 输入 | 类型和要求 | 含义 |
| --- | --- | --- |
| `Idempotency-Key` 请求头 | 必填字符串，1–256 字符 | 在当前租户和 Session 内标识一次提交 |
| `input` | 必填字符串，1–100,000 个 JavaScript 字符串码元；不能只有空白 | 原样保存的任务文本 |
| `origin` | 可选严格对象 | 调用方关联元数据，不是授权依据 |
| `origin.message_id` | 可选字符串，1–256 字符 | 业务消息标识 |
| `origin.request_id` | 可选字符串，1–256 字符 | 业务请求标识 |
| `origin.channel` | 可选字符串，1–100 字符 | 来源渠道名称 |

请求体和 origin 中的未知字段会被拒绝。输入与编译后初始化上下文还必须满足合计 120,000 UTF-8 字节的限制，不能只检查字符长度。省略或传入空 origin 时保存为 `{}`。

发送前持久化 Session ID、精确请求体和幂等键。已有 Session 和可信后端 Token 时，将以下内容保存为 `run-request.json`：

```json
{
  "input": "Read the uploaded project and explain its entry point.",
  "origin": {"message_id": "message-001", "request_id": "request-001", "channel": "project-ui"}
}
```

使用事先保存的幂等键发送：

```sh
curl --fail-with-body --silent --show-error \
  -H "Authorization: Bearer $HEXAGON_API_TOKEN" \
  -H 'Content-Type: application/json' \
  -H "Idempotency-Key: $HEXAGON_RUN_KEY" \
  --data-binary @run-request.json \
  "$HEXAGON_API_URL/v1/sessions/$HEXAGON_SESSION_ID/runs"
```

`HEXAGON_API_URL` 是不带 `/v1` 的控制平面 origin。这些 shell 变量是示例输入，不是服务器配置项；不要在录制的 shell 跟踪中暴露 Token。开始观察前先保存响应 ID。202 只说明任务被接受，不代表执行完成、Sandbox 已就绪、测试通过或产物已经导出。

### 幂等与状态规则

查找键由租户、Session 和幂等键共同组成。请求哈希覆盖输入文本及非空的已解析 origin。恢复请求时原样发送保存的请求体；使用同一键修改 input 或 origin 会返回 `409 idempotency_conflict`。查找既有提交先于新任务状态检查，因此即使 Session 后来关闭，匹配的旧请求也能返回原 Run 的当前状态。这不允许在已关闭 Session 中创建新任务。

新键允许的 Session 状态是 `open`、`paused`、`pausing`、`resuming`，由 worker 执行唤醒或对账。同一 Session 只允许一个非终态 Run，繁忙时拒绝提交，不会自动排到当前任务之后。Sandbox 和模型连接仍需启用、ready 且未删除；引用的上下文文件在接受任务前核对上传内容。Run 与初始 `run.queued` 事件在同一事务提交。

| 失败 | 状态码 | 处理动作 |
| --- | --- | --- |
| UUID、请求体或请求头不合法 | 400，`invalid_request` | 修正校验错误后提交 |
| 输入只有空白 | 400，`invalid_submission` | 提供有效任务文本 |
| Session 不存在或属于其他租户 | 404，`session_not_found` | 核对租户和 ID，不推断其他租户资源 |
| 同键提交不同内容 | 409，`idempotency_conflict` | 找回原请求；只有确实创建新任务时才用新键 |
| 已有非终态 Run | 409，`session_busy` | 先观察或取消已有 Run |
| Session 正在关闭或已关闭 | 409，`session_closed` | 查询历史，新任务使用新 Session |
| 检测到控制平面管理的到期状态 | 409，`sandbox_expired` | 检查生命周期和资源状态 |
| 绑定连接不可用 | 409，`connection_not_ready` | 诊断连接，不替换既有 Session 的固定绑定 |
| 引用上下文缺失或变化 | 409，`context_file_missing` / `context_file_changed` | 执行前修正初始化上下文契约 |
| 上下文文件过大 | 413，`context_file_too_large` | 将引用文件缩减到限制内 |
| 上下文文本编码无效 | 400，`context_file_encoding` | 使用无 NUL 的有效 UTF-8 文本 |
| 合计 UTF-8 字节数过大 | 413，`input_too_large` | 缩减输入和上下文，不能只按字符计数 |

响应丢失不同于上表中的明确错误。使用相同请求体和幂等键重发原提交以恢复 Run，不要为网络重试生成新键。通用响应形状见[错误参考](errors.md)。

## Run 响应对象

提交、`GET /v1/runs/{id}`、取消和单 Session Run 列表采用下列公开投影：

| 字段 | 形状 | 含义 |
| --- | --- | --- |
| `id`、`session_id` | UUID 字符串 | 稳定 Run 标识和父 Session 标识 |
| `state` | 字符串 | 下述 Run 状态之一 |
| `input` | 字符串 | 原始任务输入 |
| `output` | 可空 JSON 对象 | 当前 worker 成功输出为 `{role:"assistant", text, artifacts}`，不能替代状态或单独的产物查询 |
| `error` | 可空 JSON 对象 | 执行或恢复诊断，通常包含 `code`；非终态也可能有诊断 |
| `origin` | 对象 | 已解析的调用方关联字段，或 `{}` |
| `execution_identity` | 对象 | 持久执行上下文，见下文 |
| `created_at`、`updated_at` | 时间戳字符串 | 服务端记录时间 |

新提交的 `execution_identity` 包含 `tenant_id`、`session_id`、`agent_id`、`agent_revision`，以及认证流程提供时的 `principal`（可含 `key_id` 和 `role`）。直接创建的 Session 可能没有已保存 Agent 身份，历史行可能为 `{}`。不能用调用方提供的 origin 证明身份，也不能把身份快照当作独立访问凭据。Worker 租约字段、请求哈希、幂等键和 Runtime 游标不属于 `publicRun`。

Run 状态为 `queued`、`provisioning`、`running`、`waiting_authorization`、`waiting_approval`、`cancelling`、`completed`、`failed`、`cancelled`。只有最后三个是终态。Session 与 Runtime 状态另行定义，见[事件和状态](events-and-states.md)。

查询单个 Run 不需要请求体或查询参数：

```sh
curl --fail-with-body --silent --show-error \
  -H "Authorization: Bearer $HEXAGON_API_TOKEN" \
  "$HEXAGON_API_URL/v1/runs/$HEXAGON_RUN_ID"
```

成功返回 **200**。不存在或其他租户的 Run 返回 `404 run_not_found`。

## 两种不同的 Run 列表契约

### 单 Session 的 Runs

`GET /v1/sessions/{session_id}/runs` 返回 **200** 和 `{ "runs": [...] }`，每项为完整公开 Run 对象。可选 `before` 必须通过 datetime 校验，比较条件是严格的 `created_at < before`。每页最多 100 项，按创建时间倒序，不返回 `next_offset` 或 `has_more`。

```sh
curl --fail-with-body --silent --show-error --get \
  -H "Authorization: Bearer $HEXAGON_API_TOKEN" \
  --data-urlencode "before=$HEXAGON_BEFORE_TIMESTAMP" \
  "$HEXAGON_API_URL/v1/sessions/$HEXAGON_SESSION_ID/runs"
```

第一页省略 `before`。当前只有时间戳游标，没有 ID 辅助排序；页边界时间戳相同的记录可能被跳过，因此不能承诺通过该游标无遗漏导出所有历史。Session 不存在或属于其他租户时返回 `404 session_not_found`。

### 全租户 Run 摘要

`GET /v1/runs` 返回 **200**，形状为 `{ "runs": [...], "offset": 0, "next_offset": null }`，存在下一页时 next_offset 为数字。

| 查询参数 | 默认值与限制 |
| --- | --- |
| `limit` | 25；1–100 的整数 |
| `offset` | 0；非负整数 |
| `search` | 空字符串；最多 200 字符 |
| `state` | 空字符串；最多 40 字符；非空时按状态精确过滤 |

搜索对 Run ID、Session ID、输入文本和 Session definition 名称做不区分大小写的子串匹配。结果按 `created_at DESC, id DESC` 排序。每项包含 `id`、`session_id`、`state`、`created_at`、`updated_at`、`error`、`input_preview`（数据库文本前 240 字符）和 `agent_name`。这是摘要，不是完整 Run 响应。并发插入可能移动 offset，不构成快照导出。

```sh
curl --fail-with-body --silent --show-error --get \
  -H "Authorization: Bearer $HEXAGON_API_TOKEN" \
  --data-urlencode 'limit=25' --data-urlencode 'offset=0' \
  --data-urlencode 'state=failed' \
  "$HEXAGON_API_URL/v1/runs"
```

## 查询或订阅持久事件

`GET /v1/runs/{id}/events?after=0` 返回 **200** 和 `{ "events": [...] }`。每项包含字符串 `id`、字符串 `type`、JSON `data` 和 `created_at`。`after` 默认 `"0"`，只能包含十进制数字，且不包含游标对应事件。每页最多 500 项，按序号递增。保存最后处理的 ID，序号有间隔是正常情况；继续查询至无返回项，Run 仍活动时继续观察。没有事件不等于完成。

```sh
curl --fail-with-body --silent --show-error --get \
  -H "Authorization: Bearer $HEXAGON_API_TOKEN" \
  --data-urlencode "after=$HEXAGON_EVENT_CURSOR" \
  "$HEXAGON_API_URL/v1/runs/$HEXAGON_RUN_ID/events"
```

`GET /v1/runs/{id}/stream` 返回 **200** 和 `text/event-stream`。游标优先级为显式 `after`、`Last-Event-ID`、`"0"`。持久事件通过 SSE 的 `id`、`event`、JSON `data` 输出，不携带 JSON 列表中的时间戳字段。心跳使用注释帧 `: keepalive`，约 15 秒检查发送；没有新页面时服务端每 500 毫秒检查数据。

```sh
curl --fail-with-body --silent --show-error --no-buffer --get \
  -H "Authorization: Bearer $HEXAGON_API_TOKEN" \
  --data-urlencode "after=$HEXAGON_EVENT_CURSOR" \
  "$HEXAGON_API_URL/v1/runs/$HEXAGON_RUN_ID/stream"
```

服务端观察到 Run 终态后会再次检查持久事件，再发送不带编号的 `stream.end`，其数据形如 `{ "state": "completed" }`，也可能为 failed/cancelled。此处是响应形状，不是执行记录。不要把 `stream.end` 保存为新游标。意外 EOF 后使用最后已提交游标重新查询或连接；关闭客户端流不会取消 Run。Run 不存在或属于其他租户时在建立流之前返回 404；发送响应头之后的异常则可能体现为断流。

## 取消 Run

`POST /v1/runs/{id}/cancel` 无必需请求体，返回 **200** 和公开 Run 对象：

```sh
curl --fail-with-body --silent --show-error --request POST \
  -H "Authorization: Bearer $HEXAGON_API_TOKEN" \
  "$HEXAGON_API_URL/v1/runs/$HEXAGON_RUN_ID/cancel"
```

queued Run 变为 `cancelled`，其他非终态 Run 变为 `cancelling`。待处理审批在同一事务过期，并持久化相应状态事件。已终态或已 cancelling 的 Run 返回当前对象，不重复产生取消转换。继续查询到终态；此操作不承诺立即终止进程、撤销已派发 Tool 写入或清理 Session 资源。工作结束后另行关闭 Session。Run 不存在或属于其他租户时返回 `404 run_not_found`。

来源：[HTTP 路由与公开投影](../../../../apps/control-plane/server.ts)、[提交、事件和取消](../../../../modules/execution/runs.ts)、[集合查询](../../../../modules/execution/queries.ts)。下一步：[HTTP 总览](http.md)、[事件参考](events-and-states.md)、[故障恢复](../build/recovery.md)。
