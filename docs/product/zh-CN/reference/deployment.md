# 本地部署配置 HTTP 契约

四个接口管理当前本地控制平面工作区，只有部署配置服务存在时才注册，要求 owner 身份并额外要求租户为 local-workspace。其他租户返回 `403 deployment_management_forbidden`，应用 Token 在路由权限检查中被拒绝。这不是创建 hosted 部署的 API。

## 读取配置

`GET /v1/deployment` 返回 **200**，包含 config、revision、restart_required、可选 ingress 状态、environment_overrides。Revision 是解析并填入默认值后的配置 JSON 的 SHA-256；restart_required 比较保存版本与当前进程启动版本。

```sh
curl --fail-with-body --silent --show-error \
  -H "Authorization: Bearer $HEXAGON_API_TOKEN" "$HEXAGON_API_URL/v1/deployment"
```

Config 包含可选 outbound_proxy、no_proxy、ingress。配置了 ingress 服务时，状态包含 state、attempts、checked_at，可能有 code。Environment_overrides 包含 proxy/ingress 布尔提示，不暴露实际值，也不枚举全部环境覆盖。Deployment.json 不存在时使用默认值；文件不可读或内容无效返回 `500 deployment_configuration_invalid`。

## 替换配置

`PUT /v1/deployment` 接受严格 `{config,expected_revision}`。Expected_revision 必须是 64 字符字符串，匹配 GET 返回的当前版本。Config 是完整替换，不是合并：

| 字段 | 契约 |
| --- | --- |
| outbound_proxy | 可选 HTTP/HTTPS origin，不含用户名、密码、query、fragment 或非根路径 |
| no_proxy | 默认空数组，最多 128 项，每项最多 253 字符且匹配支持的主机模式 |
| ingress | 默认 `{mode:"cloudflare"}`，按模式使用严格对象 |
| ingress.mode | cloudflare、disabled 或 external |
| ingress.url | 仅 external 必填，必须为符合上述 URL 限制的 HTTPS origin |

No-proxy 允许 `*` 或 schema 的主机式模式，不接受 URL、任意 shell 表达式或通用正则表达式。环境优先级见[配置](configuration.md)，保存值未必覆盖显式进程环境。

将 GET 的 revision 和完整预期配置写入 deployment-update.json。例如 `{config:{no_proxy:[],ingress:{mode:"cloudflare"}},expected_revision:...}` 选择临时入口并删除已保存 outbound_proxy。文件必须使用真实 JSON，不要原样复制此说明性记法。

```sh
curl --fail-with-body --silent --show-error --request PUT \
  -H "Authorization: Bearer $HEXAGON_API_TOKEN" -H 'Content-Type: application/json' \
  --data-binary @deployment-update.json "$HEXAGON_API_URL/v1/deployment"
```

成功返回 **200**、`{config,revision,restart_required:true}`。实现获得独占文件锁、检查版本、写入私有临时文件并原子替换 deployment.json；不重启进程，也不建立已验证隧道。省略字段会恢复默认值，包括 cloudflare 入口，不能通过省略保留旧配置。

`409 deployment_configuration_changed` 表示版本过期，应重新读取并核对完整配置意图。`409 deployment_configuration_busy` 表示更新锁存在，处理锁前先调查正在写入的进程。响应丢失可能发生在文件已替换之后，重试前先读取保存版本和配置，并通过本地管理流程安排重启。后续重启失败不会自动回滚已保存配置。

## 重试临时凭据入口

`POST /v1/deployment/ingress/retry` 无必需请求体，通常返回 **200** 和当前可用 ingress 状态。运行环境 HEXAGON_ACCESS_TUNNEL 必须等于 cloudflare，否则 `409 development_ingress_disabled`。

```sh
curl --fail-with-body --silent --show-error --request POST \
  -H "Authorization: Bearer $HEXAGON_API_TOKEN" \
  "$HEXAGON_API_URL/v1/deployment/ingress/retry"
```

处理器发起 retry 后不等待完成，立即读取状态，因此成功响应不证明入口 ready。通过 deployment/health 查询并检查状态。Ingress 服务本身可选，不能仅因路由存在就假定一定返回状态对象或实际发起了尝试。

## 停止入口

`POST /v1/deployment/ingress/stop` 无必需请求体，等待已配置 ingress 服务停止后返回 **200** 和可用状态。它不改写已保存入口模式，不禁用未来进程启动，也不关闭 Sessions。

```sh
curl --fail-with-body --silent --show-error --request POST \
  -H "Authorization: Bearer $HEXAGON_API_TOKEN" \
  "$HEXAGON_API_URL/v1/deployment/ingress/stop"
```

Retry 和 stop 都会在数据库存在**任何非终态 Run** 时返回 `409 active_run`，检查不限于当前租户。停止入口可能影响后续任务凭据交付，恢复工作前确认就绪。两项操作均没有请求幂等键，也不改变已保存配置版本。

严格更新请求不合法返回 `400 invalid_request`。来源：[配置与环境组合](../../../../modules/deployment/settings.ts)、[路由条件](../../../../apps/control-plane/server.ts)、[入口生命周期](../../../../modules/deployment/ingress.ts)。示例假定 HEXAGON_API_URL 不带 `/v1` 并使用本地 owner Token。本轮没有修改配置、进程或隧道。下一步：[本地工作区](../operate/local-workspace.md)、[网络配置](../operate/networking.md)、[HTTP 总览](http.md)。
