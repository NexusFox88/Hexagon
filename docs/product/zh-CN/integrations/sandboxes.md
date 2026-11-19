# 选择 Sandbox Provider

Sandbox 提供云执行环境；Harness 在其中执行 Agent 任务。local / hosted 描述控制平面位置，两者都可以使用这些云 Provider。先按所需能力筛选，再核验具体 Harness、模型协议与 SDK 的组合证据。

## 当前注册能力

所有下列目标均声明文件、命令和私有预览能力。“不支持”表示当前 Hexagon 连接器未提供该能力，不评价供应商其他产品。表格依据当前注册表和连接器，不是实云验收结果。

| Provider | API provider | 域名 allowlist | OCI | 空闲策略 |
| --- | --- | --- | --- | --- |
| [E2B](sandboxes/e2b.md) | `e2b` | 支持 | 公开镜像构建 | pause / connect |
| [Modal](sandboxes/modal.md) | `modal` | 支持 | 公开及私有 | snapshot / recreate |
| [Blaxel](sandboxes/blaxel.md) | `blaxel` | 不支持 | 不支持 | automatic standby |
| [Fly Sprites](sandboxes/fly-sprites.md) | `sprites` | 不支持 | 不支持 | automatic standby |
| [Upstash Box](sandboxes/upstash-box.md) | `upstash` | 不支持 | 不支持 | persistent pause / resume |
| [Vercel Sandbox](sandboxes/vercel.md) | `vercel` | 不支持 | 不支持 | persistent stop / resume |
| [Agent37](sandboxes/agent37.md) | `agent37` | 不支持 | 不支持 | stop / start |
| [Boat](sandboxes/boat.md) | `boat` | 不支持 | 不支持 | snapshot stop / resume |
| [Freestyle VMs](sandboxes/freestyle.md) | `freestyle` | 不支持 | 不支持 | VM pause / start |
| [Fly Machines](sandboxes/fly-machines.md) | `fly-machines` | 不支持 | 公开 | suspend / start |
| [Instabox](sandboxes/instabox.md) | `instabox` | 不支持 | 不支持 | suspend / resume |

## 如何理解条件

- **网络**：只有 E2B 和 Modal 声明 network_allowlist。请求不支持的限制会在分配前失败，不能默默退化为开放网络。还需考虑控制平面凭据入口、模型和 Tools 的实际调用路径。
- **OCI**：Modal 直接使用 OCI 并可处理私有镜像；Fly Machines 为公开镜像；E2B 通过 Session 自有 Template 准备公开镜像。镜像可解析、可构建和 Harness 可执行是三个检查，具体看 [OCI 指南](harnesses/oci.md)。
- **暂停**：E2B、Freestyle、Instabox 使用保留内存的策略；文件系统策略不保证任意进程或内存继续。Fly Machines 允许冷启动回退。Modal 快照重建会改变底层资源 ID，Session ID 保持稳定。
- **自动 standby**：Blaxel / Sprites 由 Provider 控制时机，不是 Hexagon 确认的显式暂停。无法观察的实际计算或计费状态属于未知，不能从空闲计时器推断。
- **删除**：暂停、stop、快照均不等于清理。关闭 Session 后需确认资源及关联端点、镜像准备资源的清理结果。

Fly Sprites 与 Fly Machines 使用不同 API 和生命周期，不能交换配置。Daytona 不在当前公开注册表；历史原型不是新建连接的支持承诺。

## 配置与首次验证

1. 从 Console 的 Sandbox 配置入口选择 provider，或通过管理客户端 create_connection / createConnection 创建 kind=sandbox 的连接。读取该 Provider 的配置 schema 和 setup_url；不要将另一个 Provider 的字段套用进来。
2. 将 Provider 凭据作为连接 credential 提交，保留在控制平面。不要加入 Agent env、项目文件或前端代码。
3. 验证连接，再明确启用。验证操作的范围取决于 Provider；成功列举资源不代表具有所有创建、镜像构建或删除权限。
4. 用兼容 Harness 和模型预检 Session，再完成实际任务、文件读写、所需预览和最终清理。先从 [E2B 接入](sandboxes/e2b.md)或[首个 Session](../start/first-session.md)开始。
5. 需要休眠时独立验证第二轮自动唤醒与文件、对话连续性，不以单轮成功代替。

模板、镜像、地区、CPU、内存等字段依 Provider schema 而定。Session 的 timeout / idle 设置不等于统一云机器规格。修改连接会使验证失效并禁用；已有 Session 保留固定配置，见[连接变更](../build/connection-lifecycle.md)。

## 证据与诊断

查看[执行矩阵](../../../../testing/execution-matrix.md)及[Harness 休眠矩阵](../../../../testing/evidence/2026-11-19-harness-serverless-matrix.json)的日期、SDK、Harness 版本、模型协议和具体分支。历史成功不能覆盖当前所有组合，也不证明账户仍有额度。当前页为源码核对，未新增实云验证。

错误应先定位在连接鉴权、配额、模板准备、创建、Runtime、模型、预览或清理。创建响应丢失时保留原 operation 与资源记录并对账，不能新建一批来验证上一批是否存在。

依据：[注册表](../../../../integrations/sandboxes/registry.ts)、[生命周期策略](../../../serverless-sessions.md)。下一步：[组合选择](choose.md)、[网络策略](../build/sandbox-policy.md)、[资源对账](../operate/reconciliation.md)。
