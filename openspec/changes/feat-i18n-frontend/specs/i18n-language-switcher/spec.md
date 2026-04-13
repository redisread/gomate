## ADDED Requirements

### Requirement: Language Switcher Component
必须在导航栏（navbar）中提供语言切换器，允许用户在 zh-CN、en、ja 之间切换。

#### Scenario: 显示当前语言
- **WHEN** 用户打开语言切换器
- **THEN** 当前语言被高亮显示

#### Scenario: 切换语言并重定向
- **WHEN** 用户从切换器中选择一种新语言
- **THEN** 页面重定向到对应语言的相同路由，并设置 `gomate_locale` cookie

#### Scenario: cookie 持久化语言选择
- **WHEN** 用户选择语言后访问新页面
- **THEN** 语言选择通过 cookie 保持，不回到浏览器默认语言

### Requirement: Middleware Language Detection
Astro middleware 必须在页面请求时检测用户语言，优先级：URL 前缀 > cookie `gomate_locale` > Accept-Language 头 > 默认 zh-CN。

#### Scenario: URL 前缀优先
- **WHEN** 用户访问 `/en/teams`
- **THEN** 页面语言为英文，忽略 cookie 和 Accept-Language

#### Scenario: cookie 语言生效
- **WHEN** 用户访问 `/teams` 且 cookie 中 `gomate_locale=en`
- **THEN** 页面重定向到 `/en/teams`

#### Scenario: 浏览器语言匹配
- **WHEN** 用户首次访问且无 cookie，浏览器 Accept-Language 为 `ja-JP,ja;q=0.9`
- **THEN** 页面重定向到 `/ja/` 对应首页

#### Scenario: 不支持的语言回退
- **WHEN** 浏览器 Accept-Language 为 `de-DE`（德语，不支持）
- **THEN** 使用默认语言 zh-CN，不进行重定向
