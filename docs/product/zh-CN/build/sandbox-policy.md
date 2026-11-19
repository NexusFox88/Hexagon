# 配置 Sandbox 资源与网络策略

在创建 Session 前声明任务所需策略，再预检组合是否满足。配置通过只说明结构和声明兼容，真实网络限制需要云环境中的允许 / 拒绝探测证明。

## 资源字段的实际范围

当前 Session `resources` 接受 `timeout_seconds` 与 `idle_timeout_seconds`，不是任意 CPU / 内存对象。超时范围为 60—3600 秒，默认 600；空闲范围为 15—3600 秒，默认 60。实际生命周期会将 idle 阈值限制在 timeout 减十秒以内。Provider 的模板、规格和配额可能在 Sandbox 连接配置中选择，按对应连接 schema 使用。

不要把 timeout 理解为所有供应商完全相同的墙钟计费时限。持久 Provider 的期限与暂停策略不同，见[生命周期](../../../serverless-sessions.md)。

## 配置 allowlist 并预检

以下片段中的 `credential_host` / `credentialHost` 必须是当前受保护凭据通道 URL 的 hostname；不包含 scheme、端口或路径。示例目标域名用于说明，正式运行应替换为获准的目标。

```python
definition = dict(
    harness={'id': 'pi', 'version': '1.5.2'},
    sandbox_connection_id=sandbox_connection_id,
    model_connection_id=model_connection_id,
    resources={'timeout_seconds': 600, 'idle_timeout_seconds': 60},
    network={'mode': 'allowlist', 'allowed_hosts': [credential_host, 'example.com']},
    required_capabilities=['network_allowlist'],
)
check = client.preflight_session(**definition)
if not check['ready']:
    raise RuntimeError('Preflight did not establish readiness')
session = client.create_session(**definition)
```

```typescript
const definition = {
  harness: { id: 'pi', version: '1.5.2' },
  sandbox_connection_id: sandboxConnectionId,
  model_connection_id: modelConnectionId,
  resources: { timeout_seconds: 600, idle_timeout_seconds: 60 },
  network: { mode: 'allowlist' as const, allowed_hosts: [credentialHost, 'example.com'] },
  required_capabilities: ['network_allowlist'],
};
const check = await client.preflightSession(definition);
if (!check.ready) throw new Error('Preflight did not establish readiness');
const session = await client.createSession(definition);
```

若 Provider 不支持网络 allowlist，会拒绝 `network_policy_unsupported`；缺少凭据通道主机时出现 `credential_proxy_not_allowed_by_network_policy`。不要自动退回 unrestricted。临时入口 hostname 变化后需要重新核对配置，不能假设旧 allowlist 仍可用。

## 哪一层的策略

Sandbox 出站策略约束云环境的网络能力。Agent Tool 操作选择约束允许调用的业务操作；受保护模型和 HTTP 连接约束控制平面允许代理的目标。外部工具请求可能由控制平面发出，不能仅凭 Sandbox allowlist 推断所有 Tool 的目标都被它过滤。

`required_capabilities` 是请求必需能力，不能通过添加字符串使 Provider 获得新能力。预检还检查 Harness 模型协议、Tools、初始化和 OCI 等兼容性。当前组合结构中的 `verification.status` 为 unverified，不代表刚执行了云验收。

## 验证真实生效

在已支持的专用组合上，从 Sandbox 对一个获准域名发出请求，再对未获准域名发出请求，核对前者成功、后者拒绝。同时确认模型凭据通道可用。记录实际执行结果、Provider 和 Harness 版本；API 接受 JSON 不足以证明网络约束生效。

若失败，区分 schema 不合法、能力不支持、通道被阻止、账户配额和云网络异常，保留资源标识并清理。依据：[请求 schema](../../../../modules/execution/sessions.ts)、[组合解析](../../../../modules/execution/compatibility.ts)。下一步：[Tools](tools.md)、[恢复](recovery.md)。
