# 资源操作审阅 HTTP 契约

这些 owner 专用接口用于调查结果可能不确定的云资源操作，只有配置 lifecycle 服务时才可用。所有查询均检查租户归属。Acknowledge 记录审阅决定，不证明云资源不存在或清理成功。

示例使用 HEXAGON_API_TOKEN 中的 owner Token，HEXAGON_API_URL 为不含 `/v1` 的控制平面 origin。资源 ID 应保存在私有恢复记录中，不进入公共报告。未认证返回 401，应用 Token 返回 `403 owner_token_required`。

## 列出操作

`GET /v1/resource-operations` 返回 **200**、`{operations:[...],next_offset:number|null}`。查询参数 limit 为 1–100 整数，默认 50；offset 为非负整数，默认 0。结果按 updated_at 倒序、id 升序排列。并发更新可能使记录移动页面，不构成稳定审计快照。接口列出所有状态，不只 unknown。

```sh
curl --fail-with-body --silent --show-error --get \
  -H "Authorization: Bearer $HEXAGON_API_TOKEN" \
  --data-urlencode 'limit=50' --data-urlencode 'offset=0' \
  "$HEXAGON_API_URL/v1/resource-operations"
```

| 返回字段 | 含义 |
| --- | --- |
| id、session_id | 操作与所属 Session 标识 |
| kind、state | 资源操作类型与状态，不是 Run 状态 |
| provider_resource_id | 已知时记录的远端资源 ID |
| attempt_count | 已记录尝试次数，不代表允许重复副作用 |
| review_state | 独立审阅状态，例如 automatic/needs_review/acknowledged |
| last_checked_at、next_check_at | 检查与调度时间，可能为 null |
| created_at、updated_at | 记录时间 |
| reason、failure | 从操作 detail 选取的诊断，可能为 null |
| provider_operation_id、provider_build_id | 已记录时的 Provider 操作/构建回执 |
| provider、session_state | 关联 Provider 和当前 Session 状态，仅列表响应包含 |

响应不暴露完整原始 detail 或凭据。创建响应丢失后，不保证一定有 Provider 标识。

## 检查单个操作

`GET /v1/resource-operations/{id}` 返回 **200**，包含上面的操作字段，但没有列表专用 provider/session_state，并增加 reviews。Reviews 最多包含最新 50 项，按创建时间倒序，每项包含 id、action、note、created_at，没有审阅历史分页参数。

```sh
curl --fail-with-body --silent --show-error \
  -H "Authorization: Bearer $HEXAGON_API_TOKEN" \
  "$HEXAGON_API_URL/v1/resource-operations/$HEXAGON_OPERATION_ID"
```

操作不存在或属于其他租户返回 `404 resource_operation_not_found`。使用详情时另行查询 Session，不要假定包含列表的两个关联字段。

## 记录审阅或请求对账

`POST /v1/resource-operations/{id}/review` 接受严格请求体：

| 字段 | 限制 |
| --- | --- |
| action | 必填 acknowledge、reopen 或 reconcile |
| note | 可选字符串，trim 后最长 2000 字符，默认空 |

只有 state 为 **unknown** 的操作接受审阅。错误名 resource_operation_not_pending 不表示名为 pending 的状态也符合条件。

| 动作 | 已提交的改变 | 立即执行云操作 |
| --- | --- | --- |
| acknowledge | 新增审阅；review_state=acknowledged，清空 next_check_at | 不执行 |
| reopen | 新增审阅；review_state=automatic，next_check_at=now | 不立即执行；使其重新具备自动对账资格 |
| reconcile | 与 reopen 相同的审阅与调度更新 | 审阅事务提交后调用相应 Session 生命周期操作 |

以下请求重新开放处理，不表示清理已经确认：

```sh
curl --fail-with-body --silent --show-error \
  -H "Authorization: Bearer $HEXAGON_API_TOKEN" -H 'Content-Type: application/json' \
  --data '{"action":"reopen","note":"Review the existing operation and its recorded provider identifiers."}' \
  "$HEXAGON_API_URL/v1/resource-operations/$HEXAGON_OPERATION_ID/review"
```

只有确实要确认已知悉未解决问题时才选择 acknowledge。主动请求对账使用 reconcile，并在 note 中记录调查说明。生命周期派发优先顺序如下：

1. Session 正在 closing 或操作 kind=delete：关闭 Session。
2. Kind=checkpoint：按 Sandbox scope 暂停 Session。
3. Kind=restore：恢复 Session。
4. 其他情况：调用 Session provisioning 对账路径。

这是 Session 级操作，不是通用的只读 Provider 查询，可能执行对应路径授权的生命周期处理。必须保留原操作/资源身份，不能盲建替代资源。不要假定任意新增操作类型都有专门的派发分支。

成功返回 **200** 和当前详情对象。立即对账期间捕获的领域 ExecutionError 也返回 **200**，增加 reconciliation_error 字段存放错误码。因此 HTTP 200 不能证明问题解决：要核对操作 state、review_state、reconciliation_error、Session 状态及可用的 Provider 证据。非领域异常通过服务器常规错误处理返回，但审阅事务可能已经提交。

请求体不合法返回 `400 invalid_request`；操作不存在或属于其他租户返回 404；当前 state 不是 unknown 返回 `409 resource_operation_not_pending`。接口没有 Idempotency-Key 支持，操作仍为 unknown 时重复接受审阅可能新增多条记录。响应丢失先查询最新 reviews 和状态，再决定是否再次动作。

Acknowledge 不会将 unknown 改为 completed/deleted，reopen 不保证自动尝试已执行。确认实际清理前保留未解决资源 ID。Provider 调查与核对见[对账流程](../operate/reconciliation.md)。

来源：[操作查询与审阅派发](../../../../modules/sandboxes/operations.ts)、[路由参数](../../../../apps/control-plane/server.ts)、[生命周期对账](../../../../modules/sandboxes/lifecycle.ts)。源码和 schema 审阅不证明本轮真实云恢复验收通过。下一步：[HTTP 总览](http.md)、[Session 生命周期](sessions.md)。
