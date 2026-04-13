## ADDED Requirements

### Requirement: Key 集合一致性校验
在 CI 流程中，系统 SHALL 验证所有非默认语言（en、ja）的每个 namespace 文件的 key 集合与默认语言（zh-CN）对应文件完全一致。

#### Scenario: Key 集合完全匹配
- **WHEN** CI 运行 i18n key 校验
- **THEN** 对于每个 namespace 文件，`en/{ns}.json` 和 `ja/{ns}.json` 的所有 key 路径集合与 `zh-CN/{ns}.json` 完全相同

#### Scenario: 发现多余 key
- **WHEN** `en/teams.json` 包含一个 `zh-CN/teams.json` 中不存在的 key
- **THEN** CI 失败，并输出告警信息指明多余 key 的路径

#### Scenario: 发现缺失 key
- **WHEN** `ja/teams.json` 缺少 `zh-CN/teams.json` 中存在的 key
- **THEN** CI 失败，并输出告警信息指明缺失 key 的路径

### Requirement: 嵌套深度校验
系统 SHALL 验证每个 namespace JSON 文件的嵌套深度不超过 3 层。超过 3 层的嵌套 SHALL 导致校验失败。

#### Scenario: 合法嵌套深度
- **WHEN** JSON 文件包含 `{"storyNarrative": {"growing": "..."}}`（2 层）
- **THEN** 校验通过

#### Scenario: 超限嵌套深度
- **WHEN** JSON 文件包含 `{"a": {"b": {"c": {"d": "..."}}}}`（4 层）
- **THEN** 校验失败，并指出超限的 key 路径

### Requirement: 空值检测
系统 SHALL 验证所有翻译值不为空字符串、null 或 undefined。空值 SHALL 导致校验失败。

#### Scenario: 空字符串检测
- **WHEN** 某 namespace 文件中某个 key 的值为 `""`
- **THEN** 校验失败，并指出空的 key 路径

### Requirement: 校验脚本可本地运行
CI 中的 i18n key 校验 SHALL 封装为可独立运行的脚本，开发人员 SHALL 能在本地执行相同的校验。

#### Scenario: 本地运行校验
- **WHEN** 开发人员运行 `pnpm i18n:validate`
- **THEN** 脚本输出校验结果，包括通过/失败状态和详细的 key 差异信息
