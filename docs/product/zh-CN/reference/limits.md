# 限制与可配置边界

本页按当前源码列出接口和执行边界，不是 Provider 账户配额表。MiB = 1048576 字节，KiB = 1024 字节。JS code units 指 JavaScript 字符串长度，不能等同 UTF-8 字节；中文和 emoji 尤其需要同时检查字节限制。数值是当前实现快照，升级后核对源码。

## 请求与执行

| 项目 | 上限或范围 | 作用与注意事项 |
| --- | --- | --- |
| HTTP 请求体 | 12 MiB | Fastify 请求体限制，计入 JSON 与 Base64 开销。 |
| Run input | 1–100000 JS code units | 还须非空白；input 加编译后的背景 context 总计不超过 120000 UTF-8 字节。 |
| Idempotency-Key | 1–256 JS code units | 提交响应丢失后复用相同内容和 key。 |
| origin 标识 | message_id/request_id ≤256; channel ≤100 | 提供时非空，属于提交身份的一部分。 |
| 每个 Session 活动 Run | 1 | 另一个活动 Run 导致 session_busy（409），由应用排队。 |
| 事件查询每页 | 500 events | 按最后 ID 继续查询，空页不证明任务终止。 |
| 资源操作分页 | limit 1–100; default 50; offset ≥0 | 按返回分页继续，不是账户资源配额。 |

主要来源：[apps/control-plane/server.ts](../../../../apps/control-plane/server.ts).

## Session 策略与初始化

| 项目 | 上限或范围 | 作用与注意事项 |
| --- | --- | --- |
| Session／Agent 名称 | 1–200 JS code units | Session 名称可选，Agent 名称必填。 |
| 空闲阈值 | 15–3600 seconds; default 60 | 创建定义时可配置，生命周期能力因 Provider 而异。 |
| 资源 timeout | 60–3600 seconds; default 600 | 不是统一模型回复期限，也不保证按墙上时钟准时删除。 |
| identity 字段 | name ≤200; description ≤4000; role ≤2000 | name 非空；行为描述不等于授权。 |
| instructions／context.text | each ≤32768 JS code units | 拒绝 NUL。 |
| 内联 context documents | ≤8; name 1–200; text ≤16384 | 同时受初始化总字节上限约束。 |
| 引用 context files | ≤8; path ≤500; each file ≤32768 bytes | 需匹配上传 SHA-256，内容为不含 NUL 的有效 UTF-8。 |
| 编译后的初始化 | ≤65536 bytes | 分别检查序列化 behavior，以及编译后的 system 加 context。 |
| 环境变量 | ≤64; JSON ≤65536 bytes | 名称最多 128、值最多 16384 JS code units；拒绝保留名称和 NUL。 |

主要来源：[modules/execution/sessions.ts](../../../../modules/execution/sessions.ts).

## 输入与导出文件

| 项目 | 上限或范围 | 作用与注意事项 |
| --- | --- | --- |
| 每次上传文件数 | 1–100 | 不是 workspace 生命周期文件总数配额。 |
| 上传路径 | 1–500 JS code units | 相对路径；拒绝目录穿越、空段、反斜杠和 NUL。 |
| 上传 content_base64 | ≤2097152 characters per file | 规范 Base64；该编码长度最多对应 1572864 解码字节，即 1.5 MiB。 |
| 上传解码总量 | ≤8 MiB per request | 仍受 HTTP 请求体限制；超限为 upload_too_large（413）。 |
| 产物 manifest | ≤64 files; ≤8 MiB decoded total | 每个捕获 manifest，拒绝重复名称。 |
| 单个导出产物 | ≤4 MiB decoded bytes | Base64 字段最多 5592408 字符；核对规范编码与 SHA-256。 |
| 产物名称 | 1–512 JS code units | 相对路径，拒绝目录穿越、反斜杠和控制字符。 |

