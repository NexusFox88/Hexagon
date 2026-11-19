# 监控与集合查询 HTTP 契约

这些读取模型反映持久化控制平面状态，不是直接 Provider 检查、账单测量或模型执行成功证明。全部 `/v1` 路由要求认证和租户归属。Health、Session 列表/活动允许应用 Token；overview、pending、Fleet 要求 owner。

## 健康检查

`GET /v1/health` 查询数据库，返回 process_id、布尔 active_runs、api/database 就绪、credentials、credential_access、execution。可选健康服务可能返回 not_configured。Credentials.state=unavailable 时返回 **503**，其他正常响应为 **200**；数据库异常进入服务器错误处理。必须检查字段，不能只看状态码：处理器不会把每一种 execution/access 降级情况都转换成 503。

```sh
curl --fail-with-body --silent --show-error \
  -H "Authorization: Bearer $HEXAGON_API_TOKEN" "$HEXAGON_API_URL/v1/health"
```

`GET /health/live` 是独立的未认证存活检查，返回 `{status:"alive"}`，不查询依赖。运维决策应使用就绪和生命周期诊断，不能以存活代替完整健康。

## Session 集合

`GET /v1/sessions` 返回 **200**、`{sessions:[...],offset,next_offset}`。Limit 默认 25，整数 1–100；offset 默认 0，非负整数；search 默认空，最多 200 字符；state 默认空，最多 40 字符。非空 state 精确过滤 Session 状态；search 对 Session ID、Agent ID、definition 名称做不区分大小写的子串匹配。排序为 created_at DESC、id DESC；观测到末页时 next_offset 为 null，并发插入可能移动页面。

```sh
curl --fail-with-body --silent --show-error --get \
  -H "Authorization: Bearer $HEXAGON_API_TOKEN" \
  --data-urlencode 'limit=25' --data-urlencode 'offset=0' --data-urlencode 'state=open' \
  "$HEXAGON_API_URL/v1/sessions"
```

每项包含 id、agent_id、agent_revision、definition、env_names、state、sandbox、created_at、updated_at、harness、runtime_state 和可空 latest_run。Latest_run 含 id/state/input_preview（数据库文本前 240 字符），按 Run 创建时间/ID 倒序选取。Runtime 状态来自已记录绑定。此投影不同于单 Session GET 和 Fleet，不要假定所有接口共用一种 Session 响应类型。不返回环境值。

## 任务活动

`GET /v1/sessions/activity` 接受 period=24h（默认）或 7d，返回 **200**，包含 active_sessions、idle_sessions、paused_sessions、period、buckets、checked_at。

```sh
curl --fail-with-body --silent --show-error --get \
  -H "Authorization: Bearer $HEXAGON_API_TOKEN" --data-urlencode 'period=24h' \
  "$HEXAGON_API_URL/v1/sessions/activity"
```

| 指标 | 定义 |
| --- | --- |
| active_sessions | open/paused/pausing/resuming 且存在非终态 Run 的 Session |
| idle_sessions | open 且没有非终态 Run 的 Session |
| paused_sessions | 当前 paused 的 Session，不论是否已有待执行工作 |
| buckets[].active_sessions | Run 与该时间区间重叠的不同 Session ID 数量 |

分类未必互斥：刚提交工作但仍 paused 的 Session 可以同时算 active 和 paused。每个 bucket 包含 start、active_sessions。24h 使用逐小时滚动区间，7d 使用逐日滚动区间，以查询时间为基准，不是自然日零点。终态 Run 的重叠截止 updated_at，非终态延伸到当前时间。统计覆盖租户完整数据，不受当前 Session 列表页影响。它衡量任务活动，不是 CPU、HTTP 流量或计费计算量。

## 总览

`GET /v1/overview` 返回 **200**，包含 checked_at 和以下计数：

- ready_connections：未删除、已启用、ready 的连接。
- open_sessions：仅 open，不是全部未关闭 Session。
- active_runs：全部非终态 Run。
- pending_approvals：pending 审批。
- pending_authorizations：waiting_authorization 的 Tool calls。
- unknown_operations：全部 unknown 资源操作，包括已 acknowledged 的项。
- active_agents：未归档模板。

```sh
curl --fail-with-body --silent --show-error \
  -H "Authorization: Bearer $HEXAGON_API_TOKEN" "$HEXAGON_API_URL/v1/overview"
```

## 待处理工作

`GET /v1/pending` 返回 **200**、`{items:[...],offset,next_offset}`，limit/offset 与集合查询相同。共享解析器虽然接受 search/state，但当前 SQL 不应用这两个过滤条件，因此不能将它们宣传为此接口的筛选功能。

```sh
curl --fail-with-body --silent --show-error --get \
  -H "Authorization: Bearer $HEXAGON_API_TOKEN" \
  --data-urlencode 'limit=25' --data-urlencode 'offset=0' \
  "$HEXAGON_API_URL/v1/pending"
```

每项包含 id、kind、state、session_id、可空 run_id、created_at，按创建时间/ID 从旧到新排列。Kind 为 approval（pending 审批）、authorization（Tool 等待授权）、tool_outcome（Tool unknown）、resource（资源 unknown 且 review_state 非 acknowledged）。已知悉的 unknown 操作仍计入总览，但不进入该待处理队列。列表是保存的待处理记录，操作前应读取对应对象，Run 或决定可能已改变。

## Fleet 快照

`GET /v1/fleet` 返回 **200**、`{sessions:[...]}`，最多最近 200 个 Session，无分页契约。每项包含 id、agent_id、definition、env_names、state、sandbox、created_at、updated_at、runtime_state、latest_run、resource_operations。

```sh
curl --fail-with-body --silent --show-error \
  -H "Authorization: Bearer $HEXAGON_API_TOKEN" "$HEXAGON_API_URL/v1/fleet"
```

Closed Session 的 runtime_state 显示 stopped，其他使用持久绑定状态。Latest_run 含 id/state/updated_at，按创建时间倒序选取。资源操作包含 id、kind、state、provider_resource_id、reason（仅 unknown/rejected 时填入）、updated_at，按创建时间/ID 排列，无记录为空数组。它不是实时 Provider 轮询，不能证明所有远端资源不存在；200 个 Session 的上限也不能用于确认全局清理。

查询值不合法返回 `400 invalid_request`；应用 Token 访问 owner 路由返回 `403 owner_token_required`；未认证返回 401。具体调查使用[资源操作](resource-operations.md)与 [Runs](runs.md)。来源：[查询实现](../../../../modules/execution/queries.ts)、[Fleet 投影](../../../../modules/execution/sessions.ts)、[HTTP 路由](../../../../apps/control-plane/server.ts)。示例经过源码审阅，本轮没有查询真实部署或执行监控验收。
