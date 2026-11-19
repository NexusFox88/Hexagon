# 注册兼容 source Harness 包

当你需要维护已有的 `hexagon-json-v1` 源码 Harness 时使用本页。新集成优先采用 [OCI 镜像](oci.md)，以明确解释器和依赖环境。源码包注册只存储租户所属的数据，控制平面不会导入或执行这些代码；实际安装和执行发生在云 Sandbox。

## 前提与格式

准备有管理权限的客户端、已验证并启用的 Sandbox / 模型连接，以及能运行 `python3` 或 `node` 的 Sandbox。当前源码包 schema 只接受 `model_providers: ["anthropic-compatible"]`，不能通过修改标签获得 Chat Completions 或 Responses 支持。

包包含 1—32 个 UTF-8 源文件，内容合计不超过 512 KiB；每个 content 字符串还受 262144 个 JavaScript 字符单元限制。文件路径最长 240 个字符，必须是符合 schema 的相对路径，不允许空段、`.`、`..`、重复路径或文件与目录冲突。入口文件必须实际包含在 files 中。

这个格式没有 npm / pip lockfile 安装编排，也不是二进制归档上传接口。控制平面只检查结构和内容完整性，不证明代码能正确执行。依赖必须在 Sandbox 中可用，或由你明确管理。

## 注册与选择版本

以下是接入片段，复用[首个 Session 教程](../../start/first-session.md)中的已初始化客户端和连接 ID。从仓库根目录读取现成的 [Python Harness 示例](../../../../../examples/harnesses/python-agent/main.py)；它使用标准库调用 Messages 模型，支持 shell、声明的远程 Tools 和对话历史。

```python
from pathlib import Path

harness = client.register_harness_package(
    id="custom.my-agent", version="1.0.0",
    protocol="hexagon-json-v1", interpreter="python3", entrypoint="main.py",
    capabilities=["conversation", "tools", "initialization"],
    model_providers=["anthropic-compatible"],
    files=[{"path": "main.py", "content": Path(
        "examples/harnesses/python-agent/main.py").read_text(encoding="utf-8")}],
)
definition = dict(
    harness={"id": harness["id"], "version": harness["version"]},
    sandbox_connection_id=sandbox_connection_id,
    model_connection_id=model_connection_id,
)
client.preflight_session(**definition)
# 按首个 Session 教程先持久保存创建意图，再创建 Session。
```

```typescript
import { readFile } from 'node:fs/promises';

const harness = await client.registerHarnessPackage({
  id: 'custom.my-agent', version: '1.0.0',
  protocol: 'hexagon-json-v1', interpreter: 'python3', entrypoint: 'main.py',
  capabilities: ['conversation', 'tools', 'initialization'],
  model_providers: ['anthropic-compatible'],
  files: [{ path: 'main.py', content: await readFile(
    'examples/harnesses/python-agent/main.py', 'utf8') }],
});
const definition = {
  harness: { id: harness.id, version: harness.version },
  sandbox_connection_id: sandboxConnectionId,
  model_connection_id: modelConnectionId,
};
await client.preflightSession(definition);
// Persist create intent using the first-Session tutorial before provisioning.
```

用 definition 直接创建 Session，无须先创建 Agent 模板。继续执行提交 Run、保存 Run ID、读取事件与结果、核验产物、关闭并确认清理的完整流程。注册返回的 digest 应与 id/version 一起记录。

同租户下相同规范化内容重复注册是幂等的；已有 id/version 内容变化或与 OCI 注册冲突返回 `harness_version_conflict`。更新代码需使用新版本，并创建选择新版本的 Session，现有 Session 保持固定版本。当前没有源码包删除接口。能力字段是作者声明，不是平台对任意源码的认证。

## stdin、凭据和工具调用

Runtime 在 Session 工作区运行入口，并通过 stdin 传入一个 JSON 对象，然后关闭 stdin。对象包含 protocol、run_id、input、initialization、model、native_session、artifact_directory 和 tools；首轮 native_session 可能缺省。Harness 需要自行保存历史，后续通过返回的 opaque native_session 找回同一会话。

使用传入的 `model.base_url` 和 `model.model`；不要将其替换为硬编码服务地址。当前 worker 提供的 `HEXAGON_MODEL_KEY` 是保护通道的委托访问凭据，原始模型账户密钥留在控制平面。`HEXAGON_TOOL_TOKEN` 只用于本 Run 的本地 Tool 邮箱。不要将这些值写到日志、模型上下文或产物。

远程 Tool 通过 `http://127.0.0.1:8765/tools/<run_id>/call` 调用，Authorization 为 `Bearer <HEXAGON_TOOL_TOKEN>`，JSON 为 `{"id":"<UUID>","name":"<declared name>","arguments":{}}`。同一逻辑调用使用相同 id 与参数轮询，直到 state 为 completed，再处理 result 和 isError。授权与审批等待由控制平面处理。为同一次调用重新生成 UUID 可能创建新的操作；不能以此重试未知外部副作用，也不能绕过邮箱直接获取绑定 Tool 凭据。

## 最终结果与失败

stdout 必须有且仅有一条有效的最终结果 JSON 行：

```json
{"type":"hexagon.result","text":"实际完成结果","native_session":"opaque-id","failed":false}
```

text 必须非空；native_session 可省略，提供时必须是 1—512 字符的字符串。最终记录不接受任意附加字段。普通日志不代替结果；缺失、重复、字段错误、failed 为 true 或非零退出都不能产生成功 Run。实际成功还依赖公共产物导出完成。将交付文件写入传入的 artifact_directory，工作区其他文件不会自动成为产物。

Runtime 管理进程和取消。用户断开事件连接不等于取消，取消也不会撤回已经执行的外部 Tool 写入。不要在进程内用无限重试隐藏中断或模型错误。

## 验证完成条件

至少验证两轮对话、一个实际 Tool、初始化（如声明）、产物、失败结果、取消和最终云资源清理。Python 与 TypeScript 客户端分别走完整旅程；自定义 Harness 使用 Python 并不能替代 Python SDK 的独立验证。保留准确版本、digest、组合与验证范围。

本页核对了注册 schema、SDK 方法、worker 委托凭据路径和示例源码；本次文档编写未重新运行实云任务，不能由此宣称新包已验收。

依据：[源码包实现](../../../../../modules/execution/harness-packages.ts)、[worker](../../../../../modules/execution/worker.ts)。下一步：[Harness 选择](../harnesses.md)、[断线与恢复](../../build/recovery.md)、[产物](../../build/artifacts.md)。
