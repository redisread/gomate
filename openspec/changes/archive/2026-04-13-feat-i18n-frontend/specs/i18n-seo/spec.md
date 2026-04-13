## ADDED Requirements

### Requirement: hreflang Tags
每个页面必须在 `<head>` 中输出所有可用语言的 `<link rel="alternate" hreflang="...">` 标签，指向当前页面的各语言版本。

#### Scenario: 首页输出多语言 hreflang
- **WHEN** 用户访问英文首页 `/en/`
- **THEN** `<head>` 中包含 `zh-CN`、`en`、`ja` 三个 hreflang 标签，分别指向对应语言的首页 URL

#### Scenario: hreflang x-default
- **WHEN** 生成 hreflang 标签
- **THEN** 额外包含 `hreflang="x-default"` 指向默认语言（zh-CN）页面

### Requirement: HTML lang Attribute
每个页面的 `<html>` 标签必须设置正确的 `lang` 属性，对应当前页面语言。

#### Scenario: 中文页面
- **WHEN** 渲染中文页面
- **THEN** `<html lang="zh-CN">`

#### Scenario: 英文页面
- **WHEN** 渲染英文页面
- **THEN** `<html lang="en">`

### Requirement: Multi-language Sitemap
项目必须生成包含所有语言版本 URL 的多语言 sitemap。

#### Scenario: sitemap 包含多语言条目
- **WHEN** 构建 sitemap
- **THEN** 每个 URL 条目包含所有语言变体的 `<xhtml:link>` 标签
