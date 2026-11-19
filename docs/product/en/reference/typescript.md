# TypeScript SDK reference

`@hexagon/agent-sdk` is an ESM package, currently version `0.1.0`, with Node.js >=20 in its package manifest. The control-plane repository separately requires Node.js >=22.19.0. Do not infer browser or edge-runtime support from the Node package requirement. Local identity discovery imports Node filesystem/path/OS modules and belongs in a trusted backend.

Build from this checkout, then install it into your own Node application:

```sh
# Hexagon repository root
npm --prefix sdk/typescript run build
# In your separate application's directory, substitute the actual checkout path:
npm install /absolute/path/to/Hexagon/sdk/typescript
```

The absolute path is a placeholder. This does not claim public npm publication. See [package.json](../../../../sdk/typescript/package.json); record the artifact and source revision as well as version.

## Initialize a client

```typescript
import { Hexagon, HexagonError } from '@hexagon/agent-sdk';

const client = await Hexagon.local();
// Alternatively, from a trusted server process:
// const client = new Hexagon(apiOrigin, applicationToken);
```

The explicit base URL excludes `/v1`, which the SDK appends. Construction makes no validation request. `local({dataDirectory, baseUrl})` returns a Promise and verifies private workspace files/loopback identity; optional baseUrl checks the discovered endpoint, rather than switching to hosted authentication. See [local.ts](../../../../sdk/typescript/local.ts).

Never embed control-plane Tokens in frontend bundles. Authenticate business users in your backend and forward authorized results. The SDK does not have a client-wide dispose method; `close(session)` requests Session closure. Breaking out of stream iteration releases its reader but does not cancel execution.

## Public methods and actual return types

This inventory is generated with the installed TypeScript compiler from the source declarations and inferred return types. Initializers show real defaults; `Promise<any>` is preserved rather than replaced with an invented response model. JSON responses are not runtime-validated by these types. Generic request returns `undefined` for HTTP 204 even when a caller supplies an incompatible generic type.

<!-- ts-methods:begin -->

| Declaration | Inferred return |
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

Regenerate using `node tooling/generate-typescript-doc-index.mjs`. Server schemas still validate `unknown`, input objects and query values. Optional query fields should be omitted rather than explicitly set to undefined: list methods stringify supplied entries. Pagination is explicit; events and artifacts retain their collection envelopes.

## Exported types

| Type | Meaning and limitation |
| --- | --- |
| SessionInput / AgentInput | Configuration inputs; TypeScript's optional fields do not enforce every server cross-field constraint, including exactly one of harness/agent_id |
| AgentBehavior / AgentEnvironment | Initialization and guest environment; environment is readable by guest code and is not managed credential storage |
| HarnessImageInput | OCI registration fields and protocol union; server resolves/pins image digest and validates compatibility |
| SessionPreflight | Readiness, combination, lifecycle and credential boundaries; structural support is separate from real execution evidence |
| SessionInitialization | Historical pinned snapshot with environment names/redaction metadata, not secret-bearing replay data |
| Run / RunOrigin | Run state/output/error and optional correlation metadata; state is typed as string, not a complete enumerated state machine |
| RunEvent | Optional string id, type and unknown payload; narrow payload after checking type |
| Artifact | Metadata; bytes are returned separately by downloadArtifact |
| HexagonError | Error with numeric status and string code |

Definitions live in [index.ts](../../../../sdk/typescript/index.ts). LocalOptions is declared in local.ts; the package exports map exposes the root entry, not a promised public local subpath import.

## Common calls with context

The following excerpt requires an initialized client, ready connection IDs, saved submission intent and application-owned persistence functions. It does not include the complete recovery/cleanup path; use the [full first-Session program](../../../../examples/documentation/first-session.ts) for that.

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

Unlike Python upload, TypeScript upload accepts an array containing already encoded Base64 strings. Keep Session/Run IDs and exact input/origin/key in your application journal. A lost submission response can be recovered with the same intent; Session creation has no equivalent Run-submission idempotency guarantee. Use [backend integration](../build/backend-integration.md) and [project context](../build/project-context.md).

## Streams, cancellation and errors

`stream(run, after='0', signal?)` is an AsyncGenerator. Iterate with `for await`, checkpoint only durable event IDs, and reconnect to the original Run after the last committed cursor. IDs stay strings. `stream.end` has no durable ID; query the Run afterward. Unexpected EOF/truncated data throws an ordinary Error; reconnect is not automatic.

An AbortSignal passed to stream stops local observation. It does not cancel the Run. `cancel(run)` requests execution cancellation; `close(session)` separately handles resource cleanup. Not every convenience method accepts a signal. Generic `request` accepts one as its fifth argument; it provides no universal request timeout by default. Supply a signal where supported and handle unknown operation outcomes correctly.

