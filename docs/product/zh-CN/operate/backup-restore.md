# 备份和恢复控制平面

本页描述已有 local 离线备份命令。备份覆盖一个数据库 schema 和匹配的私有身份 / 密钥，不是运行中云 Sandbox 的完整快照，也不是 hosted 全套基础设施备份方案。

## 前置条件

安装 pg_dump / pg_restore，使用正确 DATABASE_URL 和 HEXAGON_DATA_DIR。完成或取消活动 Run，关闭所有云 Session 并确认清理，停止本地服务。备份实现会拒绝仍在运行的服务、未关闭 Session、身份或解密不匹配。

```sh
npm run local -- stop
npm run local -- backup /absolute/private/new-backup-directory
```

目标目录必须全新，命令不会覆盖旧备份。备份包含 database.dump、master.key、owner.json、可选 deployment.json、hash 清单和迁移信息。目录和文件按私有权限创建；不能提交到仓库或公开上传。

## 恢复到全新目标

先建立全新空 PostgreSQL 数据库。目标数据目录不存在或为空。以下连接串是示意，使用你准备好的独立目标：

```sh
DATABASE_URL='postgres://YOUR_USER@127.0.0.1:5432/hexagon_restored' \
HEXAGON_DATA_DIR='/absolute/private/restored' \
npm run local -- restore /absolute/private/new-backup-directory
```

恢复检查 manifest、文件类型与 hash，拒绝非空数据库，使用事务恢复 schema，然后验证 owner 身份和所有加密记录可解密。返回的 schema 若不是 public，后续连接需要配置相应 search_path。使用目标 DATABASE_URL / HEXAGON_DATA_DIR 启动，不要误启动原工作区。

发现文件和 PID 在启动时重新生成，不复制旧进程身份。若恢复在数据库写入后失败，目标可能已不再为空；保留错误记录，检查 staging 目录和数据库，不要直接反复覆盖或删除尚未核实的数据。

## 信任与一致性

只恢复可信来源的备份。hash 证明内容与清单一致，不证明归档作者可信。密钥与数据库要匹配：另一个工作区的 master.key 无法解密本备份。

该命令要求 Session 全部关闭，以避免重建仍活跃的云操作。自行恢复较旧或在线数据库副本时，还需额外对账备份时点后的云资源与外部写入，不能直接假设安全重放。

hosted 的外部主密钥、身份、TLS 和部署配置需由部署方另行备份；不要把 local 工具的成功外推为 hosted 恢复完成。

## 恢复验收

在隔离目标确认历史 Session / Run、初始化、事件和产物可读；凭据可解密；新测试任务可执行并确认清理；没有从旧状态意外复活资源。记录实际恢复命令、schema、验证范围和失败，公开证据不包含备份文件或秘密。

实现依据：[离线备份与恢复](../../../../modules/deployment/backup.ts)。下一步：[升级](upgrades.md)、[对账](reconciliation.md)。
