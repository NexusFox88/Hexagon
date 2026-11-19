# 凭据、授权与信任边界

控制平面需要管理云账户、模型和工具，但任务代码不应因此获得这些账户的原始管理凭据。Hexagon 将受保护连接与普通执行配置分开，并在每个资源查询和绑定处验证租户归属。

## 不同凭据走不同路径

| 类型 | 保存 / 使用方式 | 用户需要理解的边界 |
| --- | --- | --- |
| 控制平面 owner / application Token | 客户端鉴权，能力受路由权限约束 | 不发送给浏览器或 Sandbox；应用仍检查业务用户归属 |
| Provider 管理凭据 | 控制平面 connector 使用 | 不作为普通 guest 环境交给 Harness |
| 模型 / 受保护 HTTP 密钥 | 加密连接，由受限访问后端注入上游请求 | guest 获得限定授权或占位，不获得原始账户 key |
| Tool OAuth / Token | 控制平面 broker 调用与刷新 | 操作选择、授权、审批分别生效 |
| OCI registry 凭据 | 元数据解析 / 获准镜像构建拉取 | 镜像分发路径与 Agent 普通环境不同 |
| 用户 env / variables | 加密存储后注入执行环境 | Agent 及其子进程可以读取，不能当作受保护 Secret |
| 预览 ticket | 换取独立 origin 的访问 cookie | URL 本身具有访问能力，不公开记录 |

## Secret、Connection 与绑定

Managed Secret 是写入后不回显值的加密资源。Connection 引用凭据并定义上游位置和策略。Session 绑定授予使用某个连接的能力，不授予读取原始 Secret 值的接口。

受保护代理检查固定目标和请求策略，不接受调用者任意选择上游或转发鉴权 header。委托 token 本身仍是权限，必须限制生命周期；它不等于原始账户密钥。

轮换或禁用会影响后续请求，已经被接受的上游操作仍可能完成。逻辑删除保留历史加密记录，不能作为物理密码学擦除证明。数据库备份需要对应加密密钥，不能分别随意替换。

## 身份与审批

行为定义的 identity / instructions 是提示内容，不是认证身份。租户检查确保资源属于当前控制平面身份；应用若在同一租户中服务多个业务用户，还需自己的归属校验。

授权提供可用账户凭据，审批批准具体操作。普通 application Token 不能提交管理审批决定。取消、撤销授权和删除连接也无法追溯撤回已发生的外部写入。

## 边界的实际含义

“不提供原始凭据”不代表 Agent 不能通过获准操作改变数据。审查允许的操作范围、输入和审批策略同样重要。生成的 HTML、工具返回文本与上传文件均为不可信内容；权限决策不能由其中的指令决定。

依据：[Secret 契约](../../../secret-management.md)、[Token 权限](../../../../modules/credentials/application-tokens.ts)、[OCI 路径](../../../harness-images.md)。下一步：[Tools](../build/tools.md)、[审批](../build/approvals.md)、[预览](../build/private-preview.md)。
