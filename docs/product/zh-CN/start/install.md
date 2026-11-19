# 安装并启动本地控制平面

本教程从源码检出启动 Hexagon。完成后，你可以打开 Console，配置云 Sandbox 和模型连接，并使用本地 SDK 自动发现工作区。

## 准备环境

- Node.js 22.19.0 或更高版本。
- 已运行的 PostgreSQL，以及能够在专用数据库中创建表的身份。
- 使用 Python SDK 时需要 Python 3.10 或更高版本。
- 使用临时开发凭据入口时需要 `cloudflared`；Instabox 需要 OpenSSH 客户端。
- 一个可用的云 Sandbox 账户和模型端点，用于后续真实任务。

当前仓库提供本地构建与安装方式。不要假设同名 npm / PyPI 包已经公开发布。控制平面安装不会自动安装 PostgreSQL，也不会自动创建供应商账户。

## 启动

在仓库根目录执行：

```sh
npm ci
export DATABASE_URL='postgres://YOUR_USER@127.0.0.1:5432/hexagon'
npm run local -- doctor
npm run local -- start
npm run local -- status
```

将连接串替换为你已创建的专用数据库。不要复用其他应用的数据库。未设置 `DATABASE_URL` 时，开发默认值是 `postgres://hexagon@127.0.0.1:55432/hexagon`，这不表示该数据库已经存在。

`doctor` 检查前提条件；启动器运行数据库迁移并管理本地服务。若启动失败，先检查数据库连接和报告中的缺失依赖，再重试。保留已有数据目录和对应加密密钥，不通过删除它们来处理云资源未知状态。

打开 [本地 Console](http://127.0.0.1:8787/console/)。默认私有数据目录为 `.local/control-plane`，可以通过 `HEXAGON_DATA_DIR` 指定。保留数据库时必须同时保留对应加密密钥。

## 配置第一个执行组合

1. 在 Infrastructure 的 Sandbox 页面创建连接，填写所选 Provider 所需信息，验证并启用。
2. 在 LLM 页面配置模型端点、模型标识、协议和凭据，验证并启用。
3. 在 API Playground 中选择兼容 Harness 和上述连接，生成 Python 或 TypeScript 程序。

无需先创建 Agent 模板。云 Sandbox 必须能访问凭据通道。Console 能打开并不单独证明云执行网络可用。Settings → Network & ingress 管理保存的部署设置，修改后重启；稳定外部 HTTPS 入口或明确选择的开发隧道见[网络指南](../operate/networking.md)。管理专用的 disabled 模式不能完成受保护云执行。

## 安装 SDK

Python 建议使用独立虚拟环境：

```sh
python3 -m venv .venv-docs
. .venv-docs/bin/activate
python3 -m pip install -e sdk/python
```

TypeScript 从仓库构建：

```sh
npm --prefix sdk/typescript run build
```

仓库内程序可导入 `sdk/typescript/dist/index.js`。独立应用可以使用[本地包构建与安装流程](../../../local-installation.md#local-package-distribution)。

Python 使用 `Hexagon.local()`，TypeScript 使用 `await Hexagon.local()` 发现当前工作区，不需要手工复制 owner token。多个工作区时显式指定 Python 的 `data_directory` 或 TypeScript 的 `dataDirectory`。远程 hosted 连接使用明确 URL 和 Token，不使用本地发现身份。

## 确认完成与停止

安装阶段完成的信号是：`status` 显示服务可用，Console 可访问，数据库和工作区身份可用。真实运行还需要连接验证、云资源创建和一次任务执行；不要将安装成功记录成完整云旅程通过。

计划停止前，完成或取消活动 Run，并关闭不再使用的云 Session，确认资源清理：

```sh
npm run local -- stop
```

停止本地控制平面不等于删除云 Sandbox。依赖控制平面执行的到期清理在服务停止期间无法按时执行。

下一步按[首个 Session](first-session.md)或 API Playground 创建 Session；部署、代理、备份与恢复见[本地运维手册](../../../local-installation.md)。
