# 观察运行并诊断故障

从业务任务关联到 Session、Run、Runtime 和云资源操作，而不是用一个“Agent 状态”覆盖所有层次。控制平面活着、Runtime 可达、Run 完成和资源删除分别需要证据。

## 从哪个标识开始

应用保存业务 request ID、Session ID、Run ID、幂等键和事件 cursor。Console 中按对应 Session / Run 查看输入、初始化、事件、工具活动和资源状态。Run origin 可携带 request_id、message_id、channel，帮助关联来源；它不代替认证或业务归属。

| 对象 | 观察重点 | 不应推断 |
| --- | --- | --- |
| 控制平面健康 | 数据库、worker、凭据入口 | 所有云账户当前可用 |
| Session | 固定配置、生命周期、资源绑定 | 云进程一直存活 |
| Run | 阶段、等待、终态、输出 / 错误 | 终态意味着云资源已删除 |
| Runtime binding | 可达性、中断与恢复 | unreachable 等于进程已停止 |
| Sandbox | 最后观察到的云状态 | 睡眠等于资源不存在 |
| Resource operation | create/delete 意图、unknown、复核和重试信息 | 人工 acknowledged 等于清理完成 |
| Tool call | 参数、审批、dispatch 策略、结果与对账 | 超时等于没有写入 |

## 一次排障路线

假设界面长时间没有输出：先查询原 Run，而不是重提任务。如果是 waiting_authorization / waiting_approval，找到具体调用和待决定操作。如果处于 provisioning，检查 Sandbox 创建操作和执行阶段。如果 Runtime unreachable，观察原 invocation 的恢复状态，避免启动第二份进程。如果 Run 已完成，检查客户端事件 cursor 和最终结果读取。

可用 SDK 调用包括 `run`、`events` / `stream`、`tool_calls` / `toolCalls`、`session_initialization` / `sessionInitialization`。读取事件时每页有上限，需要继续补读；数据返回为空不证明执行终止。

## 日志与错误的解释

本地启动日志位于私有工作区的 service.log。故障诊断保留受控 category、数字 HTTP status，以及允许的 transport code，例如 ECONNRESET、ETIMEDOUT。实现刻意排除任意上游 message、URL、body 和随意 code，避免将凭据或用户数据泄漏到诊断。

这些字段帮助定位层次，不自动确定根因。401 可能来自不同服务，网络 reset 不能证明远端操作未执行。记录阶段、时间和关联 ID，再结合对应对象状态判断。

## 监控和告警

基于实际查询建立持续检查：等待时间过长的 Run、不可达 Runtime、未知创建 / 删除、closing 未完成、凭据入口异常、产物导出失败。阈值根据部署和任务性质配置，不在文档中编造统一 SLA。

当前指南不假设已提供 Prometheus endpoint 或 OpenTelemetry exporter。需要接入自己的监控系统时，从实际 API 和受控日志构建采集，先确认字段稳定性与权限。

验证故障诊断时，应能从一个业务请求定位原 Run、执行阶段与相关操作；日志不泄露秘密；修复后保留原任务身份和恢复证据。依据：[诊断过滤](../../../../modules/diagnostics/failure.ts)、[恢复架构](../../../architecture.md)。下一步：[恢复动作](../build/recovery.md)、[授权](../build/tool-authorization.md)。
