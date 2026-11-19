# 管理身份、权限与应用 Token

应用后端使用 application Token 执行已配置工作；owner 身份负责连接、凭据和其他管理操作。两类身份属于控制平面租户，不自动等同你的产品用户或团队角色。

## 选择身份

local Console 和 SDK 通过受保护的本地发现连接工作区。远程 SDK 使用明确 base URL 和 Token。不要把本地发现文件复制成公共配置，或将 owner Token 放进浏览器。

application Token 可以读取允许的任务资源、创建 Session、提交 / 取消 Run、上传初始文件、关闭 Session、管理自身可访问的预览与委托访问。它也可创建 Agent，但不能因此推断允许修订 / 归档。连接 CRUD、Secret、Token 管理、审批决定、工具拒绝 / 对账等管理路由不在其允许范围。准确列表见[路由权限实现](../../../../modules/credentials/application-tokens.ts)。

同一租户中的多个业务用户仍由应用执行归属校验。拿到一个 Session ID 不代表有业务权限；Token 也不是自动限定到某个单独 Session 的密钥。

## 创建 Token

通过 Console 或有 owner 权限的后端执行：

```python
issued = owner_client.create_token('application backend', expires_in_days=30)
# 将 issued['token'] 一次性写入私有部署凭据存储，保留 issued['id'] 用于管理。
```

```typescript
const issued = await ownerClient.createToken('application backend', 30);
// Store issued.token in private deployment credentials; retain issued.id for administration.
```

创建返回一次可用明文 Token；列表只返回元数据。数据库保存摘要，不提供找回旧明文接口。有效期当前为 1—365 天，默认 30 天。不要把整个返回对象写入普通日志。

## 轮换与撤销

`rotate_token` / `rotateToken` 在事务中撤销旧 Token 并返回新 ID 和新值，保留旧的到期时间，不重新延长寿命。调用返回后旧 Token 已失效，因此需要安排客户端切换窗口。

如果需要应用层平滑切换，可以先创建独立新 Token、部署并验证，再撤销旧 Token；这与原子 rotate 不同，重叠有效期由你管理。不要把新值发送到不受信任的客户端。

`revoke_token` / `revokeToken` 撤销指定 application Token。列表中的 last_used_at 有助于调查使用情况，但不能单独证明所有部署已完成轮换。

## 诊断和验收

401 先核对 Token 格式、撤销 / 过期和正确控制平面；403 `owner_token_required` 表示路由需要管理身份，不应把应用权限错误当作密码错误反复重试。

验证允许的执行调用成功、管理路由被拒绝、旧 Token 在轮换后失败、新 Token 保留原到期时间、撤销后后续鉴权失败。再用两个业务用户检查应用层不能互读任务，及跨租户不能读取或绑定资源。

依据：[Token 生命周期](../../../../modules/credentials/application-tokens.ts)、[鉴权](../../../../modules/credentials/api-auth.ts)。下一步：[凭据轮换](credentials.md)、[后端集成](../build/backend-integration.md)。
