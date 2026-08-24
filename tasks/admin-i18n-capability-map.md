# Capability Map: 管理后台 i18n 完整性治理

状态：已批准（2026-08-25）

| Module ID | 责任 | 依赖 |
|---|---|---|
| `admin-i18n-contract`（已完成） | 定义三语言词汇、namespace 归属、角色/状态/季节/活动类型展示映射、API 错误本地化边界 | — |
| `admin-copy-experience`（已完成） | 修复全部管理员触点的标题、表单、动态枚举、反馈状态和日文质量，并增加后台语言切换入口 | `admin-i18n-contract` |
| `admin-i18n-guardrails`（已完成） | 增加硬编码、无效 key、原始枚举、namespace 覆盖检查，以及三语言关键路径运行时测试 | `admin-i18n-contract`、`admin-copy-experience` |

构建顺序：

`admin-i18n-contract` → `admin-copy-experience` → `admin-i18n-guardrails`

## Initiative Boundaries

- 只翻译产品 UI，不翻译地点名、地区名、标签名、用户昵称等业务内容。
- 支持语言固定为 `zh-CN`、`en`、`ja`。
- API 保持语言无关；客户端根据稳定 `code/reason` 翻译，无法分类时显示本地化通用错误。
- 复用现有 i18n、`LocaleToggle`、Vitest 和浏览器测试能力，不新增依赖。
- 不修改数据库 schema、迁移或生产数据。
- 只治理管理员可见界面及必要共享枚举，不扩展为全站 i18n 重构。

## Lifecycle

本文件及同目录的模块规格、计划和任务清单仅作为实施期间的工作事实来源。完成治理后，将长期约束合并进现有 `docs/` 文档并从工作树移除这些临时文件。
