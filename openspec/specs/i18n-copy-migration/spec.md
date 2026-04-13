## ADDED Requirements

### Requirement: copy.ts 文案完整迁移
`copy.ts` 文件中定义的所有中文文案 SHALL 被迁移到 i18n 翻译系统中。迁移后的 key 路径 SHALL 保持与 `copy.ts` 原有的层级结构一致（如 `copy.teams.joinTeam` → `t('teams.joinTeam')`）。

#### Scenario: 所有 key 在 i18n 中存在对应项
- **WHEN** 对比 `copy.ts` 中所有叶子 key 和 i18n `zh-CN` namespace 文件中的所有 key
- **THEN** 每个 `copy.ts` key 在 i18n 系统中都有对应的 namespace + key 路径

#### Scenario: 迁移后组件引用更新
- **WHEN** 迁移完成后搜索 `@/lib/copy` 的 import 引用
- **THEN** 结果为 0（无任何文件再引用 copy.ts）

### Requirement: copy.ts 文件删除
在完成所有文案迁移和组件引用替换后，`frontend/src/lib/copy.ts` 文件 SHALL 被永久删除。

#### Scenario: 文件不存在
- **WHEN** 迁移完成后检查 `frontend/src/lib/copy.ts`
- **THEN** 该文件不存在于文件系统中

### Requirement: 引用替换一致性
所有原来使用 `copy.xxx.yyy` 的组件 SHALL 被替换为等效的 `t('xxx.yyy')` 调用。替换 SHALL 保持原有的动态拼接逻辑（如模板字符串中的变量替换）。

#### Scenario: 静态文案替换
- **WHEN** 原代码为 `copy.common.loading`
- **THEN** 替换后为 `t('common.loading')`

#### Scenario: 动态文案替换
- **WHEN** 原代码为 `` `${count} ${copy.teams.teamCountSuffix}` ``
- **THEN** 替换后为 `t('teams.teamCountSuffix', { vars: { count } })` 或等效的模板拼接

### Requirement: 翻译值类型兼容
迁移到 i18n JSON 中的翻译值 SHALL 保持与 `copy.ts` 相同的语义。`copy.ts` 中使用模板说明的动态文案（如注释中的 "N 在组件内拼接"）SHALL 转换为 `{variable}` 格式的占位符。

#### Scenario: 带注释的动态文案转换
- **WHEN** `copy.ts` 中某值注释为 "「N 支队伍正在等待伙伴」，N 在组件内拼接"
- **THEN** i18n JSON 中对应值为 `"有 {count} 支队伍正在等待伙伴"`

### Requirement: Namespace 归属正确性
`copy.ts` 中的每个文案 SHALL 被分配到正确的 namespace 文件中。分配规则 SHALL 遵循 `copy.ts` 现有的顶层 key 作为 namespace 标识符。

#### Scenario: 枚举文案归属
- **WHEN** `copy.enums.teamStatus.recruiting` 被迁移
- **THEN** 它被写入 `public/locales/{locale}/enums.json` 的 `teamStatus.recruiting` 路径下

#### Scenario: 嵌套子层级归属
- **WHEN** `copy.teams.storyNarrative.growing` 被迁移
- **THEN** 它被写入 `public/locales/{locale}/teams.json` 的 `storyNarrative.growing` 路径下
