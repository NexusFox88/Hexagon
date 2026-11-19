# 添加 Harness 适配器

Harness 适配器把 Agent 实现接入 Hexagon 已有的 Runtime、模型访问与 Tool broker，负责启动配置、结果解释和连续对话状态转换。Runtime 管理进程；控制平面负责 Session、Run、持久化事件、凭据、审批和云资源清理。不要另起控制平面服务，也不要把 Harness 执行放进 API 进程。

先阅读[接入契约](../../../harness-integration-contract.md)与[架构](../../../architecture.md)。本文是实际实现的扩展流程；注册成功不代表兼容性验证完成。

## 分别选择分发方式与协议

新接入优先采用 [OCI 镜像](../integrations/harnesses/oci.md)，固定解释器和依赖，并解析为 linux/amd64 manifest digest。Dockerfile 配方不等于已发布镜像，已发布镜像也不等于已执行组合。私有仓库支持还取决于 Sandbox Provider。

[源码包](../integrations/harnesses/source-package.md)保留为 Python、Node 使用 `hexagon-json-v1` 的兼容路径，不负责编排依赖安装。两种路径都保存租户所属的注册并固定版本，控制平面不会导入上传的源码。相同 id/version 修改内容会冲突；改变固定定义时使用新版本和新 Session。

模型协议、Tool 支持及连续对话语义以 [protocols.ts](../../../../modules/harnesses/protocols.ts)为准。例如当前 Codex 声明 Responses，Hermes 声明 Chat Completions，Aider 不声明远程 Tools。镜像标签不能增加协议实现；扩展协议需要实现与拒绝测试，不能只增加 catalog 值。

## 理解适配器的三个方法

权威接口是 [HarnessAdapter](../../../../modules/execution/harness.ts)：

| 方法 | 职责 | 审查重点 |
| --- | --- | --- |
| `install(connector, sandbox)` | 向 guest 放置适配器及 bridge 文件 | 依赖是否固定并在 Sandbox 安装，而非控制平面执行？ |
| `invocation(...)` | 返回命令 argv、环境、可选 stdin 与 Tool 定义 | 输入、模型访问、原生 Session 和初始化是否正确映射，是否避免 shell 插值和凭据泄露？ |
| `result(stdout)` | 解释真实最终回复、原生标识和失败状态 | 缺失、畸形、重复或上游错误结果是否如实失败？ |

已有分发逻辑见 [runtime-adapter.ts](../../../../modules/harnesses/runtime-adapter.ts)，受管 CLI 结果处理见 [managed-cli.ts](../../../../modules/harnesses/managed-cli.ts)。OCI 提供依赖；适配器补充 bridge 和配置，不应静默替换镜像中固定的 CLI。argv 保持独立字符串，并针对固定版本测试真实参数。契约要求单次受监督调用时，不要使用 daemon 入口。

模型访问由 worker 提供作用域受限的配置。保留代理 URL 和委托认证安排，不要替换为供应商端点或账户密钥。CLI 要求 `/v1` 前缀时保留它。原始模型与 Provider 密钥留在控制平面；不要记录环境凭据、导出到产物，或隐式启用其他账户集成。

## 从最小 Python Harness 开始

现有 [Python Agent](../../../../examples/harnesses/python-agent/main.py)提供真实模型驱动循环、shell 执行、Tool mailbox、有界步数与本地对话历史。对应 [OCI Dockerfile](../../../../examples/harnesses/oci/custom-python/Dockerfile)固定基础镜像并选择 `hexagon-json-v1`。修改前阅读两者；shell 是 guest 的执行能力，不构成额外隔离边界。

在仓库根目录可以准备本地镜像：

```sh
docker build -f examples/harnesses/oci/custom-python/Dockerfile -t hexagon-custom-python:dev .
```

命令需要 Docker，可能下载依赖，只创建本地镜像；云 Provider 通常无法消费这个本地标签。镜像发布是单独操作。按 [OCI 指南](../integrations/harnesses/oci.md)的双语注册示例操作时使用可访问的不可变引用，不能为本地构建编造 digest。

