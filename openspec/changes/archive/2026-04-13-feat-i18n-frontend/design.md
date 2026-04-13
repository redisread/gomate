## Context

GoMate 前端基于 Astro 4 + React 18 构建，采用 Astro 壳 + React Islands（client:load）架构。当前所有 UI 文案通过 `frontend/src/lib/copy.ts` 以单语言（中文）对象形式管理。项目已有约 1400 行文案、20+ 个 client 组件、25 个 Astro 页面。

**约束条件：**
- 必须保持向后兼容：默认中文 URL 不带前缀（`/teams` 而非 `/zh-CN/teams`）
- React Islands 组件通过 props 接收 locale，不引入额外 i18n 运行时依赖
- 翻译 key 必须 TypeScript 类型安全，编译时暴露缺失翻译
- 零运行时额外包（不引入 react-i18next 等库），保持轻量

## Goals / Non-Goals

**Goals:**
- 实现 zh-CN（默认）、en、ja 三种语言的前端界面
- 默认语言 URL 无前缀，其他语言带前缀（`/en/...`、`/ja/...`）
- 语言切换通过 cookie 持久化，页面切换时保持
- 浏览器语言自动检测与重定向
- 翻译 key 全量类型安全

**Non-Goals:**
- 不翻译后端 API 返回的动态内容（如用户生成的队伍描述、地点名称），这些内容属于未来内容本地化（content localization）范畴
- 不引入 react-i18next 等重型 i18n 框架
- 不在本阶段实现 RTL 语言支持
- 不翻译 Markdown/Content Collections 内容（如博客文章）

## Decisions

### 1. Astro 内置 i18n Routing vs 自定义路由

**选择：Astro 内置 i18n**

- Astro 4.16+ 原生支持 i18n routing，提供 `getRelativeLocaleUrl()`、`useTranslations()` 等工具
- 与 Cloudflare Pages 部署兼容
- 自动生成多语言 sitemap

**备选：自定义 middleware + 路由映射**
- 更灵活但需自行处理 SSR 路由、sitemap、SEO
- 维护成本高，不作为首选

### 2. 翻译文案存储格式：JSON vs TS

**选择：JSON 文件 + TS 类型生成**

- 翻译文件存为 `src/i18n/locales/{zh-CN,en,ja}.json`
- 通过 `import en from './locales/en.json'` 在构建时注入
- 类型安全通过 `typeof zh-CN` 推导翻译 key 类型

**备选：保持 TS 对象（copy.ts 风格）**
- 优点：直接类型推断
- 缺点：多语言扩展后文件过大，不利于翻译外包/协作
- 决策：用 JSON 存储数据，用 TS 做类型约束，两全

### 3. React Islands 组件传参方式

**选择：通过 props 传递 locale + t 函数**

```tsx
// Astro 页面
<HomeClient locale={Astro.params.locale} t={t} />

// 组件内
<h1>{t('hero.titleLine1')}</h1>
```

- 简单直接，与现有组件结构兼容
- 每个 Islands 组件独立接收翻译能力
- 不依赖 React Context，避免 Islands 架构下的 Context 传递问题

**备选：全局 Context Provider**
- Islands 架构中 Context 难以跨壳传递
- 不采用

### 4. 语言检测策略

**优先级：cookie > URL 前缀 > Accept-Language > 默认 zh-CN**

- Middleware 读取 cookie `gomate_locale`
- 如果 URL 已带 locale 前缀，使用 URL 中的
- 如果 cookie 为空，从浏览器 `Accept-Language` 匹配
- 匹配失败时回退：ja → en → zh-CN

### 5. 枚举文案迁移策略

- `copy.enums` 下的枚举 key 保持不变（如 `enums.difficulty.easy`）
- 每个枚举值翻译到对应语言 JSON
- 现有组件中 `copy.enums.xxx` 调用替换为 `t('enums.xxx')`

## Risks / Trade-offs

| 风险 | 缓解措施 |
|------|---------|
| 翻译遗漏导致运行时显示 key 而非文案 | `t()` 函数在开发模式下对缺失 key 打印 console.warn |
| JSON 文件体积增长 | 按语言拆分，构建时 tree-shake 未使用语言 |
| 组件改造工作量大（20+ client 组件） | 先改造共享组件（navbar、footer），再逐个页面迁移 |
| Astro i18n 与现有 SSR Cloudflare 适配器兼容性 | 本地先验证 `wrangler dev` 下 i18n 路由是否正常 |
| ja 语言翻译质量不足 | 先用英文补齐，日文翻译可后续由社区贡献 |
