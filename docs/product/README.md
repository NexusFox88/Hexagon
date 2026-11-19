# Hexagon 产品文档 / Product documentation

Hexagon 将应用中的 Agent 任务连接到可配置的云 Sandbox，并管理任务状态、工具授权、事件和产物。

- [中文文档](zh-CN/index.md)
- [English documentation](en/index.md)

本目录正在按照[内容架构与逐篇任务书](../plans/2026-11-19-documentation-content-architecture.tmp.md)编写。已编写的草稿通过语言入口访问；尚未完成的内容不会以空白页面出现在导航中。[内容覆盖记录](coverage.json)记录全部 82 项资产的交付状态。文章所引用的历史验收不代表本次重新执行了云测试。

This documentation is being written against the repository's current implementation. The coverage ledger tracks the entire planned scope; pending entries are not published pages. Historical acceptance evidence is not a claim of a fresh cloud test.

## 文档结构检查 / Structural checks

```sh
python3 tooling/check-product-docs.py
```

检查覆盖编号、已编写页面、内部文件链接、代码块配对和语言首页可达性。此检查不验证外部链接、标题锚点、内容准确性或真实云行为。`--require-complete` 额外要求全部覆盖状态为 complete；状态更新仍须通过逐篇内容审阅与相应验收。
