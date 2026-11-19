# 升级版本与迁移数据

升级同时涉及控制平面代码、数据库 schema、SDK 和云执行协议。先明确目标代码与迁移来源，保留可恢复的旧版本和匹配备份，再替换运行环境。

## 升级前

记录当前源码 revision 或分发版本、锁文件、SDK 版本、迁移清单和部署配置。当前本地构建不是已发布 SaaS 版本，不要自行发明 release 名称。

完成或取消活动 Run，关闭 Session 并确认云清理。保留待调查操作记录；若仍有未知结果，先[对账](reconciliation.md)。在离线状态创建[完整匹配备份](backup-restore.md)，并确认有旧代码可用于恢复。

不要指望新 worker 兼容任何历史 invocation。涉及凭据边界、Runtime 协议或 Harness 行为的变更，需要阅读相应迁移说明并创建新 Session。

## 执行升级

在保留旧分发的独立目标中准备新代码，安装其锁定依赖。local 受管理启动会运行迁移：

```sh
npm ci
npm run local -- start
npm run local -- status
```

编译分发使用其 production 安装说明。底层前台部署需要先 `npm run db:migrate`，再启动对应服务；hosted 身份与密钥仍按[部署要求](self-host.md)提供。不要在新旧服务同时管理同一部署的情况下凭经验切换版本。

迁移在数据库事务和 advisory lock 下执行。已应用迁移的 checksum 改变会被拒绝；数据库包含当前代码未知的迁移时返回 `database_schema_newer_than_code`。不要通过删除迁移记录或编辑旧 SQL 来让检查通过。

## 升级后检查

1. 服务身份、数据库与密钥匹配，管理和凭据入口可用。
2. 历史 Session 初始化、Run、事件和产物仍可读取。
3. 新 Session 使用预期 Harness / 模型 / Provider 组合完成任务。
4. 两个 SDK 对受影响契约分别检查，涉及完整旅程变更时分别实云验证。
5. 私有预览、授权 / 审批和清理按此次变更范围复查。

单独通过 TypeScript 类型检查不能证明数据迁移或云恢复成功。记录实际命令、结果和版本范围；失败记录同样保留。

## 回退

不承诺数据库迁移可逆。回退通常是把旧版本和对应旧备份恢复到全新目标，再按恢复流程验证，而不是在新 schema 上直接运行旧代码。

旧备份不包含升级后的新增数据。回退前盘点新写入、外部工具副作用和新云资源，避免丢失业务结果或产生孤儿资源。保留升级后数据库快照用于调查；不要覆盖唯一可恢复副本。

实现依据：[迁移器](../../../../modules/storage/migrate.ts)、[本地启动](../../../../tooling/local.ts)。下一步：[备份恢复](backup-restore.md)、[诊断](observability.md)。
