## Why

GoMate 前端已搭建基于 namespace 的 i18n 翻译系统（zh-CN/en/ja 三语言），但 en 和 ja 的 JSON locale 文件直接复制了 zh-CN 中文文案（约 1185-1189 条 key 未翻译），导致切换到英文或日文的用户看到的仍然是中文。此外，前端组件中存在 205 处硬编码中文文本（JSX 内容、aria-label、错误提示、默认值等），绕过了 i18n 系统。这两个问题使非中文用户无法正常使用产品。

## What Changes

- **en 和 ja 的 21 个 locale JSON 文件全部翻译**为对应的英文和日文文案（约 1185-1189 条 key/语言）
- **205 处组件硬编码中文迁移到 i18n**，通过 `useI18n()` hook + `t()` 函数获取翻译
- **52 个组件文件修改**：terms-client、privacy-client、help-client 等长文本组件纳入 i18n 管理
- **20 个 Astro 页面的 title 通过 SSR 翻译注入**，使 `<title>` 标签随语言切换
- **新增 `ui.json` 中补充组件级文案**（aria-label、placeholder、错误提示等）

## Capabilities

### New Capabilities
- `i18n-locale-en`: 英文翻译文案完整覆盖所有 21 个 namespace
- `i18n-locale-ja`: 日文翻译文案完整覆盖所有 21 个 namespace
- `i18n-component-texts`: 组件中的用户可见文本全部通过 i18n 系统管理
- `i18n-page-titles`: Astro 页面 title 和 SEO 元数据支持多语言
- `i18n-accessibility-labels`: aria-label、placeholder 等无障碍属性支持多语言

### Modified Capabilities
<!-- 无现有 spec 需要修改 -->

## Impact

- `frontend/public/locales/en/*.json` — 21 个文件需要翻译
- `frontend/public/locales/ja/*.json` — 21 个文件需要翻译
- `frontend/src/components/**/*.tsx` — 约 40+ 组件文件需要修改
- `frontend/src/layouts/Layout.astro` — SEO title 国际化
- `frontend/src/pages/**/*.astro` — 约 20 个页面 title 国际化
- 不影响后端 API、数据库结构或移动端
- 不影响现有中文用户体验
