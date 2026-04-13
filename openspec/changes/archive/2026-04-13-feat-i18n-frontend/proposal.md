## Why

GoMate 目前仅支持中文界面，随着项目向海外用户扩展，需要支持多语言（英文、日文）。国际化（i18n）是打开海外市场的基础设施，需要在项目早期搭建好框架，避免后续大规模重构。

## What Changes

- 配置 Astro 内置 i18n routing，支持 `zh-CN`（默认）、`en`、`ja` 三种语言
- 将现有 `copy.ts` 单语言文案迁移为多语言 JSON 体系
- 实现类型安全的 `t()` 翻译工具函数
- 改造所有 React Islands 组件接收 locale props 并使用翻译
- 在导航栏添加语言切换器
- 配置 middleware 实现浏览器语言自动检测
- 为 SEO 添加 hreflang tags 和多语言 sitemap
- 更新所有 Astro 页面传递 locale 上下文

## Capabilities

### New Capabilities

- `i18n-routing`: Astro i18n 路由配置，支持 URL 前缀策略（`/en/...`、`/ja/...`），默认语言无前缀
- `i18n-translations`: 多语言文案管理体系，包含 JSON 翻译文件、`t()` 工具函数、类型安全校验
- `i18n-language-switcher`: 语言切换器组件，支持用户手动选择语言并 cookie 持久化
- `i18n-detection`: 中间件语言检测，根据浏览器 Accept-Language 和 cookie 自动识别用户语言
- `i18n-seo`: 多语言 SEO 支持，包括 hreflang 标签、多语言 sitemap、`<html lang>` 属性

### Modified Capabilities

<!-- 无现有 spec 需要修改 -->

## Impact

- **前端页面**：所有 Astro 页面需传递 locale props，URL 结构变化（非默认语言带前缀）
- **React 组件**：所有 `*-client.tsx` Islands 组件需适配 locale props，替换硬编码中文为 `t()` 调用
- **文案体系**：`copy.ts` 将迁移为 `src/i18n/` 目录下的多语言 JSON 文件
- **导航栏**：新增语言切换 UI
- **SEO**：需更新 sitemap 和 head 标签生成逻辑
- **API**：无影响（纯前端变更）
