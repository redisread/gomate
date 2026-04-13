## ADDED Requirements

### Requirement: Multi-language Translation Files
项目必须在 `frontend/src/i18n/locales/` 目录下维护 `zh-CN.json`、`en.json`、`ja.json` 三个翻译文件，覆盖现有 `copy.ts` 中的所有用户可见文案。

#### Scenario: 翻译文件结构一致
- **WHEN** 三种语言的翻译文件被加载
- **THEN** 它们必须具有完全相同的 key 结构，仅 value 不同

#### Scenario: 现有中文文案完整迁移
- **WHEN** 从 `copy.ts` 迁移现有文案
- **THEN** 所有已有中文文案必须完整出现在 `zh-CN.json` 中

### Requirement: Type-safe t() Function
必须实现 `t(key, locale)` 工具函数，支持 TypeScript 编译时 key 检查，缺失 key 在编译期暴露。

#### Scenario: 有效 key 返回对应翻译
- **WHEN** 调用 `t('hero.titleLine1', 'zh-CN')`
- **THEN** 返回中文 "发现趣处"

#### Scenario: 缺失 key 在开发环境告警
- **WHEN** 调用一个在任何语言文件中都不存在的 key
- **THEN** `t()` 函数在开发模式下输出 console.warn，并返回 key 字符串本身

#### Scenario: 类型推导翻译 key
- **WHEN** 在 TypeScript 文件中调用 `t()` 函数
- **THEN** IDE 自动补全所有可用的翻译 key，传错 key 时报编译错误

### Requirement: Translation Key Namespace
翻译 key 必须保持与现有 `copy.ts` 相同的层级结构（最多 2 层嵌套），以 `.` 分隔，如 `hero.titleLine1`、`auth.loginBtn`。

#### Scenario: 枚举 key 命名
- **WHEN** 访问枚举文案（难度、状态等）
- **THEN** key 格式为 `enums.{enumName}.{value}`，如 `enums.difficulty.easy`

#### Scenario: 动态文案模板
- **WHEN** 翻译值中包含可替换变量
- **THEN** 使用 `{variable}` 模板语法，如 `有 {count} 支队伍` → `t('teams.openTeamsSubtitle', { count: 5 })`