`hexagon-json-v1` 程序从 stdin 接收一个 JSON 对象，随后收到 EOF。输入包括 `run_id`、`input`、作用域受限的 `model` 端点和名称、可选 `native_session`、本轮 `artifact_directory` 以及声明的 `tools`；当前适配器也可传递初始化信息。使用传入配置，在 Session workspace 保存历史，将导出文件写入给定的产物目录。

成功的最终结果是一行 JSON：

```json
{"type":"hexagon.result","text":"The actual assistant response","native_session":"opaque-session-id","failed":false}
```

恰好输出一个最终结果，`text` 非空，可选原生标识不超过 512 字符。源码包解析器使用严格 schema，不要额外加入诊断字段。当前示例的异常输出包含诊断字段，源码包解析器会拒绝它，不能视为成功；派生实现时应审查并测试错误输出。普通日志不能替代回复。共享 worker 还要求进程结果与产物导出成功，单独一条看似正确的 JSON 不代表 Run 完成。

## 使用 Tool bridge 与连续对话契约

已绑定 Tools 通过既有 mailbox 或 bridge 访问，不能直接取上游凭据调用。自定义循环向 `http://127.0.0.1:8765/tools/<run_id>/call` 发送 Run 作用域的 `HEXAGON_TOOL_TOKEN`、稳定调用 ID、声明的名称和参数。在授权、审批等待期间，继续使用相同 ID 和参数查询，最终检查结果及 `isError`。等待期间换调用 ID 可能创建不同 invocation。原生支持 MCP 的 CLI 通过适配器配置使用 [tool_bridge.py](../../../../runtime/tool_bridge.py)。

支持原生连续对话时，返回真实原生标识并在下一轮传回。上游 CLI 要求自己的 Session 标识时，不能从 Run ID 编造。通用 Python 示例自己管理历史，其标识契约不同。使用依赖前文的追问验证状态保持；支持文件系统恢复时，还需在恢复后验证。初始化要明确首轮与后续轮次的处理；声明能力不等于实现。

取消由 Runtime 管理。适配器不能启动逃离监督的独立 Agent daemon。阅读 [Runtime](../../../../runtime/server.py)，测试子进程、Tool 等待期间取消和迟到输出。客户端事件连接断开不取消 Run。进程丢失时保留不确定状态，不要盲目启动第二次调用。不同 CLI 的原生事件可见性不同，只展示真实事件，不伪造隐藏推理。

## 注册与验证需要一起维护

新增 OCI 协议时，一起审查协议声明、镜像 schema 与注册、Runtime 适配器、结果解析、catalog、模板和证据。使用已有协议时通常可复用注册机制，无需新增内置分支。相关源码包括 [images.ts](../../../../modules/harnesses/images.ts)、[catalog.ts](../../../../modules/harnesses/catalog.ts)、[templates.ts](../../../../modules/harnesses/templates.ts)、[verification.ts](../../../../modules/harnesses/verification.ts)。源码包注册位于 [harness-packages.ts](../../../../modules/execution/harness-packages.ts)。定义、仓库 Secret 与 Session 绑定必须检查租户所有权。

从确定性的解析与配置检查开始：

```sh
npx vitest run modules/harnesses/runtime-adapter.test.ts modules/harnesses/managed-cli.test.ts modules/harnesses/managed-cli-config.test.ts
```

为新适配器添加自己的测试，不能假设现有测试已经覆盖它。验证畸形、缺失、重复最终输出，非零退出，上游错误，不兼容模型绑定，以及初始化与原生状态映射。使用真实上游二进制配合 fixture 模型响应，可以证明 CLI 参数和 bridge 行为，仍不能证明真实模型与云端兼容性。

最后，两种 SDK 分别完成镜像注册、创建云 Session、保持上下文的两轮对话、调用已分配 Tool、导出并下载产物、取消活动轮次，以及 Provider 确认清理。按声明能力加入授权审批等待、持久化事件和跨语言继续。仅支持对话的契约明确排除不支持的 Tool、产物能力，不能记作通过。按[测试指南](testing.md)记录精确 digest、命令、Provider、模型协议与名称、SDK、场景和日期，保留失败与未决资源 ID。只有对应证据才能更新已验证组合。

下一步：[OCI 注册](../integrations/harnesses/oci.md)、[源码包兼容路径](../integrations/harnesses/source-package.md)、[测试与证据](testing.md)。
