## spec: static-build

前端必须通过 SSR 模式构建，以支持动态路由和 SEO meta 标签。

### Requirements

#### Requirement: SSR 模式构建
前端 MUST 使用 `output: "server"` 模式构建，所有页面在运行时按需渲染。

**Why**: 动态路由（locations/:id, teams/:id 等）无法在构建时预知所有 ID，必须运行时渲染。SSR 同时提供 SEO meta 标签注入能力。

#### Requirement: Cloudflare 适配器
前端 MUST 使用 `@astrojs/cloudflare` 适配器构建 Cloudflare Workers 兼容的 SSR 产物。

**Why**: 目标部署平台为 Cloudflare Workers，需要适配器生成 Workers 兼容的部署产物。

#### Requirement: 动态路由无需 getStaticPaths
所有动态路由页面（`[id].astro`, `[slug].astro`）MUST 不导出 `getStaticPaths()` 函数。

**Why**: SSR 模式下动态路由通过 `Astro.params` 运行时获取参数，`getStaticPaths()` 仅在静态预渲染时需要。
