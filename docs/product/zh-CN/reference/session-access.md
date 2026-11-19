# Session 环境、授权与访问凭据

这些操作读取有效环境值、比较固定配置和当前连接授权、撤销单个 Session 的绑定授权，或签发限定范围的代理凭据。它们不修改 Session 固定配置，也不替换 Provider 凭据。

路径包含 `/v1`，全部检查租户归属。前三项操作要求 owner；access grant 的列表、创建、撤销也允许应用 Token。示例使用可信后端 Token 和不带 `/v1` 的 HEXAGON_API_URL。环境响应及新签发 Token 必须私有保存。

## 读取有效环境

`GET /v1/sessions/{id}/environment` 返回 **200**、`{env:{...},scope:"agent_process",mutable:false}`，并设置 Cache-Control:no-store。它解密保存的普通环境值，空环境为 `{}`。这不是脱敏初始化接口，也不是受保护 Provider/模型 Secret 列表；没有对应更新接口。

```sh
umask 077
curl --fail-with-body --silent --show-error \
  -H "Authorization: Bearer $HEXAGON_API_TOKEN" --output session-environment.json \
  "$HEXAGON_API_URL/v1/sessions/$HEXAGON_SESSION_ID/environment"
```

在私有目录执行，检查 curl 退出码后再读取响应；失败响应也可能写入文件。只需要环境名称和历史配置快照时，应使用 `/initialization`。

## 检查当前授权

`GET /v1/sessions/{id}/authorization` 返回 **200**、`{session_id,connections:[...]}`。它检查当前数据库中的连接、Secret 和撤销状态，不调用 Provider 或验证真实凭据有效性。

```sh
curl --fail-with-body --silent --show-error \
  -H "Authorization: Bearer $HEXAGON_API_TOKEN" \
  "$HEXAGON_API_URL/v1/sessions/$HEXAGON_SESSION_ID/authorization"
```

每项包含 id、name、kind、pinned_version、current_version、可空 secret:{id,name}、raw_secret_in_sandbox:false、可空 revoked_at 和 state。Secret 元数据不包含值。状态按以下优先级判定：

1. Session 内已撤销 → revoked。
2. 连接已删除 → deleted。
3. 连接未启用/非 ready，或 managed Secret 未启用/已删除 → unavailable。
4. 非 Tool 连接当前版本与固定版本不同 → changed。
5. 其他 → ready。

Tool 版本差异不使用同样的 changed 分类。Ready 是本地授权观察，不是外部调用成功。环境与授权读取遇到不存在或其他租户 Session 返回 `404 session_not_found`。

## 撤销本 Session 的连接授权

`DELETE /v1/sessions/{id}/connections/{connection}` 要求 owner，返回 **200** 和更新后的 authorization 对象，不是 204。只有固定定义中的 Tool 或 HTTP 连接可以撤销，其他绑定或 kind 返回 `403 connection_not_bound`。

```sh
curl --fail-with-body --silent --show-error --request DELETE \
  -H "Authorization: Bearer $HEXAGON_API_TOKEN" \
  "$HEXAGON_API_URL/v1/sessions/$HEXAGON_SESSION_ID/connections/$HEXAGON_CONNECTION_ID"
```

操作保存持久的 Session 内撤销记录，并撤销该 Session/连接的 access grants。重复不会新增重复撤销行。这不删除共享连接、不在 Provider 撤销账户，也不影响其他 Session；这里没有反向恢复接口。语句不在同一事务中，响应失败后应查询授权和 grants，必要时再次撤销同一绑定。未来代理授权本身也检查已记录的 Session 撤销。已派发外部操作不能收回。

## 列出访问凭据元数据

`GET /v1/sessions/{id}/access` 返回 **200**、`{grants:[...]}`，按创建时间排列，无分页。每项包含 id、session_id、connection_id、可空 run_id、expires_at、revoked_at、created_at。过期或撤销项仍保留。列表不返回 token 或 base_url。Session 不存在或属于其他租户时返回 404。

