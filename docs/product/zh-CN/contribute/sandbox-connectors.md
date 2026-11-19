# 添加 Sandbox 连接器

Sandbox 连接器把云资源操作与 guest 基础能力转换为共享控制平面契约。Harness 进程仍由 Sandbox Runtime 管理。Provider 特有的认证、传输、分页和生命周期逻辑放在连接器内部，不要把 Provider 分支加入通用 Run 编排。

改变行为前阅读[架构](../../../architecture.md)、[验收要求](../../../../testing/acceptance.md)与[代码地图](codebase.md)。本文描述扩展流程，示例不代表已经实现或实云验证了新的 Provider。

## 从实际契约开始

权威接口是 [SandboxConnector](../../../../modules/sandboxes/connector.ts)。可以用 [Boat](../../../../integrations/sandboxes/boat.ts)作为 HTTP 操作、精确操作查找与异步删除的紧凑参考。但它的私有端口与 TTL 语义属于特定 Provider，不能未经核对直接照搬。

| 契约 | 必须实现的行为 |
| --- | --- |
| `create(request)` | 使用操作与 Session 标识，遵守期限和网络策略；远程分配前拒绝不支持的策略；返回经过验证的资源身份和状态。 |
| `findByOperation(operation)` | 分页枚举全部精确匹配；如实返回零个、一个或多个结果，不能直接取第一项。 |
| `inspect(id)` | 只有确认不存在时返回 `null`；认证错误、超时和异常响应保持错误。 |
| `destroy(id)` | 按 Provider 语义确认删除；停止或接受删除请求都不足以证明清理完成。 |
| `execute(id, command, options)` | 保留 stdout、stderr、前台退出码与后台启动不确定性；执行边界限制，明确报告截断。 |
| `write` / `read` | 保持二进制字节一致，明确传输上限并核对完整性。 |
| `preview(id, port)` | 返回内部私有目标与服务端请求头；响应体结束后释放请求级隧道。 |

接口要求实现 `preview`，但只有完整访问链路可用时才能声明用户预览能力。不支持的路径应明确失败。Provider 账户密钥不得进入 guest 或浏览器；访问 Runtime 的私有传输还需独立成立，不能只考虑用户预览。

## 区分连接适配器和资源实现

`ConnectionAdapter` 提供严格配置 schema、能力列表以及 `validate(config, credential)`。验证只返回安全元数据，例如实际检查过的操作，不能返回上游响应体或 Token。列表请求成功只能证明列表权限，不能证明创建配额、镜像能力或完整执行权限。

以下是**结构示意，不是可运行实现**。`ExampleConnector` 需要实现完整接口，能力声明必须有相应依据：

```ts
import { z } from 'zod';
import type { ConnectionAdapter } from '../../modules/connections/connections.js';

export const exampleConfig = z.object({
  region: z.string().min(1),
}).strict();

// ExampleConnector is the provider implementation you supply.
export const exampleConnection: ConnectionAdapter = {
  kind: 'sandbox',
  provider: 'example',
  config: exampleConfig,
  capabilities: ['files', 'commands'],
  validate: (config, credential) =>
    new ExampleConnector(config, credential).validate(),
};
```

实现放在 integrations/sandboxes，在[共享注册表](../../../../integrations/sandboxes/registry.ts)加入适配器与工厂，并提供真实的 Provider 凭据设置入口。API 与 worker 使用同一个注册表。

**当前注册表的注意事项：**导出的适配器统一附带 `contract_tests: true` 和 `live_resource: true`。新增条目会继承这些声明。因此暴露新 Provider 前，必须取得相应证据，或把这里调整为逐 Provider 的证据元数据。注册本身不构成验证。保留的 Daytona 工厂用于历史资源清理，不能作为公开未验证候选项的范例。

## 先实现生命周期回执与恢复

共享[生命周期](../../../../modules/sandboxes/lifecycle.ts)、[操作台账](../../../../modules/sandboxes/operations.ts)和[镜像准备](../../../../modules/sandboxes/image-preparation.ts)负责持久化意图、所有权与 fencing。连接器必须提供崩溃后可对账的精确标识。

1. 将持久化的 `operation_id` 用于 Provider 幂等键，或精确名称和标签。超时后不能为了取得成功响应而换一个操作 ID 再创建。
2. 创建返回异步操作句柄时，在提供回调的情况下先调用 `request.record(resourceId, providerOperationId)`，再开始轮询。持久化失败时保留不确定结果。
3. 响应丢失后重建连接器，按原操作查找精确匹配。零结果不普遍等于没有分配，最终一致性或未结束的异步操作可能仍需调查；多个结果有歧义，不能随意认领其中一个。
4. 异步删除实现 `reconcileDeletion(id, context)`，先用 `context.record` 保存已接受的句柄，重启后继续查询同一操作。Boat 展示了为什么“资源提前消失，但没有删除回执”不足以确认彻底清除。
5. 端点等对象可能比计算资源存活更久时，实现 `cleanupAssociatedResources`。不能误删共享项目、账户凭据或其他 Session 的资源。

