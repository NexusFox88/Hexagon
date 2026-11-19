# 编程 Agent 集成阅读指南

在 Hexagon 上开发应用时，从这里开始阅读。这是产品集成指南，不是仓库 AGENTS.md 开发指令；当前 checkout 中的仓库指令仍约束编辑、测试、凭据与发布。本 Markdown 文件提供阅读入口，不代表已有托管文档端点或单独的机器 API。

## 按执行顺序查证

| 步骤 | 阅读并确认 | 保存或验证 |
| --- | --- | --- |
| 1. 版本与部署 | [安装](start/install.md)、[SDK 源码指南](../../../sdk/README.md)、[CLI](reference/cli.md) | 控制平面实际源码或构建、SDK 安装产物及版本、local 与 hosted 认证方式 |
| 2. 能力发现 | [选择集成](integrations/choose.md)、[Harness](integrations/harnesses.md)、[已验证组合](integrations/verified-combinations.md) | 精确 Harness id/version/digest、模型协议、Sandbox 能力和带日期的场景证据 |
| 3. 配置与预检 | [连接生命周期](build/connection-lifecycle.md)、[Sandbox 策略](build/sandbox-policy.md)、[初始化](concepts/initialization.md) | 就绪且启用的连接、所有权、要求的策略和固定 Session 输入 |
| 4. Session | [第一个 Session](start/first-session.md)、[后端集成](build/backend-integration.md) | 业务归属、创建意图与返回的 Session ID；保存 Agent 可选 |
| 5. Run | [后端集成](build/backend-integration.md)、[项目上下文](build/project-context.md) | 精确 input/origin、稳定幂等键与返回的 Run ID |
| 6. 持久观察 | [事件流](build/stream-events.md) | 在同一应用事务中保存事件和游标，按 Run/event ID 去重 |
| 7. 授权与审批 | [Tool 授权](build/tool-authorization.md)、[审批](build/approvals.md) | 原调用和待决定事项；账户访问与副作用审批分开 |
| 8. 结果 | [产物](build/artifacts.md)、[私有预览](build/private-preview.md) | 终态查询、实际输出与文件内容、支持情况下的认证预览 |
| 9. 恢复与清理 | [恢复](build/recovery.md)、[对账](operate/reconciliation.md) | 原操作和资源 ID、外部核实的结果，以及确认的 Session 关闭 |

不要假设 SDK 版本能证明所有服务端构建兼容。核对运行中 catalog 与安装 SDK 的实际签名。专门参考页尚在补齐期间，精确请求可查仓库中的 [TypeScript SDK](../../../sdk/typescript/index.ts)、[Python SDK](../../../sdk/python/hexagon/__init__.py)与 [HTTP 实现](../../../apps/control-plane/server.ts)。这些是源码参考，不代表提供 OpenAPI 端点。

## 带持久记录的集成算法

以下为伪代码。`journal`、业务授权与事务由应用实现，不是 Hexagon SDK 方法。具体 Python、TypeScript 调用见上表的构建指南及[首个 Session 示例](../../../examples/documentation/first-session.py)。

```text
核对业务用户对工作上下文的权限
读取或新建该业务请求的私有 journal
记录连接、精确 Harness 版本、策略及创建意图

如果尚无 Session ID：
    若先前创建请求结果未知：
        调查 Sessions 和资源操作，停止自动创建
    创建一次 Session，持久化返回的 Session ID

提交前保存意图：
    Session ID、精确 input、精确 origin、一个稳定幂等键
提交已保存的意图，持久化返回的 Run ID
如果提交响应丢失：
    对同一 Session/input/origin/key 做有界传输重试
    不通过生成新 key 掩盖冲突

cursor = 最后提交的事件 ID，或字符串 "0"
从 cursor 后观察原 Run
对每个有 ID 的事件：
    事务性去重、保存事件并更新 cursor
事件连接断开：
    用已提交 cursor 重连同一个 Run
等待授权或审批：
    将原请求展示给有权限的决定者
Tool 结果未知：
    保存 call ID、request hash 和执行策略
    外部调查，不重发写入

查询 Run 终态及最终输出
验证、下载有权访问的产物，保留需要继续对话的上下文
不再需要 Session 时：
    保存关闭意图，请求关闭，确认清理
    对账结束前保留未决操作与资源 ID
```

至少记录业务请求与所有者、Session ID、Run ID、精确提交内容和 key、事件游标、清理意图与状态、未决操作引用。资源标识保存为私有证据，不写进公开示例输出。记录时间与错误时排除 Token 和原始账户凭据。即使多个业务用户共享一个 Hexagon 租户，每次外部查询和结果交付仍需应用授权。

Run 提交幂等性不自动扩展到 Session 创建或任意 Provider 操作。事件 ID 保持数字字符串，不转换成 JavaScript Number。`stream.end` 等没有持久 ID 的事件不作游标检查点。事件流结束或事件分页为空，都不能替代 Run 终态查询。网络断开不取消执行。

## 遇到分支时改变下一步动作

| 情况 | 动作 |
| --- | --- |
| 模型协议、网络策略或 Tool 能力不兼容 | 分配前修正选择，不能静默降低用户要求 |
| `session_busy` | 应用保留待提交消息，等活动 Run 结束，或明确创建独立 Session |
| 幂等冲突 | 比对保存的 input/origin/key，不能制造新请求隐藏冲突 |
| 认证或权限错误 | 修正身份或授权，不循环执行瞬态重试 |
| 缺少 Tool 授权 | 通过既有流程取得账户访问，不把上游密钥传入 guest |
| 写入等待审批 | 等有权限者决定，模型指令不是审批 |
| 创建、写入、删除结果未知 | 对账原操作，没有响应不证明失败 |
| Run 失败或取消 | 先查输出、事件与可能副作用，再决定后续任务；取消不撤销写入 |
| 清理未确认 | 保留 journal 与 Provider 标识，不能宣称账户无遗留资源 |

## 正确使用示例和证据

示例有完整教程、依赖既有变量的 SDK 片段、结构示意和确定性 fixture 等不同范围，执行前先看标注和前置条件。占位连接 ID、`.invalid` 域名、本地镜像标签不是已部署服务。fixture 模型不证明真实模型行为，注册 Harness 不证明其镜像、Provider、协议组合可运行。

每次集成改动报告修改文件、实际命令与结果、精确测试范围、限制和清理状态，保留失败尝试。遵循[测试与证据](contribute/testing.md)；影响共享契约时覆盖两种 SDK 旅程。不能以 Agent 生成的“测试通过”文字作为证据，应检查真实测试输出与产物。

这里链接的是仓库内文档草稿，仅链接已存在文件，不宣称公开站点、`llms.txt` 服务或全部规划参考页已经发布。[覆盖台账](../coverage.json)用于识别尚未完成的内容，不能据此推断运行能力。

下一步：[第一个 Session](start/first-session.md)、[后端集成](build/backend-integration.md)、[对账](operate/reconciliation.md)。
