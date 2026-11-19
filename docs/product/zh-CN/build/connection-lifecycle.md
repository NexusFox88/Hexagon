# 更换连接并管理既有 Session

连接表示控制平面中的一个 Provider、模型或工具账户配置。更新、禁用、关闭依赖 Session 和删除连接是不同操作，分别影响配置可用性和资源生命周期。

需要连接管理权限；普通应用执行 Token 不能更新或删除连接。变更前记录连接 ID、受影响的 Session 和需要保留的执行证据。

## 更新后重新验证

Python：

```python
import os
client.update_connection(connection_id, credential=os.environ['REPLACEMENT_CREDENTIAL'])
checked = client.validate_connection(connection_id)
if checked['status'] != 'ready':
    raise RuntimeError('Connection verification failed; keep it disabled')
client.update_connection(connection_id, enabled=True)
```

TypeScript：

```typescript
const replacement = process.env.REPLACEMENT_CREDENTIAL;
if (!replacement) throw new Error('Missing replacement credential');
await client.updateConnection(connectionId, { credential: replacement });
const checked = await client.validateConnection(connectionId);
if (checked.status !== 'ready') throw new Error('Verification failed; keep disabled');
await client.updateConnection(connectionId, { enabled: true });
```

这是通过环境读取替换凭据的后端片段，不应打印变量内容。配置或凭据变更会使旧验证失效并禁用连接；不能在同一次更新中用 `enabled: true` 跳过重新验证。验证可能访问供应商接口，模型验证可能产生调用费用。

## 禁用的影响

对 Sandbox 和模型连接，禁用会阻止新 Session 和既有 Session 的新 Run。worker 在新 Harness invocation 前也检查，覆盖排队后禁用的情况。已经接受的同一幂等请求仍可返回原 Run，已有 invocation 的恢复和原资源清理仍需进行。

```python
client.update_connection(connection_id, enabled=False)
```

```typescript
await client.updateConnection(connectionId, { enabled: false });
```

禁用不是终止所有已发出外部调用的按钮，也不撤销供应商账户凭据。既有 Session 固定自己的配置，不会因为连接更新自动改成新执行定义。要使用新配置，按需求创建新 Session。

## 先清理依赖，再删除

查询依赖 Session，处理活动 Run，逐一 close 并确认云资源清理。仍有依赖时删除返回 `connection_in_use`。unknown 删除结果需要对账，不能为消除依赖而直接删除数据库记录。

完成依赖处理后调用 `delete_connection` / `deleteConnection`。它删除 Hexagon 中的连接，不删除供应商账户，也不等于在供应商侧撤销 API key。若要停用上游凭据，另行在供应商账户执行相应管理流程。

## 验收

在专用测试连接上验证：正常任务 → 禁用 → 新任务被拒绝 → 已有资源可清理 → 无依赖后可删除。更新凭据时分别测试错误凭据保持禁用和正确凭据验证后启用。核对旧 Session 初始化快照不被重写。

依据：[连接实现](../../../../modules/connections/connections.ts)、[执行边界](../../../architecture.md)。下一步：[故障恢复](recovery.md)。
