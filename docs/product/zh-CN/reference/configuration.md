# 配置与环境变量

配置分为控制平面进程、local 保存的部署设置、Session 行为与 guest 环境、各 Connection 的 Provider 配置。它们作用范围不同，不能把云账户密钥放进 Session env 来替代 Connection。

## 控制平面进程

下表依据 [main.ts](../../../../apps/control-plane/main.ts)、[部署模式](../../../../modules/deployment/mode.ts)、[本地发现](../../../../modules/deployment/local-discovery.ts)及[隧道](../../../../integrations/network/cloudflare-tunnel.ts)。除内部就绪逻辑更新临时 ingress 地址外，这些启动配置变更需要重启服务。表中默认值是入口读取默认值，local 保存设置可能继续加工它们。

| 名称 | 默认值 | 适用／必需性 | 敏感性 | 类型与用途 |
| --- | --- | --- | --- | --- |
| `HEXAGON_DEPLOYMENT_MODE` | local | local / hosted | No / 否 | local 或 hosted，其他值启动失败。 |
| `DATABASE_URL` | postgres://hexagon@127.0.0.1:55432/hexagon | both; required hosted / 两者，hosted 必填 | Yes / 是 | PostgreSQL URL，hosted 不隐式创建数据库。 |
| `HEXAGON_DATA_DIR` | .local/control-plane | primarily local / 主要 local | Private path / 私有路径 | 身份、密钥、配置与日志的数据目录。 |
| `HOST / PORT` | 127.0.0.1 / 8787 | both / 两者 | No / 否 | 管理监听地址与数字端口，本地回环绑定允许本地身份引导。 |
| `HEXAGON_ACCESS_HOST / HEXAGON_ACCESS_PORT` | 127.0.0.1 / 8789 | both / 两者 | No / 否 | 独立凭据访问监听，不是管理入口。 |
| `HEXAGON_ACCESS_URL` | unset before local deployment settings / local 配置前未设 | both; required hosted / 两者，hosted 必填 | Origin only / 仅 origin | 委托凭据访问的公网 HTTPS origin，本地隧道可填充。 |
| `HEXAGON_ACCESS_TUNNEL` | derived locally / local 推导 | local only / 仅 local | No / 否 | cloudflare 或空，其他非空值失败；hosted 拒绝非空值。 |
| `PREVIEW_HOST / PREVIEW_PORT` | 127.0.0.1 / 8788 | both / 两者 | No / 否 | 预览监听，端口也参与生成预览地址。 |
| `PREVIEW_SCHEME / PREVIEW_DOMAIN` | http / localhost | both / 两者 | No / 否 | 对外预览 scheme/domain，DNS、TLS 与路由需另行配置。 |
| `HEXAGON_MASTER_KEY` | none / 无 | required hosted / hosted 必填 | Yes / 是 | 32 字节的规范 Base64，须匹配已有加密数据。 |
| `HEXAGON_BOOTSTRAP_TOKEN` | none / 无 | required hosted / hosted 必填 | Yes / 是 | 必须匹配已存在 owner，不创建 hosted 身份。 |
| `HEXAGON_LOCAL_DISCOVERY_FILE` | ~/.hexagon/local.json | local | Private path / 私有路径 | 发现描述文件路径，还会写入数据目录的 connection.json。 |
| `CLOUDFLARED_BINARY` | cloudflared | local tunnel / 本地隧道 | No / 否 | 可执行程序路径，使用临时 ingress 时需存在。 |
| `HEXAGON_TUNNEL_PROXY_FALLBACK` | enabled unless disabled / 非 disabled 时启用 | local tunnel / 本地隧道 | No / 否 | disabled 禁止特定隧道传输失败后的去代理重试。 |

hosted 启动要求明确的数据库、匹配密钥、已存在 owner Token 和不含认证信息、查询、fragment 或路径的 HTTPS 凭据 origin；不允许开发隧道。失败分别可为 `invalid_deployment_mode`、`hosted_identity_and_storage_required`、`hosted_master_key_invalid`、`hosted_https_ingress_required`、`hosted_owner_identity_required`。不存在自动 hosted 账户引导；见[自托管](../operate/self-host.md)。

监听端口经 `Number(...)` 转换后传给服务器，不提供对所有非法值统一的配置错误码。端口冲突、无效主机和监听失败按底层错误处理。改 HOST 不自动配置 TLS、身份或反向代理。

## local 保存的部署配置

文件为所选数据目录中的 `deployment.json`，由[设置 schema](../../../../modules/deployment/settings.ts)校验。local 启动读取它；直接 hosted 入口不读取这份 local 设置。托管启动器会应用保存设置，因此 hosted 部署应按自托管指南使用明确进程配置，不能混用 local 引导。

| 字段 | 类型／默认 | 必需与敏感性 | 行为 |
| --- | --- | --- | --- |
| `outbound_proxy` | 可选 HTTP(S) origin，无默认 | 可选；不允许 URL 用户名密码 | 出站代理，不允许路径、查询、fragment |
| `no_proxy` | 字符串数组，默认 `[]` | 可选，通常非秘密 | 最多 128 项，每项最多 253 字符，受主机格式约束 |
| `ingress.mode` | 默认 `cloudflare` | 可选，非秘密 | `cloudflare`、`disabled` 或 `external` |
| `ingress.url` | HTTPS origin | external 时必填；不能内嵌凭据 | 指向凭据访问入口，不是 Console 或 OAuth callback |

