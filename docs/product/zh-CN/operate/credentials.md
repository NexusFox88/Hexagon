# 管理和轮换受保护凭据

轮换前先确认你在更换哪类秘密：应用 API Token、上游账户凭据、OCI registry Secret，还是数据库加密主密钥。它们没有相同的更新路径。

应用 Token 见[身份管理](access-control.md)。本页讨论受保护连接引用的 Managed Secret；它的原始值只写入、不回显，不能通过读取 API 导出。

## 列出影响范围

用 `secret(secret_id)` 查询元数据及依赖连接 / Harness。为每个依赖记录当前验证与启用状态、活动 Session 和计划清理方式。先安排任务结束，再轮换；旧凭据是否还能在供应商侧使用由供应商决定，不能依赖 Hexagon 自动撤回上游权限。

## 更新值并重新验证

以下接续 owner 客户端，值由私有环境提供：

```python
import os
client.update_secret(secret_id, value=os.environ['REPLACEMENT_SECRET'])
for connection_id in dependent_connection_ids:
    result = client.validate_connection(connection_id)
    if result['status'] != 'ready':
        raise RuntimeError('Dependent connection remains disabled')
    client.update_connection(connection_id, enabled=True)
```

```typescript
const replacement = process.env.REPLACEMENT_SECRET;
if (!replacement) throw new Error('Missing replacement secret');
await client.updateSecret(secretId, { value: replacement });
for (const id of dependentConnectionIds) {
  const result = await client.validateConnection(id);
  if (result.status !== 'ready') throw new Error('Dependent connection remains disabled');
  await client.updateConnection(id, { enabled: true });
}
```

`dependent*` 来自事先读取的引用清单。更新值或 enabled 会在同一事务中禁用依赖连接、清空验证并递增版本。循环部分不是跨所有连接的原子操作；中途失败时保留已处理清单，不声称所有依赖已恢复。

轮换后创建新 Session 使用新版本策略。旧 Session 固定的授权不能被假定为自动迁移；已接受的上游请求可能继续完成，撤销不能倒转副作用。

## 禁用、删除与 registry

禁用 Secret 不删除上游账户。删除仍被未删除连接或 Harness 镜像注册引用的 Secret，会返回 `secret_in_use`。不要直接删除数据库引用来绕过保护。

registry Secret 用于获准的镜像拉取路径，轮换在后续 provisioning 读取；它不是注入 Agent 的环境值。新镜像拉取、私有 registry 支持和既有注册引用需要分别检查。

## 主密钥和恢复

以上 API 更新的是上游秘密，不是加密主密钥。当前没有可由这里调用的通用主密钥轮换流程。替换 master.key 或 hosted HEXAGON_MASTER_KEY 会使既有加密数据无法正常解密；不要作为排障步骤尝试。

备份必须保留匹配数据库、密钥与部署身份，使用可信私有存储。Secret 删除是逻辑删除，历史加密信封可能保留，不是物理擦除保证。

验证应确认新 Session 可访问获准服务、旧授权后续请求被拒绝、所有依赖逐一验证、日志 / guest 环境没有原始密钥。依据：[Managed Secrets](../../../../modules/credentials/managed-secrets.ts)、[凭据边界](../../../secret-management.md)。下一步：[连接生命周期](../build/connection-lifecycle.md)。
