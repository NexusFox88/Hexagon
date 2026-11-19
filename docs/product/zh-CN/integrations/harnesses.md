# 选择并配置 Harness

Harness 是执行 Agent 逻辑的引擎。它负责模型交互、对话和工具使用；Runtime 监督它的进程，控制平面管理任务、授权与云资源。

## 三条分发路径

| 路径 | 选择方式 | 边界 |
| --- | --- | --- |
| 内置 | catalog 中的准确 id/version | 已注册安装适配器，不要求 Provider 支持 OCI |
| OCI | 注册镜像，再使用返回 id/version | 需要 OCI 能力，镜像 digest 固定 |
| Legacy source package | 专用 package API | 兼容源代码分发，不是镜像 API |

当前内置 Pi 1.5.2 和 OpenCode 1.2.27 支持 conversation、tools、initialization，声明支持三种模型协议。查询 `catalog()` 确认部署实际注册项；历史文档中的版本不能替代当前目录。

## OCI 模板目录

下面是当前模板/适配器索引，发布镜像与 recipe 的来源和固定版本见[镜像目录](../../../harness-images.md)。列出名称不代表该模板已完成全部真实组合验证。

### Codex

codex-v1，使用 Responses，Tools 经 MCP bridge，原生对话继续。需要核对所注册镜像的来源、digest 和具体执行证据。

### Hermes

hermes-v1，使用 Chat Completions，Tools 经 MCP bridge，原生对话继续。

### OpenClaw

openclaw-v1，声明三种模型协议，Tools 经 MCP bridge。不要把一类协议通过外推为其余两类通过。

### DeepSeek Harness

deepseek-v1，当前 Messages 路径，提供构建 recipe。初始化能力有限，不应声明当前适配器不支持的 initialization。构建产物发布和云执行需单独处理。

### OpenCode

opencode-v1，声明三种协议和 Tools。OCI OpenCode 与内置 OpenCode 是两条分发路径，Provider 要求不同。

### Aider

aider-v1，当前 Messages，恢复历史继续对话；当前适配器不提供连接 Tools，也不支持声明 initialization。

### Pi

pi-v1，三种协议，Tools 通过 Pi extension。模板可构建不等于已有可拉取镜像。

### Claude Code

claude-code-v1，当前 Messages，Tools 经 MCP bridge；按实际权限运行，不将 root 不兼容的 bypass 模式当默认方案。

### Python Agent

hexagon-json-v1，当前 Messages 示例，实现 mailbox 工具与自定义会话契约。自定义代码必须自己正确持久化对话。

## 选择与验证

根据[协议表](model-protocols.md)选择模型，根据 Tools / initialization 要求选择适配器，再检查 Sandbox 的 OCI、私有镜像和恢复能力。提交明确结果任务，验证两轮、工具、产物、取消与清理；必要时增加休眠恢复。

能力声明由适配器限制。不能通过注册 `tools` 为 Aider 增加未实现功能，也不能靠换版本字符串改变镜像行为。

下一步：[OCI 注册](harnesses/oci.md)、[source package](harnesses/source-package.md)。依据：[Runtime 协议](../../../../modules/harnesses/protocols.ts)、[注册检查](../../../../modules/harnesses/images.ts)。
