## ADDED Requirements

### Requirement: Accept-Language Parsing
Middleware 必须解析 HTTP `Accept-Language` 请求头，匹配支持的语言列表（zh-CN、en、ja）。

#### Scenario: 精确匹配首选语言
- **WHEN** Accept-Language 为 `en-US,en;q=0.9,zh-CN;q=0.8`
- **THEN** 匹配到 `en`

#### Scenario: 语言子标签匹配
- **WHEN** Accept-Language 为 `ja-JP,ja;q=0.9`
- **THEN** 匹配到 `ja`

#### Scenario: 无匹配时回退默认
- **WHEN** Accept-Language 为 `fr-FR`（不支持）
- **THEN** 返回默认语言 `zh-CN`

### Requirement: Cookie-based Language Persistence
系统必须通过 `gomate_locale` cookie 持久化用户的语言选择，cookie 有效期为 1 年。

#### Scenario: 设置语言 cookie
- **WHEN** 用户通过语言切换器选择英文
- **THEN** 设置 `gomate_locale=en` cookie，max-age=31536000（1年）

#### Scenario: 读取语言 cookie
- **WHEN** 用户后续访问网站
- **THEN** middleware 读取 cookie 值确定语言偏好
