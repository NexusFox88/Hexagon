# 按症状排查问题

先保存 Session、Run、操作 ID 和最后事件 cursor，再调查。重试前确认动作是否可能已经生效；不要把所有错误都归因于用户凭据或建议重新创建任务。

## 症状索引

| 症状 | 首先检查 | 下一步与完成信号 |
| --- | --- | --- |
| 控制平面启动失败 | doctor、数据库身份 / 端口、私有 service.log | 修复具体前提后同工作区启动；status 与鉴权正常 |
| 本地 SDK 找不到工作区 | HEXAGON_DATA_DIR、工作目录、descriptor 权限与 loopback | 显式指定正确 data directory；能查询原 Session |
| 401 / 403 | 哪个服务返回、Token 到期 / 撤销、所需管理权限 | 修复正确身份，不把 owner 凭据交给前端 |
| 连接无法启用 | 配置修改后是否重新验证、Secret 是否禁用 | validate ready 后单独 enable；不是仅编辑 enabled |
| Session 预检拒绝 | Harness 版本、模型协议、工具 readiness、OCI / 网络能力 | 修复明确 reason，保持所需策略，不静默放宽 |
| 创建长期无结果 | 原 resource operation 与 Provider handle | 对账原创建；不因空列表自动新建 |
| Run 无输出 | 持久状态、等待授权 / 审批、provisioning 阶段 | 执行相应动作；查询原 Run 而非重复 submit |
| 流式 UI 停止 | 客户端连接和已保存 cursor、Run 当前状态 | 原 Run 重连并去重，最终结果与查询一致 |
| 文件上传被拒绝 | 路径、编码 / 大小、是否已提交首个 Run | 未执行前纠正；已启动工作区通过任务修改 |
| Artifact 列表为空 | Run 状态、产物目录、导出错误 | 核对实际文件与导出，不只相信自然语言回答 |
| 预览打不开 | 进程 / 端口、grant 过期、Session 状态、origin / TLS | 普通 HTTP 页面可操作，失效授权被拒绝 |
| 唤醒后文件 / 对话缺失 | 保存目录、Provider 策略、Harness 精确版本 | 文件与对话分别验证，未知 invocation 不重放 |
| close 卡在 closing | 原删除操作、资源 / 关联端点实际状态 | 确认不存在才完成，不用 acknowledge 代替 |

## 示例：没有新事件

读取 Run：若 waiting_approval，则查看审批记录与 Tool 调用；用户确认后由有权限身份提交决定。如果 Run 已 completed，则问题可能在游标处理，补读事件并读取 output。如果 Runtime unreachable，记录原绑定与阶段，观察恢复，不另启 Harness。

这三种情况界面都可能“没有新文本”，但操作完全不同。网络连接恢复不代表外部写入已确认，Tool outcome unknown 要进入[对账流程](reconciliation.md)。

## 收集可用问题报告

包含代码 / SDK 版本、Provider 与 Harness 版本、模型协议、发生阶段、脱敏错误、复现步骤、预期与实际结果、相关证据路径、资源是否已清理。私有资源 ID 留在本地便于后续清理，公开报告使用脱敏引用。不要粘贴 owner Token、数据库连接密码、预览 ticket、原始 header 或供应商响应体。

有历史失败但后来成功时，分别说明每次尝试；不要删除失败记录让结果看似全部通过。模拟复现与真实云复现也分别标明。

## 对应操作手册

- [身份与 Token](access-control.md)、[凭据轮换](credentials.md)
- [网络入口](networking.md)、[观察和诊断](observability.md)
- [应用恢复](../build/recovery.md)、[资源对账](reconciliation.md)
- [文件上传](../build/project-context.md)、[产物](../build/artifacts.md)、[预览](../build/private-preview.md)

本索引依据当前各操作契约组织，具体错误以原始状态和受控诊断为准。完成排障需观察目标行为恢复并确认资源结果，不能仅以错误提示消失为完成。
