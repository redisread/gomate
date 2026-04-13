## ADDED Requirements

### Requirement: i18n Routing Configuration
Astro 项目必须在 `astro.config.mjs` 中配置内置 i18n routing，支持 `zh-CN`（默认）、`en`、`ja` 三种语言，使用 prefix 策略且默认语言不带 URL 前缀。

#### Scenario: 默认语言 URL 无前缀
- **WHEN** 用户访问中文（默认语言）页面
- **THEN** URL 不带前缀，如 `/teams` 而非 `/zh-CN/teams`

#### Scenario: 非默认语言 URL 带前缀
- **WHEN** 用户访问英文页面
- **THEN** URL 带 `/en/` 前缀，如 `/en/teams`

#### Scenario: 日文页面 URL
- **WHEN** 用户访问日文页面
- **THEN** URL 带 `/ja/` 前缀，如 `/ja/teams`

#### Scenario: 使用 getRelativeLocaleUrl 生成链接
- **WHEN** 组件中需要生成跨语言页面链接
- **THEN** 必须使用 Astro 提供的 `getRelativeLocaleUrl()` 函数

### Requirement: Language Fallback Strategy
系统必须实现语言回退链：ja → en → zh-CN。当某个 key 在当前语言不存在时，依次向上回退。

#### Scenario: 日文缺失回退到英文
- **WHEN** 日文翻译文件中缺少某个 key
- **THEN** 系统回退到英文翻译显示该 key

#### Scenario: 所有翻译缺失回退到中文
- **WHEN** 英文翻译中也缺少某个 key
- **THEN** 系统回退到中文（默认语言）翻译
