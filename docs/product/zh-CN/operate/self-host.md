# 自托管控制平面

Hexagon 可以由你运行控制平面、数据库和访问入口，并使用你自己的云 Sandbox 与模型账户。当前仓库提供源码启动和本地编译分发；这里不假设已有公开 Docker 镜像、Helm chart 或托管 SaaS 开通流程。

## 选择部署方式

单用户可信本机使用 local 模式与受管理启动器，参阅[本地工作区](local-workspace.md)。网络部署使用 hosted 模式，显式提供身份、存储和稳定凭据入口。不要通过把 local 管理服务直接绑定公网来替代 hosted 身份设置。

一个部署需要：Node 22.19+、PostgreSQL、对应加密密钥、管理 API/Console、worker、独立预览入口和独立凭据 listener。当前 main 入口组装 API 与 worker，不要求凭空启动一个不存在的独立 worker 命令。

## 源码与编译分发

源码依赖使用 `npm ci`。维护者可以生成本地分发：

```sh
npm run build:local -- /absolute/new-release-directory
```

在生成目录运行 `npm ci --omit=dev` 后，local 模式可使用其附带的 local 管理脚本。产物包括编译代码、Runtime 与 Console 资源及锁定依赖，不包括你的数据库和凭据，也不自动发布软件。

## hosted 启动要求

| 配置 | 要求 |
| --- | --- |
| HEXAGON_DEPLOYMENT_MODE | `hosted` |
| DATABASE_URL | 独立配置且已迁移的数据库 |
| HEXAGON_MASTER_KEY | 与已有加密数据匹配的规范 base64 编码 32-byte 密钥 |
| HEXAGON_BOOTSTRAP_TOKEN | 数据库中已有 owner 身份的有效 Token |
| HEXAGON_ACCESS_URL | 稳定 HTTPS origin，无 userinfo、query、fragment 或额外路径 |
| HEXAGON_ACCESS_TUNNEL | hosted 不允许临时 tunnel |

通过部署环境的私有配置机制提供上述值，不将真实值写入 shell 历史或示例。`HEXAGON_BOOTSTRAP_TOKEN` 不是任意字符串：入口会查询数据库确认 owner 身份。当前 hosted 不提供完整组织 / 登录开通服务，需要先完成受支持的身份迁移或部署方身份准备；空数据库加一个随机 Token 不能直接启动成功。

在已准备身份、正确密钥、网络和数据库的源码部署中：

```sh
npm ci
npm run db:migrate
npm run dev
```

`npm run dev` 是前台入口，不自动提供服务管理、TLS 或备份。由部署环境管理进程退出、重启和日志，保留数据库与密钥。公开服务前配置[独立入口](networking.md)，并用明确 URL / Token 连接 SDK。

## 部署验收

依次验证数据库迁移、身份鉴权、API 与 worker、云 Sandbox 到凭据入口、模型任务、私有预览、产物留存和清理。重启后确认记录与密钥解密可用。多副本、高可用和负载容量必须按实际部署额外测试，不能仅从数据库 lease 推导出所有拓扑已验收。

计划升级先关闭工作、备份匹配数据库和密钥。商业 SaaS 组织、计费与托管运营不是本模式自动提供的能力。依据：[模式校验](../../../../modules/deployment/mode.ts)、[入口](../../../../apps/control-plane/main.ts)、[分发说明](../../../local-installation.md)。
