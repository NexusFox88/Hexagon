# GUI → Python / TypeScript → Agent 结果

先按 [安装指南](../../docs/local-installation.md) 配置专用 PostgreSQL 并启动本地控制面。所有以下命令从项目根目录运行。

```sh
npm run local -- doctor
npm run local -- start
npm run local -- status
```

打开 http://127.0.0.1:8787/console/ ，本地工作区自动连接，无需复制 Token。控制面会自动准备凭证访问通道；临时 HTTPS 隧道只公开凭证端口，承载请求内容和受限令牌。原始上游 Key 留在控制面。固定部署可配置稳定 HTTPS 入口；不要暴露管理 API。

## 最短用户旅程

1. 基础设施 → Sandbox：选择自己的供应商，输入凭证，验证并连接。
2. 基础设施 → LLM：选择实际端点协议，填写模型和凭证，验证并连接。不要把 Chat Completions 和 Responses 视为相同协议。
3. API Playground：选择连接、Harness 和模型；复制 Python、TypeScript 或 REST 代码。可先不添加 Tools，无需注册可复用 Agent。
4. 安装 SDK，在独立终端执行生成的程序。本地 SDK 自动发现工作区；远程访问使用显式 URL 和凭证。
5. 在会话页查看同一 Session 的初始化、执行和最终结果。按照生成代码继续对话或关闭 Session；确认资源已清理。
6. 按需在工具连接中添加工具并鉴权，创建新 Session 时选择绑定哪些工具。

```sh
python3 -m pip install ./sdk/python
npm --prefix sdk/typescript run build
# 在独立 Node 项目里执行：npm install /absolute/path/to/Hexagon/sdk/typescript
```

预检、目录展示、供应商就绪与组合真实验收不是一回事。参见 [支持与证据](../../docs/release/support.md)。云端调用消耗模型／供应商额度；暂停不一定零计费。停止控制面前先关闭不再需要的 Session，并确认清理。

## 可选专项：自定义 Python Harness 与受保护 HTTP

仓库内 `run.ts`／`run.py` 是特定的扩展验收示例，不是使用普通 Session 的前提。它们需要 Sandbox、与示例 Harness 匹配的模型，以及允许指定 GET 路径的受保护 HTTP Connection。按代码使用的协议配置，不要把不同供应商的账户密钥混用。

```sh
mkdir -p .local/manual-journey
cp examples/manual-journey/connections.example.json .local/manual-journey/connections.json
# 填入自己的连接 ID 与允许路径，文件中不放 Key。
npx tsx examples/manual-journey/run.ts
python3 examples/manual-journey/run.py
```

专项示例检查普通变量、受保护 HTTP 和真实模型回复。使用前阅读示例代码；它们会创建计费资源。诊断和资源 ID 保存在 .local，不能作为公开 Issue 附件。关闭失败时保留 Session 并对账，不能删除记录后重新创建来隐藏结果不明。
