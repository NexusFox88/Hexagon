# 注册并运行 OCI Harness

新 Harness 集成使用 OCI 镜像。注册解析镜像元数据并固定 Linux amd64 manifest digest；它不是一次 Agent 任务，也不证明运行成功。

需要 owner 身份、允许的 registry 镜像，以及兼容 Sandbox 和模型连接。当前 registry 为 Docker Hub / GHCR；其他来源不能当任意 URL 拉取。

## 注册并预检

以下接续已初始化的管理客户端。IMAGE_REFERENCE 是你已核对的镜像引用，protocol 必须匹配镜像内真实程序；示例使用 opencode-v1。

```python
harness = client.register_harness(
    image=image_reference, id='custom.project-agent', version='1.0.0',
    protocol='opencode-v1', capabilities=['conversation', 'tools'],
)
definition = dict(harness={'id': harness['id'], 'version': harness['version']},
                  sandbox_connection_id=sandbox_connection_id,
                  model_connection_id=model_connection_id)
client.preflight_session(**definition)
session = client.create_session(**definition)
```

```typescript
const harness = await client.registerHarness({
  image: imageReference, id: 'custom.project-agent', version: '1.0.0',
  protocol: 'opencode-v1', capabilities: ['conversation', 'tools'],
});
const definition = { harness: { id: harness.id, version: harness.version },
  sandbox_connection_id: sandboxConnectionId, model_connection_id: modelConnectionId };
await client.preflightSession(definition);
const session = await client.createSession(definition);
```

随后按[首个 Session](../../start/first-session.md)的持久提交方式运行任务、查询产物并关闭。保存注册返回的 image.digest 和实际配置；不要只记录可变 tag。相同定义重复注册幂等，同一 id/version 变更返回冲突，需新版本。source package 与 OCI 共用版本命名空间。

未指定 command 时取镜像 Entrypoint + Cmd；未指定 protocol 时从镜像 label 或默认 JSON 协议推导。检查推导结果，不能假设任意 CLI 镜像天然兼容。

## Provider 与身份边界

Modal 和 Fly Machines 支持原生 OCI；Fly 当前仅公开镜像。E2B 当前以 Session 自有 Template 构建公开 OCI 镜像，构建和创建有独立操作记录，关闭先清理计算再清理模板。其新增镜像组合仍需逐项验收。

Modal 会派生镜像补齐 Runtime 前提，支持的包管理器有限。准备阶段使用 root；当前代码写回镜像 USER，但既有运行说明报告实际执行为 root，因此 USER 不是已验证的安全边界。需要依赖身份时核验实际 uid，详见 [Modal 接入](../sandboxes/modal.md)。Fly 也可能准备 Runtime 依赖并以 root 执行。镜像 digest 标识源镜像，不表示运行文件系统从未被准备过程改变。

私有 registry 使用 enabled Secret，内容为 username/password JSON；密钥不进入普通 Agent 环境。私有镜像能力与公开 OCI 分开预检。镜像解析、拉取、工具调用和清理各需验证。

## 构建与失败

仓库模板可用 `node --import tsx tooling/build-harness-images.ts all` 构建，不自动 push。构建可能下载依赖并创建本地镜像；检查各模板要求。recipe 不是已发布产物。

缺失入口、架构不支持、拉取授权、Runtime 依赖、模型协议和输出协议分别定位。模板 build receipt 丢失时查原操作，不能自动开始第二次构建。失败仍需保留并清理模板 / 资源。

依据：[镜像契约](../../../../harness-images.md)、[注册实现](../../../../../modules/harnesses/images.ts)。下一步：[协议选择](../model-protocols.md)、[恢复](../../build/recovery.md)。
