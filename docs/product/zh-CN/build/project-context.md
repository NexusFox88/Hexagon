# 给任务提供文件与上下文

在首次提交 Run 之前，把项目输入上传到 Session。上传的是工作区文件；它们不会自动变成模型的完整上下文，也不会自动作为最终 Artifact 导出。

先创建一个尚未提交任何 Run 的 Session，参见[首个 Session](../start/first-session.md)。以下片段接续已初始化的 `client` 和 `session`。

## 上传项目文件

Python 接受相对路径到 bytes 的映射：

```python
from pathlib import Path
import hashlib
source = Path('hello.py').read_bytes()
uploaded = client.upload(session['id'], {'src/hello.py': source})
assert uploaded[0]['sha256'] == hashlib.sha256(source).hexdigest()
assert uploaded[0]['size'] == len(source)
```

TypeScript 接受显式 base64 文件列表：

```typescript
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
const source = await readFile('hello.py');
const uploaded = await client.upload(session.id, [
  { path: 'src/hello.py', content_base64: source.toString('base64') },
]);
if (uploaded[0].sha256 !== createHash('sha256').update(source).digest('hex') ||
    uploaded[0].size !== source.length) throw new Error('Stored input mismatch');
```

在本机准备 `hello.py`，例如内容为 `print("hello")`。返回的 hash 和 size 验证控制平面保存的输入；它们并不单独证明云工作区已经准备好。下一次 Run 中要求 Agent 读取 `src/hello.py`、运行它并报告结果，以验证实际执行环境。

## 路径与上传时机

路径必须是工作区相对路径。拒绝绝对路径、反斜线、空段、`.`、`..` 和 NUL。单次请求中不能重复相同路径。首次执行前再次上传同一路径会更新保存的输入。

当前实现每请求允许 1—100 个文件，base64 字段每文件最多 2 MiB 字符，解码后总量最多 8 MiB。这不是“每个源文件 2 MiB”的承诺；base64 编码会增加长度。路径最多 500 字符。数值依据当前[输入实现](../../../../modules/execution/inputs.ts)，后续版本需重新核对。

首个 Run 提交后，或 Sandbox 已经关联后，上传返回 `workspace_already_started`。后续修改通过 Agent 执行完成；需要一份全新的原始项目时创建新 Session。启用了初始化配置时，`SOUL.md` 是保留路径，不能通过该接口覆盖。

## 文件与模型上下文

普通上传让文件存在于工作区。是否读取、如何理解，由任务指令和 Harness 的工具能力决定。不要把整个目录压入文本 prompt，也不要假设上传后模型已经逐字阅读全部内容。

Session 的 `context.files` 可以引用文件路径和预期 SHA-256。提交时控制平面核对文件存在、hash、大小和 UTF-8 内容，防止被引用的上下文在初始化后发生变化。当前被引用文本文件上限为 32768 bytes，拒绝 NUL 与无效 UTF-8；这与普通文件上传上限不同。详情见[初始化契约](../../../session-initialization.md)。

如果上下文引用缺失或不匹配，先解决 `context_file_missing` / `context_file_changed`，不要反复提交相同的无效配置。

## 环境与凭据

`env` / `variables` 用于普通配置，例如运行模式。Sandbox 代码可以读取这些值。模型、Provider 和 Tool 的受保护凭据应通过相应连接配置，不应为了“方便”复制进项目文件或环境值。

## 验证与后续

完成条件是：保存输入 hash 与本地一致，真实 Run 能读取指定文件并执行固定检查，最终所需交付文件写入 Run 产物目录并可下载。初始输入 hash、实际工作区内容和最终 Artifact 是三个分别需要验证的对象。

失败时保留 Session ID；非法路径可以在首次执行前修正，已经开始的工作区不能通过覆盖上传修复。完成后显式关闭 Session 并确认清理。下一步：[连续多轮工作](multi-turn.md)。
