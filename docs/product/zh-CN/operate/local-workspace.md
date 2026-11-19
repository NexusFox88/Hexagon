# 管理本地工作区

本地工作区包含控制平面配置、私有身份与加密密钥；数据库保存任务和连接记录。两者共同构成可恢复的部署，不能只保留其中一份。

先完成[安装](../start/install.md)。以下命令在仓库根目录执行，使用与你首次启动相同的 DATABASE_URL 与 HEXAGON_DATA_DIR。

## 日常命令

```sh
npm run local -- doctor
npm run local -- status
npm run local -- start
```

`doctor` 检查 Node、数据库以及按用途需要的 Python、OpenSSH、cloudflared。可选依赖缺失不等于所有功能不可用。`status` 返回管理服务的健康信息；服务管理与凭据入口健康不同。

默认数据目录为 `.local/control-plane`。指定 `HEXAGON_DATA_DIR` 后持续使用同一路径，避免误发现另一个工作区。Python `Hexagon.local(data_directory=...)` 和 TypeScript `Hexagon.local({dataDirectory: ...})` 可以显式选择本地数据目录。

不要手工把 owner Token 复制到前端。Console 与 SDK 使用各自的本地发现流程。重启产生新的本地浏览器身份；它不意味着数据库中的业务记录丢失。

## 修改持久配置

在 Console Settings → Network & ingress 编辑，或准备无凭据的配置文件：

```json
{"no_proxy":[],"ingress":{"mode":"cloudflare"}}
```

```sh
npm run local -- configure /absolute/path/deployment-config.json
npm run local -- restart
```

更新使用 revision 冲突保护。显式进程环境覆盖保存的网络配置，no_proxy 合并并包含 loopback。配置文件不保存 Provider 密钥。需要持续关闭凭据入口时保存 disabled 模式；临时停止 tunnel 不是修改持久配置。

## 计划停机

先完成或取消活动 Run，关闭不用的云 Session 并确认删除，再运行：

```sh
npm run local -- stop
```

启动器发现活动 Run 会拒绝停止。它核验服务身份和 PID 后才发信号，等待优雅退出，不会无条件强杀。如果进程存在但无法认证，检查私有 `service.log`、正确端口与工作区，而不是删除 PID 文件并另启一份。

控制平面停机期间无法保证按时执行云资源期限。未决清理记录保存在数据库，启动后仍需核对；停止本机服务不删除云资源。

## 维护完成标准

用同一配置重启后，历史 Session、连接和产物仍可读，凭据可用，新的测试任务能够执行且清理确认。只看到管理端口监听不算云路径健康。备份前同时核对数据库、密钥和部署配置，参阅[现有备份流程](../../../local-installation.md#backup-upgrade-and-restore)。

依据：[本地启动器](../../../../tooling/local.ts)、[部署配置](../../../../modules/deployment/settings.ts)。下一步：[网络入口](networking.md)、[自托管](self-host.md)。
