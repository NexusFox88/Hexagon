# Catalog 与 Harness 注册 HTTP 契约

Owner 和应用 Token 均可发现目录，两种注册接口要求 owner。注册按租户隔离，不等于启动 Sandbox、测试模型或证明声明能力。

## 发现目录

`GET /v1/catalog` 返回 **200**、`{connections,harnesses,harness_templates,harness_protocols}`，无分页。Connections 含 adapter kind/provider/capabilities 及可选 setup_url/evidence。Harnesses 是租户可见的执行定义；harness_templates 是独立模板集合，不承诺所有镜像已注册或可用。Harness_protocols 描述适配器协议契约。

```sh
curl --fail-with-body --silent --show-error \
  -H "Authorization: Bearer $HEXAGON_API_TOKEN" "$HEXAGON_API_URL/v1/catalog"
```

Harness 项在源定义之外包含 protocol、model_providers、continuation、distribution、verification。当前 projection 从 image、recipe、source 元数据推导 distribution，不能仅凭该标签证明安装完成。Verification 精确匹配镜像引用、协议和命令，并注明 Sandbox/模型/客户端/场景范围。空数组说明该投影没有匹配证据，不一定表示不能执行。应选择兼容连接并预检实际 Session。

## 注册 OCI Harness

`POST /v1/harnesses` 接受严格对象：

| 字段 | 要求与默认值 |
| --- | --- |
| image | 必填 1–512 字符 registry 引用，由镜像解析器解析 |
| id | 可选，匹配 `^custom\.[a-z0-9][a-z0-9.-]{0,79}$`，否则从解析后引用派生 |
| version | 可选，匹配 `^[a-zA-Z0-9][a-zA-Z0-9._-]{0,63}$`，否则取 digest 前 16 位十六进制 |
| name | 可选 1–100 字符，默认解析后的 ID |
| protocol | 可选已注册协议枚举，否则取镜像标签 ai.hexagon.harness.protocol，再回退 hexagon-json-v1 |
| command | 可选 1–32 个非空字符串，每项最多 65,536 字符且无 NUL；否则使用镜像解析出的命令 |
| capabilities | 1–3 项 conversation/tools/initialization，默认 conversation |
| registry_secret_id | 可选，租户拥有且启用的 managed Secret UUID |

私有 registry 的 managed Secret 值必须为严格 JSON `{username,password}`，两项非空。不要把 registry Secret 放入镜像 URL 或日志。解析器检查支持的镜像/平台契约，当前固定 linux/amd64。可运行镜像要求见 [OCI 集成](../integrations/harnesses/oci.md)。

将真实镜像定义保存为 harness-image.json：

```sh
curl --fail-with-body --silent --show-error \
  -H "Authorization: Bearer $HEXAGON_API_TOKEN" -H 'Content-Type: application/json' \
  --data-binary @harness-image.json "$HEXAGON_API_URL/v1/harnesses"
```

成功返回 **201**，包含 id/version/name、source=oci、protocol、有效 capabilities/model_providers、image（reference/digest/platform/user 及可选 registry_secret_id）、command、registration_digest。它访问 registry 并保存解析定义，不执行镜像。Tools/initialization 必须受协议支持，解析后无命令返回 `400 harness_entrypoint_missing`。

不可变键为租户/id/version。相同解析定义重复注册返回原定义，不同内容占用同键返回 `409 harness_version_conflict`。Tag 可在请求间移动，因此保留返回的 digest，并使用不可变镜像引用。OCI 与源码包共享版本命名空间，此处没有公开 update/delete 路由。

## 注册源码包

`POST /v1/harness-packages` 接受严格对象：

| 字段 | 要求 |
| --- | --- |
| id、version | 必填，与 OCI 显式 ID/version 模式相同 |
| capabilities | 最多 3 项 conversation/tools/initialization，默认空 |
| model_providers | 必须恰为 `["anthropic-compatible"]` |
| protocol | 必须为 hexagon-json-v1 |
| interpreter | python3 或 node |
| entrypoint | 合法包路径，必须存在于 files |
| files | 1–32 个严格 `{path,content}` 对象 |

路径最多 240 字符，以字母/数字/下划线/连字符开头，其他字符可含字母数字、下划线、点、斜线、连字符。拒绝空段、`.`、`..`、重复路径和文件/目录冲突。Content 是文本，不是 Base64，每文件最多 262,144 个 JavaScript 字符串码元，全部 UTF-8 内容最多 512 KiB。此接口不是通用依赖安装器。

按[源码包指南](../integrations/harnesses/source-package.md)准备 harness-package.json，包含实际可执行的协议实现：

```sh
curl --fail-with-body --silent --show-error \
  -H "Authorization: Bearer $HEXAGON_API_TOKEN" -H 'Content-Type: application/json' \
  --data-binary @harness-package.json "$HEXAGON_API_URL/v1/harness-packages"
```

成功 **201** 返回 id/version/capabilities/model_providers、digest、created_at，不返回全量源码。Digest 计算前对 capabilities 去重排序、对文件排序。相同键的相同规范化内容可接受，不同内容或 OCI 冲突返回 `409 harness_version_conflict`。

注册在控制平面只保存数据。执行时在 Sandbox 安装并逐字节校验文件，要求 interpreter 存在，程序实现声明协议。源码接受不证明 Tool 支持、连续对话、正确性或超出已说明 Sandbox 边界的隔离。

严格输入无效返回 `400 invalid_request`，registry/manifest 问题返回解析器错误。私有 registry 查找可能返回 secret_not_found（404）、secret_disabled（409）、secret_store_unavailable（503）、image_registry_credential_invalid（400）。响应丢失后依据目录中的身份/digest 对账，不要用更换版本绕过冲突。

来源：[目录投影](../../../../modules/harnesses/catalog.ts)、[OCI 注册](../../../../modules/harnesses/images.ts)、[源码包](../../../../modules/execution/harness-packages.ts)、[路由](../../../../apps/control-plane/server.ts)。示例 origin 不带 `/v1`；本轮没有访问 registry、执行注册或云任务。下一步：[HTTP 总览](http.md)、[Harness 选择](../integrations/harnesses.md)。
