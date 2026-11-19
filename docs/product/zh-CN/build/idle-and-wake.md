# 让空闲 Session 休眠并自动唤醒

Session 可以在两次 Run 之间进入空闲策略，并在下一次提交时自动准备执行环境。应用继续使用同一个 Session ID，无需在每次 submit 之前先调用 resume。

需要支持对应生命周期的 Sandbox / Harness 组合。单轮成功不证明休眠后可继续，查看[Harness serverless 验证记录](../../../../testing/evidence/2026-11-19-harness-serverless-matrix.json)中的具体组合与 SDK。

## 配置空闲时间

创建直接 Session 时设置策略：

```python
session = client.create_session(
    harness={'id': 'pi', 'version': '1.5.2'},
    sandbox_connection_id=sandbox_connection_id,
    model_connection_id=model_connection_id,
    resources={'idle_timeout_seconds': 60},
)
```

```typescript
const session = await client.createSession({
  harness: { id: 'pi', version: '1.5.2' },
  sandbox_connection_id: sandboxConnectionId,
  model_connection_id: modelConnectionId,
  resources: { idle_timeout_seconds: 60 },
});
```

当前默认 60 秒、最小 15 秒，控制平面每五秒检查资格，因此不要把超时值当精确的暂停完成时间。Provider 自动 standby 有自己的时序，可能早于平台计时器。

等待工具授权或审批的 Run 仍是活动 Run，不能当成两轮之间的空闲。应用应向用户提供处理入口，而不是靠暂停解决等待。

## 保留边界

| 策略 | 当前示例 Provider | 应依赖的边界 |
| --- | --- | --- |
| 内存暂停 | E2B、Freestyle、Instabox | 当前策略保留内存和文件；仍需具体组合验收 |
| 磁盘保留并重启 Runtime | Vercel、Upstash、Boat、Agent37 | 使用受管理工作区，避免依赖临时目录或进程状态 |
| 快照后重建资源 | Modal | Session ID 保持，底层资源 ID 会变化 |
| 暂停并允许冷启动回退 | Fly Machines | 文件系统是可靠边界，不保证内存始终保留 |
| Provider 管理 standby | Blaxel、Sprites | 不能从平台等待时间推断实际计费状态 |

Agent37 的 `/tmp` 会清空。任意临时文件、socket、后台服务和内存对象都不是跨 Provider 的统一持久化承诺。模型和 Tool 的原始密钥不会作为普通 guest 配置加入快照；普通用户 env 仍遵守其可读性边界。

## 下一轮与验证

第一轮在受管理工作区写入文件，同时提供一个可核对的对话信息。观察空闲生命周期后，用新的幂等键向同一 Session submit 第二轮，要求读取文件并复述前轮信息。分别核对文件和对话恢复，不以一个成功推断另一个。

若资源 ID 变化，核对 Session 记录中的新绑定，不使用缓存的供应商资源 ID 操作旧机器。活动 invocation 结果未知时，唤醒机制不能作为重新执行原任务的入口。

计划内休眠与终态关闭不同。close 删除云资源并结束 Session；睡眠仍可能有存储费用，到期和账户限制仍生效。完成任务后显式关闭并确认清理。

依据：[Serverless 策略与验证范围](../../../serverless-sessions.md)。下一步：[故障恢复](recovery.md)。