配置示例（外部域名为占位，需先完成真实路由）：

```json
{
  "outbound_proxy": "http://127.0.0.1:7890",
  "no_proxy": ["localhost", "127.0.0.1"],
  "ingress": {"mode": "external", "url": "https://credentials.example.invalid"}
}
```

```sh
npm run local -- configure /absolute/path/deployment.json
```

configure 整体替换配置，不做部分合并；省略字段回到默认。结果包含 revision 和 `restart_required: true`，不自动重启。无效保存文件导致 `deployment_configuration_invalid`，并发修改可能产生 `deployment_configuration_busy` 或 `deployment_configuration_changed`。先查询当前值，不能通过删除锁或覆盖 revision 绕过竞争。

## 代理与优先级

local 的 `deploymentEnvironment` 按 `HTTPS_PROXY` → `https_proxy` → 保存的 `outbound_proxy` 选择代理。HTTP 代理优先 `HTTP_PROXY`、`http_proxy`，再回退所选代理。`NO_PROXY` 优先于 `no_proxy`，并与保存列表及 `127.0.0.1,localhost` 合并。显式环境存在时，即使是空字符串也可能遮蔽保存值。

`HEXAGON_ACCESS_URL` 优先于保存的 external URL；存在有效外部地址时不启动临时隧道。没有外部地址时，显式 `HEXAGON_ACCESS_TUNNEL` 优先于 ingress mode。local 配置函数将 `NODE_USE_ENV_PROXY` 写为 `1`；因此不能承诺在该启动路径中设置 `0` 就关闭全部代理。直接 hosted 路径的[出站配置](../../../../modules/deployment/outbound.ts)则会在该值为 `0` 时选择直接连接。

local 存在代理且未显式设置 `HEXAGON_ACCESS_EGRESS_PROXY_URL` 时，会用所选代理填充该值；`HEXAGON_ACCESS_EGRESS_HOSTS` 缺省填入 `api.siliconflow.com,api.minimaxi.com,api.minimax.io,api.minimax.chat`。这只描述凭据访问代理路径，不授予应用账户权限，也不是 Sandbox 的网络 allowlist。高级网络参数见[网络指南](../operate/networking.md)，不要把应用级网络策略与进程代理混淆。

## Session 配置与 guest 环境

| 配置 | 类型／默认 | 作用与生效时间 |
| --- | --- | --- |
| `harness` 或 `agent_id` | 二选一；Agent revision 可选 | 创建时解析并固定，不能混合覆盖保存 Agent 配置 |
| Sandbox／模型连接 ID | 必填 UUID | 租户所属、兼容且就绪的连接；不是凭据内容 |
| `resources` | idle 默认 60 秒，timeout 默认 600 秒 | 创建时固定，范围及语义见限制和生命周期 |
| `network` | 默认 unrestricted，allowed_hosts 默认空 | 创建时固定；allowlist 要求 Provider 支持并允许凭据入口 |
| `identity`、`instructions`、`context` | 可选行为字段 | 模型指导与背景数据，不改变调用者权限 |
| `tools`、`connections` | 名称到连接 ID 的映射，默认空 | Tool 绑定与受保护 HTTP 绑定不同，不能互换 |
| `variables` / `env` | 字符串映射；env 默认空 | guest Agent 进程环境，不配置控制平面；可含敏感值，不打印 |

variables 是 env 的替代输入；同时提供 variables 和非空 env 会产生 `ambiguous_variables`。名称匹配 `[A-Za-z_][A-Za-z0-9_]{0,127}`；拒绝 `HEXAGON_`、`OPENCODE_`、`PI_` 前缀以及 `PORT`、`NODE_OPTIONS`、`PYTHONPATH`、`PYTHONHOME`、`LD_PRELOAD`、`LD_LIBRARY_PATH`。值不含 NUL；数量和字节限制见[限制](limits.md)。不要通过 guest env 绕过控制平面凭据存储。

源码：[Session schema](../../../../modules/execution/sessions.ts)、[环境 schema](../../../../modules/execution/environment.ts)、[初始化](../../../../modules/execution/initialization.ts)。更改定义时创建新 Session，不能假定保存配置或重启会改变已有 Session 的固定行为。

## 客户端与 Provider 配置

SDK 的 URL/Token 构造参数属于客户端。示例中的 `HEXAGON_API_URL`、`HEXAGON_API_TOKEN` 是示例程序主动读取的环境变量，不是控制平面自动创建身份的开关。`Hexagon.local()` 根据显式数据目录、工作区描述文件和用户发现文件定位本地身份；不要修改文件权限以绕过私有身份检查。

各 Provider 配置位于 Connection 的 `config`，凭据由受管 Secret 或 OAuth 保存。字段、默认值和权限验证范围见[集成目录](../integrations/choose.md)，不能把它们作为全局部署环境变量。测试专用 `TEST_DATABASE_URL` 不选择普通服务数据库。

本页核对当前读取逻辑，未更改运行实例或重新启动服务。下一步：[安装](../start/install.md)、[自托管](../operate/self-host.md)、[网络](../operate/networking.md)。
