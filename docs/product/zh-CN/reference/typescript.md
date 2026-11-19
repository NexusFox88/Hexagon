# TypeScript SDK 参考

`@hexagon/agent-sdk` 是 ESM 包，当前版本 `0.1.0`，package manifest 要求 Node.js >=20；控制平面仓库单独要求 Node.js >=22.19.0。不能从 Node 包要求推断浏览器或 edge runtime 兼容。本地发现会导入 Node filesystem、path、OS 模块，应在可信后端运行。

从当前 checkout 构建，再安装到自己的 Node 应用：

```sh
# Hexagon 仓库根目录
npm --prefix sdk/typescript run build
# 在独立应用目录中，替换成真实 checkout 路径：
npm install /absolute/path/to/Hexagon/sdk/typescript
```

绝对路径为占位，不代表已公开发布到 npm。参见 [package.json](../../../../sdk/typescript/package.json)，记录版本之外的安装产物与源码 revision。

## 初始化客户端

```typescript
import { Hexagon, HexagonError } from '@hexagon/agent-sdk';

const client = await Hexagon.local();
// 或在可信后端进程中：
// const client = new Hexagon(apiOrigin, applicationToken);
```

显式 URL 不包含 `/v1`，SDK 会追加它。构造不发验证请求。`local({dataDirectory, baseUrl})` 返回 Promise，验证私有工作区文件与回环身份；可选 baseUrl 核对发现端点，不切换为 hosted 认证。见 [local.ts](../../../../sdk/typescript/local.ts)。

不要把控制平面 Token 打包到前端。由后端认证业务用户并转发有权访问的结果。没有客户端级 dispose 方法；`close(session)` 请求关闭 Session。退出事件迭代会释放 reader，不取消执行。

## 公共方法与实际返回类型

清单使用已安装 TypeScript 编译器，从源码声明及推断返回类型生成。初始化值体现真实默认参数，保留 `Promise<any>`，不编造响应模型。类型不会在运行时校验 JSON。通用 request 遇到 HTTP 204 返回 undefined，即使调用者给出了不兼容的泛型也如此。

<!-- ts-methods:begin -->

