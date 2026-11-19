# 搭建开发环境并完成第一个改动

本教程帮助你启动控制平面，并完成一个不需要 Provider 或模型凭据的文档改动。Local 指控制平面的部署位置；真实执行仍使用云 Sandbox。项目代码采用 Apache-2.0。公共仓库及贡献入口尚未配置，请使用已取得的源码目录，不要把示例仓库地址当成真实入口。

## 准备隔离的开发依赖

在仓库根目录操作。安装 Node.js 22.19 或更高版本、npm、Python 3.10 或更高版本以及 PostgreSQL。通过自己的 PostgreSQL 管理流程准备两个可丢弃的数据库，分别用于开发与测试；数据库角色需要创建 schema 和表的权限。不要使用生产数据库或已有个人 Hexagon 实例的数据。

```sh
npm ci
python3 -m venv .venv
. .venv/bin/activate
python3 -m pip install 'setuptools>=68' wheel
python3 -m pip install -e sdk/python
npm --prefix sdk/typescript run build
export DATABASE_URL='postgres://hexagon@127.0.0.1:5432/hexagon_dev'
export TEST_DATABASE_URL='postgres://hexagon@127.0.0.1:5432/hexagon_test'
export HEXAGON_DATA_DIR="$PWD/.local/contributor-dev"
```

数据库 URL 只是示例，需替换为已创建的数据库及本机认证配置。这些命令不会安装 PostgreSQL 或创建数据库。不要把凭据写入待提交文件。虚拟环境中的打包工具供安装包验证使用；依赖安装可能访问软件包仓库。

## 启动并检查控制平面

```sh
npm run local -- doctor
npm run local -- start
npm run local -- status
```

托管启动器应用迁移，并在所选数据目录保存身份、加密材料、配置和日志。打开 `http://127.0.0.1:8787/console/`，通过启动器检查经过认证的健康状态，不能仅凭端口可连接判断就绪。`doctor` 也报告 cloudflared 和 OpenSSH 是否可用：临时开发凭据入口需要前者，Instabox 需要后者。准备执行云任务时，先按[安装指南](../start/install.md)配置 ingress。

检查开发 Console 不需要创建云连接。这个入门改动不启用实云测试。如果端口冲突或启动持续未就绪，先检查所选目录中的私有日志和进程身份，再决定下一步。开发实例与个人实例使用独立数据库和数据目录；并行运行时还需要不同端口。

需要前台调试时，先停止托管实例，在相同的开发环境变量下依次执行 `npm run db:migrate`、`npm run dev`。`dev` 不提供文件监听重启；不要误启动两个 worker 同时处理开发数据。

## 完成一个小而可审查的改动

可以从澄清[ E2B 指南](../integrations/sandboxes/e2b.md)两种语言中的模板前置条件开始。先读页面引用的连接器与带日期的证据，只改有依据的说明，保留内置 OpenCode 内存要求与 Session 专属 OCI 模板准备之间的区别。具体编辑流程见[文档贡献指南](documentation.md)。

这个纯文档改动需要执行结构检查，并逐段比对中英文：

```sh
python3 tooling/check-product-docs.py --report testing/evidence/2026-11-19-product-docs-structure.json
```

后续日期的审查使用新的证据文件名。确认本地链接有效、前置条件等价、验证范围没有被扩大。检查器不能证明文字准确或云执行通过；这个练习不需要 Provider 账户。

修改实现时，先运行对应测试，再运行仓库验证门禁：

```sh
npm run verify
npm run verify:packages
npm run release:check
```

前两个命令都依赖已经导出的 `TEST_DATABASE_URL`。`verify` 执行 TypeScript 检查和 Vitest；安装包验证在临时目录构建并消费 Python wheel 与 npm tarball。二者都不是实云验收。各自范围及启动、备份专项要求见[测试指南](testing.md)。发布审计命令只是检查，不代表发布授权。

## 结束本地练习

```sh
npm run local -- stop
```

存在活动 Run 时启动器会拒绝停止。如果已经超出练习范围创建了云 Session，先取消或关闭并对账资源清理；停止控制平面不会销毁 Provider 资源。保留解密凭据、调查未决操作所需的数据目录。本教程不要求提交或发布。

第一个改动的完成标准是：可读的双语差异、真实的检查结果，以及明确列出的未运行检查。改变产品行为前还须阅读[架构](../../../architecture.md)与[验收要求](../../../../testing/acceptance.md)，保留完整用户旅程。

下一步：[代码地图](codebase.md)、[测试与证据](testing.md)、[设计提案和贡献](proposals-and-prs.md)。