Ordinary JSON request errors become HexagonError with server code or `http_error`; stream-open errors use `event_stream_failed`, and artifact download fallback is `artifact_download_failed`. Fetch/abort/JSON errors may remain native exceptions. Generic request rejects redirects, while the stream/download paths use fetch's default redirect behavior. Use the actual trusted API origin and do not rely on redirects. See [errors](errors.md).

## Management workflows and gaps

Use [connections](../build/connection-lifecycle.md) for CRUD and validation; [applications](../integrations/apps.md) and [MCP](../integrations/mcp.md) for operation selection; [Agent templates](../build/agent-templates.md) for revisions; [approvals](../build/approvals.md) and [reconciliation](../operate/reconciliation.md) for decisions. Secret, Token, OAuth and deployment methods require the appropriate management role. Their presence in the class does not authorize the caller. Keep grants and returned credentials out of logs.

Generic `request<T>(method, path, ...)` can reach implemented JSON endpoints without a convenience method, such as a Session-scoped Run list. It cannot invent endpoints, perform browser OAuth interaction or proxy arbitrary binary responses. The generic type parameter is a compile-time assertion, not a schema check. There is no built-in durable journal, universal pagination loop or safe automatic retry for side effects.

This draft has a complete source-derived method inventory. Per-method executable examples and exhaustive response-schema review remain pending. Type checking, installed-package tests and actual cloud journeys prove different scopes; this documentation pass only generates and checks the reference. Follow [testing](../contribute/testing.md) before claiming runtime or dual-SDK acceptance.

## Response contracts by resource

The generated signatures show how to invoke the client. Use the corresponding HTTP contract for exact response projections, status codes, required role, state preconditions and effects. Most management methods return the decoded JSON directly; a successful promise/call can still carry invalid connection validation or reconciliation_error. Do not infer success from the absence of an SDK exception.

| Resource | Contract |
| --- | --- |
| Runs, events and cancellation | [Runs, events and cancellation](runs.md) |
| Session creation, files and lifecycle | [Session creation, files and lifecycle](sessions.md) |
| Session environment, authorization and grants | [Session environment, authorization and grants](session-access.md) |
| Artifact bytes and private previews | [Artifact bytes and private previews](artifacts-previews.md) |
| Approvals and Tool recovery | [Approvals and Tool recovery](approvals-tools.md) |
| Connections, validation and usage | [Connections, validation and usage](connections.md) |
| Applications and OAuth | [Applications and OAuth](oauth.md) |
| Managed Secrets | [Managed Secrets](secrets.md) |
| Application tokens | [Application tokens](tokens.md) |
| Agent templates and revisions | [Agent templates and revisions](agents.md) |
| Catalog and Harness registration | [Catalog and Harness registration](harness-registration.md) |
| Resource operation reconciliation | [Resource operation reconciliation](resource-operations.md) |
| Monitoring and collection queries | [Monitoring and collection queries](monitoring.md) |
| Local deployment configuration | [Local deployment configuration](deployment.md) |

Binary artifact download and streaming are special return paths described above. HTTP DELETE is not uniformly empty: Token revoke returns JSON, while preview/access/Secret/connection deletion uses 204. OAuth flow cancellation returns a flow object. Preserve these differences when building a generic application wrapper.

## Inspect an existing Run without submitting work

Build the SDK, then run the [complete diagnostic example](../../../../examples/documentation/inspect-run.ts) from the repository root:

```sh
npm --prefix sdk/typescript run build
./node_modules/.bin/tsx examples/documentation/inspect-run.ts --session YOUR_SESSION_ID --run YOUR_RUN_ID --after 0 --max-pages 20
```

It checks Run/Session association, reads bounded event pages, queries current Run state and lists artifact IDs/sizes/digests. It omits task/event/output content and artifact names; resource IDs still require private handling. It never submits, approves, cancels or closes work. Decimal-string cursors use BigInt comparisons rather than lossy JavaScript numbers.

`last_observed_cursor` is diagnostic, not an application-consumer checkpoint: this program counts events instead of persistently storing their payloads. `reached_empty_event_page` describes one query, not Run completion. Separate state/event/artifact reads are not an atomic snapshot. Continue diagnostics from that cursor when bounded, but do not use it to skip unprocessed application events. Type checking and fake-client checks do not certify real API or cloud behavior. See [Run contracts](runs.md) and [recovery](../build/recovery.md).

[Example setup, stages and recovery](../../../../examples/documentation/README.md).