| 声明 | 推断返回类型 |
| --- | --- |
| <code>static async local(options:import('./local.js').LocalOptions={})</code> | <code>Promise&lt;Hexagon&gt;</code> |
| <code>constructor(base: string, private token: string)</code> | <code>Hexagon</code> |
| <code>async request&lt;T = any&gt;(method: string, path: string, body?: unknown, headers: Record&lt;string, string&gt; = {}, signal?: AbortSignal): Promise&lt;T&gt;</code> | <code>Promise&lt;T&gt;</code> |
| <code>createPreview(session: string, port: number, ttlSeconds = 600)</code> | <code>Promise&lt;any&gt;</code> |
| <code>revokePreview(id: string)</code> | <code>Promise&lt;any&gt;</code> |
| <code>registerHarness(input: HarnessImageInput)</code> | <code>Promise&lt;any&gt;</code> |
| <code>registerHarnessPackage(input: unknown)</code> | <code>Promise&lt;any&gt;</code> |
| <code>applications()</code> | <code>Promise&lt;any&gt;</code> |
| <code>configureApplicationOAuth(provider:string,input:{client_id:string;client_secret:string;redirect_uri:string})</code> | <code>Promise&lt;any&gt;</code> |
| <code>authorizeConnection(id:string)</code> | <code>Promise&lt;any&gt;</code> |
| <code>authorizationFlow(id:string)</code> | <code>Promise&lt;any&gt;</code> |
| <code>cancelAuthorization(id:string)</code> | <code>Promise&lt;any&gt;</code> |
| <code>overview()</code> | <code>Promise&lt;any&gt;</code> |
| <code>listSessions(query:{limit?:number;offset?:number;search?:string;state?:string}={})</code> | <code>Promise&lt;any&gt;</code> |
| <code>listRuns(query:{limit?:number;offset?:number;search?:string;state?:string}={})</code> | <code>Promise&lt;any&gt;</code> |
| <code>pending(limit=25,offset=0)</code> | <code>Promise&lt;any&gt;</code> |
| <code>approvals(run:string)</code> | <code>Promise&lt;any&gt;</code> |
| <code>connectionDependencies(id:string)</code> | <code>Promise&lt;any&gt;</code> |
| <code>listTokens()</code> | <code>Promise&lt;any&gt;</code> |
| <code>createToken(label:string,expiresInDays=30)</code> | <code>Promise&lt;any&gt;</code> |
| <code>rotateToken(id:string)</code> | <code>Promise&lt;any&gt;</code> |
| <code>revokeToken(id:string)</code> | <code>Promise&lt;any&gt;</code> |
| <code>deployment()</code> | <code>Promise&lt;any&gt;</code> |
| <code>updateDeployment(config:unknown,expectedRevision:string)</code> | <code>Promise&lt;any&gt;</code> |
| <code>retryIngress()</code> | <code>Promise&lt;any&gt;</code> |
| <code>resourceOperations(limit=50,offset=0)</code> | <code>Promise&lt;any&gt;</code> |
| <code>resourceOperation(id:string)</code> | <code>Promise&lt;any&gt;</code> |
| <code>reviewResourceOperation(id:string,action:'acknowledge'&#124;'reopen'&#124;'reconcile',note='')</code> | <code>Promise&lt;any&gt;</code> |
| <code>catalog()</code> | <code>Promise&lt;any&gt;</code> |
| <code>createSecret(input: {name:string;value:string})</code> | <code>Promise&lt;any&gt;</code> |
| <code>sessionEnvironment(id:string)</code> | <code>Promise&lt;any&gt;</code> |
| <code>sessionAuthorization(id:string)</code> | <code>Promise&lt;any&gt;</code> |
| <code>revokeSessionConnection(id:string,connection:string)</code> | <code>Promise&lt;any&gt;</code> |
| <code>listSecrets()</code> | <code>Promise&lt;any&gt;</code> |
| <code>secret(id:string)</code> | <code>Promise&lt;any&gt;</code> |
| <code>updateSecret(id:string,input:{name?:string;value?:string;enabled?:boolean})</code> | <code>Promise&lt;any&gt;</code> |
| <code>deleteSecret(id:string)</code> | <code>Promise&lt;any&gt;</code> |
| <code>preflightSession(input:SessionInput)</code> | <code>Promise&lt;SessionPreflight&gt;</code> |
| <code>createAccess(session:string,connectionId:string)</code> | <code>Promise&lt;any&gt;</code> |
| <code>listAccess(session:string)</code> | <code>Promise&lt;any&gt;</code> |
| <code>revokeAccess(id:string)</code> | <code>Promise&lt;any&gt;</code> |
| <code>listConnections()</code> | <code>Promise&lt;any&gt;</code> |
| <code>connection(id:string)</code> | <code>Promise&lt;any&gt;</code> |
| <code>createConnection(input: unknown)</code> | <code>Promise&lt;any&gt;</code> |
| <code>discoverMcpTools(id:string)</code> | <code>Promise&lt;any&gt;</code> |
| <code>connectionAuthorization(id:string)</code> | <code>Promise&lt;any&gt;</code> |
| <code>disconnectConnection(id:string)</code> | <code>Promise&lt;any&gt;</code> |
| <code>validateConnection(id: string)</code> | <code>Promise&lt;any&gt;</code> |
| <code>updateConnection(id: string, input: unknown)</code> | <code>Promise&lt;any&gt;</code> |
| <code>deleteConnection(id: string)</code> | <code>Promise&lt;any&gt;</code> |
| <code>listAgents()</code> | <code>Promise&lt;any&gt;</code> |
| <code>agent(id:string)</code> | <code>Promise&lt;any&gt;</code> |
| <code>reviseAgent(id:string,definition:AgentInput,expectedRevision:number)</code> | <code>Promise&lt;any&gt;</code> |
| <code>archiveAgent(id:string)</code> | <code>Promise&lt;any&gt;</code> |
| <code>copyAgent(id:string,name:string)</code> | <code>Promise&lt;any&gt;</code> |
| <code>preflightAgent(definition:AgentInput,bindings:Omit&lt;SessionInput,'agent_id'&gt;)</code> | <code>Promise&lt;SessionPreflight&gt;</code> |
| <code>createAgent(input: AgentInput)</code> | <code>Promise&lt;any&gt;</code> |
| <code>createSession(input: SessionInput)</code> | <code>Promise&lt;any&gt;</code> |
| <code>sessionInitialization(id:string)</code> | <code>Promise&lt;SessionInitialization&gt;</code> |
| <code>session(id: string)</code> | <code>Promise&lt;any&gt;</code> |
| <code>upload(session: string, files: { path: string; content_base64: string }[])</code> | <code>Promise&lt;any&gt;</code> |
| <code>submit(session: string, input: string, idempotencyKey: string, origin?:RunOrigin)</code> | <code>Promise&lt;Run&gt;</code> |
| <code>run(id: string)</code> | <code>Promise&lt;Run&gt;</code> |
| <code>toolCalls(run: string)</code> | <code>Promise&lt;any&gt;</code> |
| <code>denyToolAuthorization(run: string, call: string, requestHash: string)</code> | <code>Promise&lt;any&gt;</code> |
| <code>resolveToolCall(run: string, call: string, resolution: { request_hash: string; outcome: 'completed' &#124; 'failed'; text: string; evidence: string })</code> | <code>Promise&lt;any&gt;</code> |
| <code>cancel(id: string)</code> | <code>Promise&lt;Run&gt;</code> |
| <code>pause(session:string,scope:'session'&#124;'sandbox'='session')</code> | <code>Promise&lt;any&gt;</code> |
| <code>resume(session:string)</code> | <code>Promise&lt;any&gt;</code> |
| <code>sessionActivity(period:'24h'&#124;'7d'='24h')</code> | <code>Promise&lt;any&gt;</code> |
| <code>close(session: string)</code> | <code>Promise&lt;any&gt;</code> |
| <code>decide(approval: string, approved: boolean)</code> | <code>Promise&lt;any&gt;</code> |
| <code>events(run: string, after = '0')</code> | <code>Promise&lt;{ events: RunEvent[]; }&gt;</code> |
| <code>artifacts(run: string)</code> | <code>Promise&lt;{ artifacts: Artifact[]; }&gt;</code> |
| <code>async downloadArtifact(id: string): Promise&lt;Uint8Array&gt;</code> | <code>Promise&lt;Uint8Array&lt;ArrayBufferLike&gt;&gt;</code> |
| <code>async *stream(run: string, after = '0', signal?: AbortSignal): AsyncGenerator&lt;RunEvent&gt;</code> | <code>AsyncGenerator&lt;RunEvent, any, any&gt;</code> |

<!-- ts-methods:end -->

运行 `node tooling/generate-typescript-doc-index.mjs` 重新生成。unknown、输入对象与查询值仍由服务端 schema 验证。可选查询字段应省略，不显式传 undefined，因为列表方法会字符串化已提供的键值。分页显式处理；events、artifacts 保留 collection envelope。

## 导出类型

| 类型 | 含义与限制 |
| --- | --- |
| SessionInput／AgentInput | 配置输入，可选字段不能约束全部跨字段规则，例如 harness 与 agent_id 必须二选一 |
| AgentBehavior／AgentEnvironment | 初始化和 guest 环境；guest 可读环境变量，它不是受管凭据存储 |
| HarnessImageInput | OCI 注册字段与协议 union；服务端解析固定 digest 并检查兼容 |
| SessionPreflight | 就绪、组合、生命周期与凭据边界；结构支持与真实证据分开 |
| SessionInitialization | 历史固定快照、环境名称与脱敏元数据，不是含秘密的重放数据 |
| Run／RunOrigin | Run 状态、输出、错误与可选关联信息；state 是 string，不是完整状态机枚举 |
| RunEvent | 可选字符串 id、type 与 unknown payload；根据 type 缩小 payload 类型 |
| Artifact | 产物元数据；downloadArtifact 单独返回字节 |
| HexagonError | 包含数字 status 与字符串 code 的异常 |

定义见 [index.ts](../../../../sdk/typescript/index.ts)。LocalOptions 在 local.ts 声明，package exports 暴露根入口，不承诺提供公开 local 子路径导入。

## 带上下文的常见调用

片段需要已初始化客户端、就绪连接 ID、已保存提交意图及应用持久化函数，不含完整恢复与清理；完整流程见[首个 Session 程序](../../../../examples/documentation/first-session.ts)。

```typescript
const session = await client.createSession({
  harness: {id: 'pi', version: '1.5.2'},
  sandbox_connection_id: sandboxId,
  model_connection_id: modelId,
});
await saveSessionId(session.id);
await client.upload(session.id, [{
  path: 'README.txt',
  content_base64: Buffer.from('Project context\n').toString('base64'),
}]);
const run = await client.submit(session.id, savedInput, savedKey,
  {request_id: businessRequestId});
await saveRunId(run.id);
for await (const event of client.stream(run.id, savedCursor ?? '0')) {
  if (event.id) await storeEventAndCursorAtomically(run.id, event);
}
const result = await client.run(run.id);
```

与 Python upload 不同，TypeScript 接收含已编码 Base64 字符串的数组。在应用 journal 保存 Session、Run ID 与精确 input/origin/key。提交响应丢失可用相同意图恢复，Session 创建没有同等 Run 提交幂等保证。参见[后端集成](../build/backend-integration.md)与[项目上下文](../build/project-context.md)。

## 事件流、取消与错误

`stream(run, after='0', signal?)` 是 AsyncGenerator，使用 for await 迭代，只持久化有 ID 的事件，从最后提交的游标重连原 Run。ID 保持字符串。stream.end 没有持久 ID，结束后仍查询 Run。意外 EOF 或截断抛普通 Error，不自动重连。

传入 stream 的 AbortSignal 只停止本地观察，不取消 Run。cancel(run) 请求取消执行，close(session) 单独处理资源清理。并非所有便捷方法都接受 signal；通用 request 在第五个参数接受它，不提供统一默认请求超时。支持处可传 signal，但必须正确处理操作结果未知。

普通 JSON 错误转为 HexagonError，使用服务端 code 或 http_error；流打开错误为 event_stream_failed，下载缺省错误为 artifact_download_failed。Fetch、abort、JSON 错误可能保持原生异常。通用 request 拒绝重定向，而 stream、download 使用 fetch 缺省重定向行为，应配置实际可信 API origin，不依赖跳转。详见[错误](errors.md)。

## 管理流程与缺口

连接 CRUD 和验证见[连接生命周期](../build/connection-lifecycle.md)，操作选择见[应用](../integrations/apps.md)、[MCP](../integrations/mcp.md)，revision 见[Agent 模板](../build/agent-templates.md)，决定流程见[审批](../build/approvals.md)与[对账](../operate/reconciliation.md)。Secret、Token、OAuth、部署方法要求相应管理角色，类中存在方法不等于调用者获得授权。grant 和返回凭据不能进入日志。

通用 `request<T>(method, path, ...)` 可访问已实现但没有便捷方法的 JSON 端点，例如某 Session 的 Run 列表，不能创造端点、替代浏览器 OAuth 或代理任意二进制响应。泛型是编译期断言，不是 schema 校验。SDK 没有内置持久 journal、统一自动分页或副作用安全重试机制。

本草稿已包含源码生成的方法清单；逐方法可执行示例与完整响应 schema 审查仍待完成。类型检查、安装包测试、实云旅程证明不同范围，本轮只生成并检查参考。宣称运行或双 SDK 验收前按[测试指南](../contribute/testing.md)执行。

## 按资源查阅响应契约

生成的签名说明客户端如何调用；精确响应投影、状态码、角色、状态前提和副作用应查看对应 HTTP 契约。大部分管理方法直接返回解码后的 JSON；调用没有抛异常，仍可能包含 invalid 的连接验证结果或 reconciliation_error，不能据此认定业务成功。

| 资源 | 契约 |
| --- | --- |
| Runs、事件与取消 | [Runs、事件与取消](runs.md) |
| Session 创建、文件和生命周期 | [Session 创建、文件和生命周期](sessions.md) |
| Session 环境、授权与访问凭据 | [Session 环境、授权与访问凭据](session-access.md) |
| 产物内容与私有预览 | [产物内容与私有预览](artifacts-previews.md) |
| 审批与 Tool 恢复 | [审批与 Tool 恢复](approvals-tools.md) |
| 连接、验证与使用记录 | [连接、验证与使用记录](connections.md) |
| 应用与 OAuth | [应用与 OAuth](oauth.md) |
| Managed Secrets | [Managed Secrets](secrets.md) |
| 应用 Token | [应用 Token](tokens.md) |
| Agent 模板与修订 | [Agent 模板与修订](agents.md) |
| 目录与 Harness 注册 | [目录与 Harness 注册](harness-registration.md) |
| 资源操作对账 | [资源操作对账](resource-operations.md) |
| 监控与集合查询 | [监控与集合查询](monitoring.md) |
| 本地部署配置 | [本地部署配置](deployment.md) |

产物二进制下载和事件流使用上文说明的特殊返回路径。DELETE 并非统一空响应：Token 撤销返回 JSON，预览/access/Secret/连接删除使用 204，OAuth flow 取消返回 flow 对象。构建通用应用封装时必须保留这些差异。

## 查询已有 Run，不提交新工作

从仓库根目录运行[完整诊断示例](../../../../examples/documentation/inspect-run.ts)。Python 先安装本地 SDK；TypeScript 先执行 `npm --prefix sdk/typescript run build`。

```sh
./node_modules/.bin/tsx examples/documentation/inspect-run.ts --session YOUR_SESSION_ID --run YOUR_RUN_ID --after 0 --max-pages 20
```

程序核对 Run/Session 关联，读取 Session 状态和有页数上限的事件，重新查询 Run 并列出产物 ID/大小/摘要。报告不包含任务文本、事件 payload、最终输出或产物名称，资源 ID 仍需私有保存。它不会提交、审批、取消或关闭任务。事件 ID 保持十进制字符串，比较使用任意精度整数，不转换成有精度损失的数字。

Last_observed_cursor 是诊断观察位置，不是应用消费者检查点：程序只计数，没有持久保存事件内容。Reached_empty_event_page 只说明该次查询暂时没有后续页，不表示 Run 完成。状态、事件和产物是分开的读取，不是原子快照。达到页数上限可使用返回游标继续诊断，但不能据此跳过应用尚未处理的事件。

本地语法/类型与假客户端检查不证明真实 API 或云行为。解释结果请结合 [Run 契约](runs.md)与[恢复指南](../build/recovery.md)。

[示例安装、阶段与恢复说明](../../../../examples/documentation/README.zh-CN.md)。
