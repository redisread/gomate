## Problem

commit `6b8cc18` (2026-04-12) 将前端从 SSR 模式迁移到静态构建（Workers Static Assets），但迁移后**所有动态路由页面 404**：

- `/locations/:id` → 404
- `/teams/:id` → 404
- `/users/:id` → 404
- `/teams/:id/edit` → 404
- `/admin/locations/:id/edit` → 404
- `/blog/:slug` → 404

根因：静态构建模式下，`getStaticPaths()` 只返回 `fallback`，只生成了无效页面 `/locations/fallback`。而新增地点/队伍等动态 ID 没有对应的预渲染 HTML，Workers Static Assets 直接返回 404。

## Proposed Solution

恢复 `output: "server"` + `@astrojs/cloudflare` SSR 模式，通过 Cloudflare Workers 运行时按需渲染动态路由。

**改动范围：**
1. `frontend/astro.config.mjs`：加回 `output: "server"` 和 `adapter: cloudflare()`
2. 所有动态路由页面：删除 `getStaticPaths()`
3. CI/CD：使用 `wrangler deploy` 部署 SSR Worker（支持 SSR 的 Workers 部署）

**为什么不是预渲染方案：**
- 地点/队伍数据动态创建，每次新数据都需要重新部署
- SEO meta 标签（title、description、hreflang）依赖 SSR 注入

**为什么不是 SPA 方案：**
- 搜索引擎爬虫无法渲染客户端内容，SEO 完全丢失
- 首屏加载时间变长

## Success Criteria

- [ ] `https://gomate.live/locations/smNUEJX2UQOJ0BnWQ6won` 返回 200
- [ ] 所有动态路由页面正常访问
- [ ] SEO meta 标签（title、description、hreflang）正确渲染
- [ ] 部署在 Cloudflare Workers 平台
- [ ] CI/CD 流水线正常工作
