# 编写、校验和翻译文档

产品文档放在 docs/product/zh-CN 与 docs/product/en，内部设计决策保留在 docs/plans 等工程目录，真实结果放在 testing/evidence。不要把追加式工程日志直接当作当前使用教程。

## 从用户问题开始

按[内容任务书](../../../plans/2026-11-19-documentation-content-architecture.tmp.md)确认页面 ID、目标路径、读者和职责。一页承担一个主要问题：教程带读者完成固定任务，操作指南解决具体目标，概念解释机制，参考精确定义契约。

每页包含：一句话回答、何时使用、版本/能力前提、具体步骤或定义、成功判据、重要失败出口、来源和最多三个下一步。使用[术语表](../reference/glossary.md)，API 字段、方法名和状态值不翻译。

## 写可核验的内容

字段与默认值来自当前 schema/实现；能力来自注册表；已验证范围来自带时间、SDK、协议和场景的证据。代码示例必须说明依赖、客户端初始化、输入、结果和清理。局部片段明确前置变量；占位域名和测试对象不得伪装成可直接使用的公共服务。

不要复制多份字段表后独立维护。可运行示例放 examples，指南链接或抽取它；生成表注明来源和快照时间。教程不因当前实现缺失而缩减验收旅程；出现冲突先记录并查证。

## 小改动的完整过程

以修改 E2B 模板说明为例：

1. 对照 integrations/sandboxes/e2b.ts 与对应验收记录确认变化，是 schema 默认值、资源前提还是新验证范围。
2. 修改两种语言的同一路径 integrations/sandboxes/e2b.md；必要时同步总览与 OCI 指南，保留历史证据时间。
3. 示例若涉及参数变化，修改其真实源文件并做适当语法/类型检查；未重新执行云任务就明确说明。
4. 更新 coverage.json 中该项的实际状态和验证范围。draft 不自动升级 complete；链接存在也不能证明内容完整。
5. 运行结构检查并人工阅读两个版本，确认来源、限制、下一步与语义一致。

```sh
python3 tooling/check-product-docs.py --report testing/evidence/2026-11-19-product-docs-structure.json
```

该检查只覆盖规划编号、文件、内联 Markdown 文件链接、围栏配对和首页可达性，不检查外部 URL、锚点、示例正确性或云行为。--require-complete 额外检查覆盖状态，仍不代替逐篇审阅。保存报告前确认路径适合本次工作；后续日期的验收应使用对应新文件。

## 双语言与 UI

两种语言使用相同 slug 与等价任务步骤。同步安全边界、错误动作、参数和完成标准，不只翻译标题。尚未同步的页面明确版本或回退状态，不挂空白译文或把旧译文标为最新。

文档译文与产品 UI catalog 是两回事。改 UI 文案还要遵守[Console 契约](../../../console-design.md)：完整 en/zh-CN catalog、匹配插值、可访问名称、动态错误、Intl 格式和双语言浏览器检查。截图使用实际 UI，不暴露凭据或私有资源。

## 发布审阅

读者能否按步骤走通、失败能否恢复、资源能否清理、验证是否超出证据，是人工审阅重点。区分 contract、simulation、real-cloud 与 planned；不把计划写成 passed。公开文档不包含 .local、Token、备份或未经脱敏的用户内容。

当前页面是写作流程，不宣称所有规划文章已完成。下一步：[提案与贡献](proposals-and-prs.md)、[证据阅读](../integrations/verified-combinations.md)。