主要来源：[modules/execution/inputs.ts](../../../../modules/execution/inputs.ts).

## 预览与 Harness 分发

| 项目 | 上限或范围 | 作用与注意事项 |
| --- | --- | --- |
| 预览端口 | 3000–8999, excluding 8765 | 整数；Runtime 端口保留。 |
| 预览授权 TTL | 30–3600 seconds; default 600 | 每次请求可配置，不延长 Sandbox 生命周期。 |
| OCI 架构 | linux/amd64 | 多架构标签不代表支持其他架构。 |
| OCI 镜像引用 | 1–512 JS code units | 解析为固定 digest，仍受仓库及 Provider 限制。 |
| OCI 命令 argv | 1–32 items; each 1–65536 JS code units | 拒绝 NUL；OS 或 Runtime 的限制可能更紧。 |
| 源码包 | 1–32 files; total ≤512 KiB UTF-8 | 每个 content 最多 262144 JS code units；相对路径最多 240。 |
| 原生继续标识 | ≤512 characters in hexagon-json-v1 parsing | 源码包提供该值时必须非空；特定协议适配器有各自检查。 |

主要来源：[modules/sandboxes/previews.ts](../../../../modules/sandboxes/previews.ts).

## 交叉检查来源

上表还依据 [Run 输入与事件](../../../../modules/execution/runs.ts)、[初始化](../../../../modules/execution/initialization.ts)、[环境变量](../../../../modules/execution/environment.ts)、[产物](../../../../modules/artifacts/artifacts.ts)、[OCI 注册](../../../../modules/harnesses/images.ts)、[镜像解析](../../../../modules/harnesses/registry.ts)和[源码包](../../../../modules/execution/harness-packages.ts)。多数 schema 数值没有独立管理配置可调整；不要把 Session 可配置期限与部署层可随意扩容的上限混淆。

## Tool、Provider 与账户限制

[Remote MCP](../integrations/mcp.md)当前限制发现最多 100 个工具、最多 20 页和单个响应 2 MiB，具体检查见 [remote.ts](../../../../integrations/mcp/remote.ts)。具名应用响应体限制为 1 MiB，见[应用请求实现](../../../../integrations/apps/registry.ts)。这些是协议传输限制，不是 workspace 文件大小。

Provider 的内存、CPU、创建并发、存储、镜像权限及 API 配额取决于连接配置和实际账户。按 [Sandbox 集成](../integrations/sandboxes.md)查对应 Provider；不能把试用账户的并发限制写成 Hexagon 全局配额。私有 OCI、网络 allowlist、暂停恢复必须由当前连接器声明支持，不支持的策略不能静默降级。

一些连接器有更小的文件或命令限制。传输队列上限约束缓冲区，不一定限制整个响应总长。不要把它与上传请求、导出产物或 Provider 磁盘容量互换。容量和成本规划见[容量指南](../operate/capacity-and-cost.md)。

## 超限后如何处理

schema 拒绝与领域错误分别检查；例如输入和背景合计超限返回 `input_too_large`（413），初始化超限为 `initialization_too_large`（413）。产物总量或重复名称可触发 `invalid_artifact_manifest`，单文件大小、编码或哈希不符可触发 `artifact_integrity_failed`。这些错误不应通过重复同一请求解决。

缩小输入、分批上传、只导出必要文件，或选择能力合适的组合。不能通过分批上传绕过单文件边界，也不能把用户要求的 allowlist 改成 unrestricted 来“通过”。网络错误或 Provider 配额拒绝与 Hexagon 输入超限分开处理；创建请求结果未知时先对账原操作，不能换 key 反复创建。

本页数值经过源码核对，没有重新执行边界测试或实云压力测试。没有明确列出的账户总容量、整体吞吐量或价格不代表无限，也不构成服务级别承诺。

下一步：[项目上下文](../build/project-context.md)、[产物](../build/artifacts.md)、[故障排查](../operate/troubleshooting.md)。
