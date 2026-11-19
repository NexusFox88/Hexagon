# 提出设计变更并准备贡献

先描述用户遇到的具体问题和期望行为，再决定需要修改哪些模块。当前[贡献说明](../../../../CONTRIBUTING.md)明确公共仓库与贡献接收入口尚未配置；不要猜测 issue/PR URL。可以先准备本地补丁、设计说明和真实验证记录，等待项目配置正式入口。

项目代码许可证见 [Apache-2.0 LICENSE](../../../../LICENSE)。本页不额外声明 CLA、维护者响应时间或尚未建立的治理流程。

## 什么时候需要设计说明

局部修复可用简短问题、触发条件、前后行为与验证说明。跨模块状态、公共 API、凭据、租户、生命周期或数据迁移变化先写设计：用户旅程、责任边界、替代方案、失败模式、迁移与回退、验证和文档影响。

修改行为前阅读[架构](../../../architecture.md)、[验收](../../../../testing/acceptance.md)和[代码地图](codebase.md)。不能为通过当前测试删除用户要求；不能把 Provider 特例散入通用执行流程，或用原始凭据进入 guest 作为兼容回退。

## 用真实改动解释提案

仓库的 E2B OCI 准备是一个跨模块例子：用户选择公开 OCI Harness 后，需要先准备 Session 自有 Template，再创建计算资源。设计必须说明 Template/build 回执、构建未知结果、恢复与 compute-before-template 清理，不能只给一个镜像拉取函数。其[专项证据](../../../../testing/evidence/2026-11-19-e2b-oci-preparation.md)保留了模型输出失败与后续限定范围成功，可作为描述验证边界的范例，不是本次新运行结果。

建议设计稿结构：问题与成功旅程 → 当前限制 → 对象/API/状态变化 → 备选方案及取舍 → 凭据与租户边界 → 不确定结果和清理 → 迁移/回退 → 实际检查与未验证项。

## 准备可审阅的变更

使用仓库实际 [PR 模板](../../../../.github/PULL_REQUEST_TEMPLATE.md)：

```text
Problem and resulting behavior
- 触发条件、原行为、修改后的可观察结果。

Affected contracts
- API / Python / TypeScript / Console / Runtime / Connector 中实际受影响部分。

Verification actually run
- 实际命令、退出结果、证据路径、验证范围。

Remaining limitations
- 未运行内容、已知限制、未决资源与下一步。
```

描述最终实现，不把讨论过程或放弃的方案堆进变更摘要；确有取舍才解释。用户界面变更附两种语言与键盘/焦点/可访问性检查；遵守[Console 规范](../../../console-design.md)，不用浏览器原生产品对话框替代应用组件。

## 检查和证据

按改动范围运行 package.json 中已有检查；用专用测试数据库，区分确定性 fixture 与实际 Provider/模型。API 变更检查双 SDK 等价性，生命周期变化检查失败、恢复和清理。不要在普通文档变更或外部贡献流水线中隐式使用个人云凭据。

公开报告写脱敏结论，原始资源 ID 留在私有证据以便失败清理。不要提交密钥、数据库备份、用户提示或 .local。历史失败不因后续通过而删除，缺少证据就写未验证。

提交前确认实现、示例、相关文档和翻译一致，并保留剩余限制。是否创建 commit、打开 PR 或发布，由当前任务授权与项目入口决定；本次产品文档工作不执行这些动作。

下一步：[文档维护](documentation.md)、[执行组合证据](../integrations/verified-combinations.md)、[资源对账](../operate/reconciliation.md)。
