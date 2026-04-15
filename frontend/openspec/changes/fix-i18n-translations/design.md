## Context

GoMate 前端已有一套基于 namespace 的 i18n 翻译系统：
- 翻译数据存储在 `public/locales/{zh-CN,en,ja}/{ns}.json`
- 21 个 namespace（admin, auth, common, content, email, enums, errors, favorites, feedback, filter, home, locationDetail, locations, myTeams, nav, pois, profile, share, teams, ui, userDetail）
- `useI18n()` React hook 支持组件内按需加载 namespace
- SSR 通过 `getSSRT()` 注入翻译到首屏
- `getLocale()` 从 cookie 读取当前语言

但存在两个严重问题：
1. **en/ja JSON 文件直接复制了 zh-CN 中文文案** — 约 1185-1189 条 key 每种语言未翻译
2. **205 处组件硬编码中文** — JSX 文本、aria-label、错误消息、默认值等绕过 i18n 系统

## Goals / Non-Goals

**Goals:**
- en/ja 两种语言的所有 21 个 namespace 翻译完整覆盖
- 所有用户可见文本通过 i18n 系统管理，无硬编码中文
- 页面 title 和 SEO 元数据随语言切换
- 零中文用户体验不变，en/ja 用户获得完整翻译
- 保留现有 i18n 架构，不引入新依赖

**Non-Goals:**
- 不引入新的 i18n 框架（保持现有 useI18n + namespace 方案）
- 不翻译后端 API 响应中的错误消息（已在 API 层处理）
- 不翻译 Flutter 移动端文案
- 不改变现有的 locale 文件结构和命名

## Decisions

### 1. 翻译策略：按 namespace 分批完成

en 和 ja 的翻译按 21 个 namespace 各自独立完成，每个 namespace 的翻译互不影响，可并行分配。优先级排序：

- **P0（用户直接可见）**：nav, home, teams, locations, locationDetail, myTeams, profile, common, enums, ui
- **P1（功能页面）**：auth, filter, favorites, share, feedback, content, pois, errors, userDetail
- **P2（管理/低频）**：admin, email

### 2. 组件硬编码文本处理

**分类处理方案：**

| 类别 | 处理方式 | 归属 namespace |
|------|---------|--------------|
| JSX 用户可见文本 | 提取到 locale 文件 + useI18n | 对应功能域 ns |
| 错误/提示消息 | 提取到 locale 文件 | `ui.json` 或对应 ns |
| aria-label | 提取到 locale 文件 | `ui.json` |
| placeholder | 提取到 locale 文件 | `ui.json` 或对应 ns |
| alt 文本 | 提取到 locale 文件 | `ui.json` |
| 组件常量（季节、城市、装备） | 提取到 locale 文件 | `locations.json` / `profile.json` |
| 组件内注释 | 保留，不翻译 | N/A |

**长文本组件（terms、privacy、help）：**
这些是 FAQ/条款/隐私政策等长文本，不适合放在 JSON 中。方案：在 locale 文件中以数组形式存储，每个条目包含标题和正文。

### 3. Astro 页面 title 国际化

当前 `Layout.astro` 中 title 直接硬编码中文字符串。方案：
- 在 `common.json` 或新增 `seo.json` 中存储 page title
- Layout.astro 通过 SSR `t()` 函数根据 cookie locale 获取翻译

### 4. 不引入翻译管理工具

当前没有使用 i18n 管理平台（如 Crowdin、Lokalise）。保持手动编辑 JSON 文件的方式，项目规模尚可接受。

## Risks / Trade-offs

| 风险 | 缓解 |
|------|------|
| 机器翻译质量不佳 | 翻译后需要人工审核，尤其是日文 |
| JSON 文件中 key 顺序不一致 | 保持与 zh-CN 相同的 key 顺序和结构 |
| 组件中动态拼接字符串可能遗漏 | 系统性扫描，使用 t(key) 替换所有硬编码 |
| 翻译文件体积增大影响加载 | namespace 按需加载，不会一次性加载所有翻译 |
| 长文本（条款、FAQ）放在 JSON 中维护困难 | 考虑后续迁移到 Markdown 文件按语言分目录 |
