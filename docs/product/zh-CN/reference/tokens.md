# 应用 Token HTTP 契约

应用 Token 用于可信应用后端执行已配置任务，管理 Token 要求 owner 身份。这些接口不会创建租户、轮换 owner 凭据或赋予任意自定义 scope。Application 角色采用服务端路由白名单，应用仍须对自己的用户和业务资源做授权。

以下路由均位于 `/v1`。认证缺失、过期或撤销返回 `401 unauthorized`；application 身份尝试管理 Token 返回 `403 owner_token_required`。示例的 HEXAGON_API_TOKEN 必须是 owner Token，HEXAGON_API_URL 不包含 `/v1`。不要开启 shell 跟踪或将含 Token 的响应放入公共日志。

## 列出元数据

`GET /v1/tokens` 返回 **200** 和 `{tokens:[...]}`，按创建时间倒序，无分页参数。每项包含 id、label、role、expires_at、last_used_at、revoked_at、created_at；历史记录的可选时间可能为 null。列表包括本租户 owner 和 application 行，也包括过期或撤销项，不返回明文 Token 或摘要。

```sh
curl --fail-with-body --silent --show-error \
  -H "Authorization: Bearer $HEXAGON_API_TOKEN" \
  "$HEXAGON_API_URL/v1/tokens"
```

认证接受 API key 时会更新 last_used_at。该时间不是逐请求审计日志，也不能证明某项下游操作完成。

## 创建应用 Token

`POST /v1/tokens` 接受严格 JSON 对象：

| 字段 | 限制 |
| --- | --- |
| label | 必填字符串，先 trim，再检查 1–200 字符 |
| expires_in_days | 可选 1–365 整数，默认 30 |

成功返回 **200**，不是 201；包含 id、label、role:application、expires_at、created_at、token，响应头为 Cache-Control:no-store。生成值以 hx_app_ 开头，服务端存储 SHA-256 摘要。本次响应是取得明文值的机会，列表接口不能恢复明文。

请在新的私有目录执行。以下命令会创建凭据，并将完整响应保存到私有文件：

```sh
umask 077
curl --fail-with-body --silent --show-error \
  -H "Authorization: Bearer $HEXAGON_API_TOKEN" -H 'Content-Type: application/json' \
  --data '{"label":"Project backend","expires_in_days":30}' \
  --output application-token-created.json \
  "$HEXAGON_API_URL/v1/tokens"
```

必须确认退出码为 0 后再将响应当成凭据读取，错误响应也可能写入输出文件。将 Token 转移到后端的 Secret 存储。Label 和重复创建请求都不去重。响应丢失后检查列表，确定新建项并撤销确认不使用的 Token，再明确创建替代项；不要自动循环重试 POST。

## 轮换应用 Token

`POST /v1/tokens/{id}/rotate` 无必需请求体，返回 **200**，字段与创建一致，并包含 Cache-Control:no-store。

```sh
umask 077
curl --fail-with-body --silent --show-error --request POST \
  -H "Authorization: Bearer $HEXAGON_API_TOKEN" \
  --output application-token-rotated.json \
  "$HEXAGON_API_URL/v1/tokens/$HEXAGON_TOKEN_ID/rotate"
```

事务要求目标为当前租户未撤销、未过期的 application Token。它撤销原行，插入新的 ID/Token，保留 label 和**原到期时间**，不会延长有效期。没有旧新并存的宽限期；轮换事务提交后，旧 Token 不能再通过新的认证，因此需要安排后端 Secret 更新。

对旧 ID 重复轮换返回 `404 application_token_not_found`，不能找回丢失的替代明文。目标不存在、属于其他租户、为 owner、已过期或已撤销也返回此错误。响应丢失时用 owner 列表调查，撤销能明确识别但无法使用的替代项，再主动签发其他 Token；不能因为响应丢失就假定旧 Token 仍有效。撤销不会收回已经通过认证的请求，也不会取消其 Run。

## 撤销应用 Token

`DELETE /v1/tokens/{id}` 返回 **200**、`{id,revoked_at}`，是 JSON 响应，不是 204。

```sh
curl --fail-with-body --silent --show-error --request DELETE \
  -H "Authorization: Bearer $HEXAGON_API_TOKEN" \
  "$HEXAGON_API_URL/v1/tokens/$HEXAGON_TOKEN_ID"
```

重复撤销同一 application 行会成功，并保留首次 revoked_at 时间。已经过期的 application 行也可撤销。目标不存在、属于其他租户或为 owner 时返回 `404 application_token_not_found`。记录仍保留在元数据列表中，owner 也不能通过此接口撤销 owner key。

这些路径 ID 按字符串解析，路由没有 UUID 校验；实际生成的 application ID 是 UUID。创建请求结构不合法或包含未知属性返回 `400 invalid_request`。创建、轮换和撤销的重复请求语义不同，此处只有撤销自然支持重复动作。

## 角色边界与核对

Application Token 可以使用允许的任务路由，包括创建 Session、提交/观察/取消 Run、下载产物、创建/撤销预览或 access，以及部分 Agent/catalog/connection 读取。它不能管理凭据、作出审批决定或确认未知 Tool 结果。精确路由分类由 [HTTP 总览](http.md)生成；路由匹配仍须通过归属、参数和状态校验。

安装替代凭据后，使用它执行一个允许的读取，并确认旧凭据的新请求返回 401。Owner 凭据与应用后端运行 Token、浏览器客户端分开管理。轮换是凭据操作，不是应用部署，也不保证零停机。

来源：[Token 操作与角色白名单](../../../../modules/credentials/application-tokens.ts)、[认证](../../../../modules/credentials/api-auth.ts)、[路由状态码和响应头](../../../../apps/control-plane/server.ts)。示例经过源码审阅，本轮没有创建、轮换或撤销任何凭据。下一步：[身份操作指南](../operate/access-control.md)、[HTTP 总览](http.md)。
