# Glossary

This reference defines product terminology. API identifiers, error codes, and code fields remain untranslated. Interpret states by object: Session, Run, Runtime, and cloud resources have distinct state models.

| Term | Chinese equivalent | Meaning and boundary |
| --- | --- | --- |
| [Session](../concepts/sessions-runs-agents.md) | 会话工作上下文 | A durable work-context identity linking pinned configuration, workspace, conversation, and cloud resources. Not a particular machine; recovery can change the resource. |
| [Run](../concepts/sessions-runs-agents.md) | 一次任务执行 | The durable execution record of one submission. A Session allows one active Run; authorization/approval waits remain active. |
| [Agent template](../build/agent-templates.md) | Agent 模板 | Optional reusable configuration with immutable revisions. Direct Session creation requires no template. |
| [Control plane](../concepts/execution-architecture.md) | 控制平面 | The service owning Sessions/Runs, tenant checks, credentials, durable events, and cloud-resource operations. |
| [Sandbox](../integrations/sandboxes.md) | 云执行环境 | A remote isolated environment for task code, supplied by a provider and lifecycle-managed by the platform. Not a Console page. |
| [Sandbox Runtime](../concepts/execution-architecture.md) | Sandbox 内运行服务 | The in-Sandbox supervisor for Harness processes, Tool mailboxes, and execution communication. It does not own cloud-account operations. |
| [Harness](../integrations/harnesses.md) | Agent 执行引擎 | An engine running the model-driven loop, such as Pi/OpenCode; chosen separately from provider and model protocol. |
| [Provider](../integrations/choose.md) | 服务提供方 | An adapter target for a connection kind. Fly Sprites and Fly Machines are distinct; vendor identity does not imply uniform capabilities. |
| [Connection](../build/connection-lifecycle.md) | 连接 | Tenant-owned account configuration, endpoint, and access policy with validation, enablement, and version state. Not a single socket. |
| [Binding](../build/tools.md) | 绑定 | A named Session association, such as an alias-to-connection ID mapping in tools or connections. It does not expand permissions. |
| [ToolBroker](../build/tools.md) | 工具调用管理服务 | The control-plane component managing Tool authorization, approval, dispatch, durable calls, and unknown outcomes. |
| [Agent Tool](../build/tools.md) | Agent 可调用工具 | A named capability discoverable and callable by a Harness through the platform, supplied by HTTP Tools, applications, or Remote MCP. |
| [Protected HTTP connection](../integrations/http-tools.md) | 受保护 HTTP 连接 | Direct guest API access through a delegated URL with method/path restrictions; no automatic ToolBroker approval. |
| [Authorization](../build/tool-authorization.md) | 授权 | Establishing and maintaining authority to access an account/Tool. A credential does not prove access to every resource. |
| [Approval](../build/approvals.md) | 调用审批 | A decision on executing a specific operation and arguments; not account login or a substitute for upstream permissions. |
| [Secret](../operate/credentials.md) | 受管理密钥 | An encrypted credential resource whose value is not echoed. Rotation/disable and reference-aware deletion apply. |
| [Variable](../concepts/security-boundaries.md) | 变量 | Ordinary guest-readable configuration, not a Secret. Putting a key here does not protect it. |
| [Delegated grant](../concepts/security-boundaries.md) | 委托访问授权 | Scoped, lifecycle-bound, revocable access. Its token still requires secrecy; it is not the original upstream account key. |
| [Preflight](../integrations/choose.md) | 预检 | Checks configuration, references, capabilities, and credential ingress before allocation; not proof of live connectivity, quota, or task success. |
| [Validation](../build/connection-lifecycle.md) | 连接验证 | Adapter-specific verification, sometimes only structural/list checks. Inspect its actual scope. |
| [Pinned configuration](../concepts/initialization.md) | 固定配置 | Configuration versions and policy retained by a Session, not silently rewritten by later connection/template edits. |
| [Idempotency key](../build/recovery.md) | 幂等键 | Identifies one logical submission. Preserve key/input after lost responses; use a new key for a new turn. |
| [Durable event](../concepts/events-and-recovery.md) | 持久事件 | A state/activity record persisted before streaming. Disconnect does not cancel execution; cursors resume observation. |
| [Artifact](../build/artifacts.md) | 产物 | An exported downloadable deliverable that may survive close. Arbitrary workspace files are not automatically artifacts. |
| [Private preview](../build/private-preview.md) | 私有预览 | Authorized, expiry-bound access to a running service; not public deployment or a permanent URL. |
| [Pause / suspend](../build/idle-and-wake.md) | 暂停 | An idle state retaining recovery context, not deletion. Memory/filesystem preservation depends on provider strategy. |
| [Provider-managed standby](../concepts/serverless-lifecycle.md) | 供应商自动待机 | Provider-controlled standby whose compute/billing state may not be directly observable. |
| [Resume / wake](../build/idle-and-wake.md) | 恢复 / 唤醒 | Continuing the same Session, possibly by resuming a VM or recreating from filesystem snapshot. |
| [Close](../operate/reconciliation.md) | 关闭 Session | Terminates the Session and coordinates cloud cleanup. Accepted close does not by itself confirm remote deletion. |
| [Cancellation](../build/recovery.md) | 取消 Run | Stops further execution of that Run; cannot undo external writes and is not automatically Session close. |
| [Unknown outcome](../operate/reconciliation.md) | 结果未知 | A remote operation may have happened without a definitive receipt. Not failed and not permission to retry blindly. |
| [Reconciliation](../operate/reconciliation.md) | 对账 | Checking original operations/resources/external records and recording conclusions, not rerunning an action to guess its outcome. |
| [OCI digest](../integrations/harnesses/oci.md) | OCI 内容摘要 | An immutable image-content identity, unlike a mutable tag; preparation can still modify the execution filesystem. |
| [Native session ID](../build/multi-turn.md) | Harness 原生会话标识 | Harness-owned history identity, distinct from Hexagon Session ID and cloud resource ID. |
| [Local / hosted](../operate/self-host.md) | 本地 / 托管控制平面 | Describes control-plane deployment, not local task execution on the user computer; real tasks use cloud Sandboxes. |
| [Verified combination](../integrations/verified-combinations.md) | 已验证组合 | Evidence scoped to exact versions, protocols, SDKs, scenarios, and date; not certification of every catalog capability. |

## Avoid ambiguous claims

- “Task completed” requires the actual Run terminal state and deliverable checks, not just model text. “Cleanup completed” additionally requires remote confirmation.
- “Connection works” must specify structural validation, account validation, enablement, or actual invocation. Ready does not prove permission for every operation.
- “Recovery supported” must identify preserved files, conversation, processes, or memory and the exact provider/Harness evidence.

Prefer explicit actions: submit a new Run to the same Session, resume observing the original Run, or close and confirm cleanup. Do not use “restart” interchangeably for recovery, replay, recreation, and deletion.

This page summarizes the linked contracts and implementation explanations; it introduces no API or state values. Next: [object relationships](../concepts/sessions-runs-agents.md), [capabilities and evidence](../concepts/capabilities-and-evidence.md).