```sh
curl --fail-with-body --silent --show-error \
  -H "Authorization: Bearer $HEXAGON_API_TOKEN" \
  "$HEXAGON_API_URL/v1/sessions/$HEXAGON_SESSION_ID/access"
```

## 签发限定范围的代理访问

`POST /v1/sessions/{id}/access` 接受严格 `{connection_id:UUID}`，返回 **201**、`{id,base_url,token,expires_at,implementation:"external_proxy"}`，设置 Cache-Control:no-store。Base URL 为配置的凭据入口 origin 加 `/access/{grant-id}`。Token 是委托凭据，不是原始 Provider Secret。

将真实连接 UUID 写入 access-request.json：

```json
{"connection_id":"00000000-0000-4000-8000-000000000001"}
```

```sh
umask 077
curl --fail-with-body --silent --show-error \
  -H "Authorization: Bearer $HEXAGON_API_TOKEN" -H 'Content-Type: application/json' \
  --data-binary @access-request.json --output session-access-grant.json \
  "$HEXAGON_API_URL/v1/sessions/$HEXAGON_SESSION_ID/access"
```

替换占位 UUID，私有保存响应并检查命令成功，不要将 owner Token 发给代理。凭据入口必须是有效 HTTPS origin。Session 必须 open；此操作对非 open Session 也返回 `404 session_not_found`。可签发对象为 Session 模型连接或绑定的受保护 HTTP 连接，不包括 Tool。连接必须启用、ready、未删除，且版本与固定版本一致；Session 内已撤销连接不能签发。

有效期从签发时起为 min(3600, Session timeout_seconds) 秒，后备值 600 秒；接口不接受用户 TTL 或 Run ID。公开签发的 run_id 为 null，worker 内部签发可绑定 Run，使用时额外检查 Run 活动状态。每次使用都会检查过期/撤销、Session open、连接版本/就绪、managed Secret 可用性及适用的 Run 状态。因此签发成功不保证稍后请求仍被授权。

接口不支持幂等键，重复会创建另一项，列表不能恢复明文。响应丢失后调查并撤销能明确识别的未用 grants，再主动签发新项。撤销单项 grant 不同于撤销 Session 整个连接绑定。

| 签发错误 | 状态与含义 |
| --- | --- |
| credential_proxy_not_configured / credential_proxy_url_invalid | 409，修复入口配置 |
| session_not_found | 404，不存在、其他租户或非 open |
| connection_not_bound | 403，不是模型或已绑定 HTTP 连接 |
| access_denied | 403，Session 内连接已撤销 |
| connection_not_ready | 409，连接缺失、不可用或 kind 不符 |
| session_connection_changed | 409，当前版本与固定版本不同 |
| session_access_expired | 409，计算的授权截止时间无效 |

严格请求体不合法返回 `400 invalid_request`。后续代理传输使用独立策略和认证处理，见[受保护 HTTP API](../integrations/http-tools.md)。

## 撤销一个 grant

`DELETE /v1/access/{id}` 返回 **204**，无响应体。重复撤销存在的 grant 成功并更新撤销时间；未知或其他租户的 grant 返回 `404 access_not_found`。

```sh
curl --fail-with-body --silent --show-error --request DELETE \
  -H "Authorization: Bearer $HEXAGON_API_TOKEN" \
  "$HEXAGON_API_URL/v1/access/$HEXAGON_GRANT_ID"
```

这不会关闭 Session、撤销账户凭据或撤回已派发请求。Access grants 与[浏览器预览授权](artifacts-previews.md)不同。

来源：[Session 配置](../../../../modules/execution/session-configuration.ts)、[访问签发与授权](../../../../modules/access/access.ts)、[HTTP 路由](../../../../apps/control-plane/server.ts)。本文经过源码审阅，本轮没有读取真实环境值或签发/撤销 grants。
