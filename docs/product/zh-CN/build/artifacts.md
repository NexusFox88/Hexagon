# 获取、保留和交付任务产物

Artifact 是从 Run 工作区导出的文件快照。它归控制平面存储管理，能够在 Session 的云资源关闭后继续下载。

本页接续[首个 Session](../start/first-session.md)。你需要已授权的 Run ID 和客户端。

## 要求任务导出文件

在指令中要求 Agent 把交付文件放入其收到的 Run artifact directory。当前工作区路径为 `artifacts/<run-id>/`，每轮独立。不要仅要求“保存到项目目录”，否则文件可能存在但没有被导出。

worker 在 Harness 退出后导出产物，再完成对应 Run。超出限制会显式失败，不会默默丢弃超限文件。最终回答声称创建了文件不等于导出成功；查询实际 Artifact 列表。

## 下载与校验

Python：

```python
from pathlib import Path
import hashlib
output = Path('downloads')
output.mkdir(exist_ok=True)
items = client.artifacts(run_id)['artifacts']
for index, item in enumerate(items):
    data = client.download_artifact(item['id'])
    if len(data) != item['size'] or hashlib.sha256(data).hexdigest() != item['sha256']:
        raise RuntimeError('Artifact integrity mismatch')
    (output / f'output-{index}.bin').write_bytes(data)
```

TypeScript：

```typescript
import { mkdir, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
await mkdir('downloads', { recursive: true });
const { artifacts } = await client.artifacts(runId);
for (const [index, item] of artifacts.entries()) {
  const bytes = await client.downloadArtifact(item.id);
  if (bytes.length !== item.size || createHash('sha256').update(bytes).digest('hex') !== item.sha256)
    throw new Error('Artifact integrity mismatch');
  await writeFile(`downloads/output-${index}.bin`, bytes);
}
```

输出目录应由调用方控制且不含敏感同名文件；示例会覆盖其中的 `output-N.bin`。真实应用可使用独立任务目录并采用排他写入。不要直接把远端名称当作本地绝对路径。

元数据包括 name、size、sha256、Session ID、Run ID 和创建时间。API 以二进制内容提供下载。交付给浏览器时，应用仍需检查业务权限，并选择安全的内容类型和下载文件名。

## 限制与保留

当前每个 Run 最多 64 个文件，每文件 4 MiB，总计 8 MiB。导出不接受符号链接或非普通文件。具体校验见[产物实现](../../../../modules/artifacts/artifacts.ts)与 Runtime 导出逻辑。

导出内容存储于 PostgreSQL，Session close 不删除这些内容。后续 Run 修改同名工作区文件不会覆盖前一 Run 的快照。这不是无限容量或永久归档保证：数据库备份、存储容量和你部署的保留政策仍需管理。

## 常见问题与验收

空列表时先看 Run 是否终态、文件是否写在正确目录、Harness 是否实际执行、导出是否失败。不要为了查文件重新提交任务。跨租户的 Artifact ID 不应可读；业务应用也必须验证接收者。

完成验证应包含：列表存在、hash 与长度正确、文件内容符合任务、关闭 Session 后相同 Artifact ID 仍可下载。关闭失败时保留 Session 和资源记录，不能把产物成功当作云清理成功。

下一步：[私有 Web 预览](private-preview.md)。