Provider 明确拒绝与传输结果未知是不同情况。`SandboxCreationRejected` 当前编码的是配额拒绝，只有 Provider 证明没有接受资源或操作时才可使用；不能把全部 429 或超时转成明确拒绝。

## 只声明真正支持的策略

可选方法与属性覆盖镜像准备、暂停恢复、快照、前置检查、原生委托访问和关联资源清理。需要实现完整生命周期，不能用空方法返回成功：

- `resumeMode: 'memory'` 与 `'filesystem'` 恢复语义不同。文件系统恢复需要重启 Runtime；如果冷启动清空 `/tmp`，workspace 与 Harness 缓存要放在持久目录。`reconcileResume` 对账已有资源，不能静默创建替代计算资源。
- 必要时声明控制平面执行期限，并验证重启后的对账。控制平面停止时不能保证及时删除。Provider 自动休眠、显式暂停、到期与删除是不同状态。
- 使用快照时先持久化 checkpoint 句柄，恢复时使用新的操作上下文，清理时删除所拥有的快照，并处理计算资源 ID 变化。
- 使用预构建镜像时实现 prepare、inspect、find、delete 生命周期，保存镜像和构建回执。只有真实链路支持时才声明公有或私有镜像仓库能力；仓库凭据留在控制平面。
- 不支持 allowlist 时在分配前拒绝。声明网络策略需要真实允许与拒绝探测。原生凭据访问只接受委托代理授权，不能传递上游原始密钥。

详见[无服务器生命周期](../concepts/serverless-lifecycle.md)与[能力和证据](../concepts/capabilities-and-evidence.md)。不要根据供应商品牌宣传推断能力。

## 完成用户配置入口

当前 Console 的 Provider 表单渲染、配置序列化和名称列表位于 [app.js](../../../../apps/console/app.js)。注册时同步更新相关路径；进入 catalog 不等于已经有完整配置表单。提供明确字段约束、凭据说明，以及只覆盖实际验证范围的反馈。

遵守 [Console 设计契约](../../../console-design.md)：使用应用自有的可访问控件、完整 en/zh-CN 文案目录、键盘与焦点行为，并实际检查两种语言。Sandbox 平台配置与模型端点、Agent Tools 分开。补充对应产品集成页，写明前置条件、限制、故障恢复和精确验证范围。

## 验证后再提升支持状态

先使用 fake transport 和现有 [Boat 测试](../../../../integrations/sandboxes/boat.test.ts)。至少覆盖：

| 场景 | 必须观察到的结果 |
| --- | --- |
| 不支持的策略 | 分配请求为零 |
| 创建响应丢失 | 保留原操作，不盲目二次创建 |
| 查找零个、一个、多个匹配 | 不虚报不存在，只在无歧义时精确认领，保留歧义 |
| 删除已接受、阻塞或响应丢失 | 先持久化句柄再轮询，重启后继续对账，不提前关闭 |
| 查询认证或网络失败 | 保留错误，不转换成资源不存在 |
| 二进制文件与命令错误 | 字节一致，非零退出码保留，超时或截断不记为成功 |
| 私有访问与隧道关闭 | guest、浏览器没有上游密钥，本地传输资源被释放 |
| 暂停恢复与期限 | workspace 保持，Runtime 按模式恢复，清理得到对账 |

现有参考实现的定向检查命令：

```sh
npx vitest run integrations/sandboxes/boat.test.ts
```

新增连接器需要自己的测试，并运行受影响的生命周期、操作、期限、checkpoint 和镜像准备测试。数据库配置与完整门禁见[测试指南](testing.md)。这些确定性结果不证明真实账户验证通过。

随后在真实 Provider 与模型上分别完成两种 SDK 的独立旅程、跨语言继续、已声明能力、故障恢复和确认清理；验证 Console 接入以及支持情况下的认证预览。保留私有资源 ID 和失败尝试，记录精确 Provider、Harness 版本或 digest、模型协议、SDK 产物、场景和日期。只有对应范围的证据才能提升[已验证组合](../integrations/verified-combinations.md)状态，不能从一个成功组合推导全部 Harness 或协议通过。

下一步：[测试与证据](testing.md)、[资源对账](../operate/reconciliation.md)、[已验证组合](../integrations/verified-combinations.md)。
