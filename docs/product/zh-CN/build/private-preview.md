# 安全地预览 Agent 创建的 Web 应用

私有预览把 Session 内某个 HTTP 端口通过短期授权提供给浏览器。适用于检查 Agent 创建的页面和交互；它不等于生产应用发布。

需要尚未关闭的 Session、已创建的云 Sandbox、支持私有访问的 Provider，以及正在监听的 HTTP 服务。创建授权不会替你启动 Web 服务。

## 启动被预览的服务

要求 Agent 在工作区创建一个简单 HTML 页面并启动 HTTP 服务，明确端口，例如 3000。先让任务通过本地 HTTP 请求确认服务返回预期内容，再申请预览。

需要进程跨越 Harness 退出继续运行时，应使用对应 Runtime / Provider 可支持的后台方式；不要只看到一条“started”文本就认为进程仍然存活。初次测试使用不依赖 WebSocket、外部资源或登录 cookie 的静态页面，更容易定位传输问题。

## 创建和撤销授权

以下片段接续已初始化的 `client` 和已授权的 Session ID。需要在撤销前实际打开 URL 完成验证。

```python
preview = client.create_preview(session_id, port=3000, ttl_seconds=600)
# 在有权访问的浏览器中打开 preview['url']；不要写入公共日志。
# 完成页面检查后：
client.revoke_preview(preview['id'])
```

```typescript
const preview = await client.createPreview(sessionId, 3000, 600);
// Open preview.url in an authorized browser; do not write it to public logs.
// After completing the inspection:
await client.revokePreview(preview.id);
```

可选端口范围为 3000—8999，但排除 Runtime 管理端口 8765。授权寿命为 30—3600 秒，默认 600 秒。返回包含授权 ID、到期时间和访问 URL。

## 访问边界

本地预览默认使用 8788 端口，每个授权具有不同的 `<id>.localhost` origin。入口 ticket 换取 host-only HttpOnly cookie，并从地址栏移除。每次请求检查授权是否到期、撤销，以及 Session 是否仍可用。关闭 Session 会使预览失效。

Provider 访问凭据由服务端使用，不交给浏览器。URL 的 ticket 本身也是访问凭据，分享 URL 就可能授予接收者访问能力。应用只应把它交给已通过业务权限检查的用户。

hosted 部署需要独立预览域名、通配路由和 TLS。预览内容不能与 Console 共用 origin；Agent 生成的 HTML 是不可信应用内容。

## 当前支持范围

支持同一预览 origin 下的 HTTP 页面、静态资源、表单和 API 请求。当前不支持 WebSocket upgrade、上游应用 cookie、任意外部重定向与外部浏览器资源。因此依赖 HMR WebSocket 的开发页面或依赖外部 CDN 的页面可能不完整；先验证普通 HTTP 页面，再逐项定位需求。

Run 完成不意味着预览服务被自动关闭，也不保证它一定仍在运行。后台进程、空闲暂停、到期和 Session 关闭都会影响访问。暂停后的内存 / 进程连续性依赖 Provider，不能把预览当永久网址。

## 故障与成功条件

`preview_session_unavailable` 表示先检查 Session 是否 open、有云资源、未过期；创建授权成功但加载失败时，检查服务端口和进程、Provider 私有访问、控制平面代理，再检查浏览器 origin / TLS。不要为预览问题重复创建 Run 或公开供应商端口。

用真实浏览器操作页面，随后分别验证无授权、自然过期、显式撤销和关闭 Session 后的拒绝行为。不同授权的 cookie 不应相互通用。当前文章依据实现核对，未宣称本轮完成这些浏览器验收。

实现依据：[授权生命周期](../../../../modules/sandboxes/previews.ts)、[现有 SDK 支持范围](../../../../sdk/README.md#web-previews)。下一步：[获取产物](artifacts.md)，将需要保留的交付文件独立导出。
