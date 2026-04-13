## Context

GoMate 前端 commit `6b8cc18` 移除了 `@astrojs/cloudflare` 适配器和 `output: "server"`，改为静态构建 + Workers Static Assets。这个迁移的动机是"所有页面都不需要 SSR——数据获取已在客户端完成"。

但迁移后动态路由全部 404，因为：
1. 静态构建时 `getStaticPaths()` 只返回 `fallback`
2. 动态 ID（地点 ID、队伍 ID）无法在构建时预知
3. Workers Static Assets 找不到对应 HTML 文件直接返回 404

## Decisions

### 1. 恢复 SSR 模式

**决策**: 在 `astro.config.mjs` 中恢复 `output: "server"` + `adapter: cloudflare()`

**理由**: 
- GoMate 的架构依赖 SSR 做 SEO meta 注入（title、description、hreflang）
- 动态路由需要运行时按需渲染
- Cloudflare Workers 免费额度（10万请求/天）足够覆盖当前流量

**替代方案**:
- 预渲染所有动态页面（需要构建时调用 API 获取所有 ID，不适合动态数据）
- SPA 模式（丢失 SEO）

### 2. 删除 `getStaticPaths()`

**决策**: 从所有动态路由页面中删除 `getStaticPaths()` 函数

**理由**: SSR 模式下，动态路由通过 `Astro.params` 运行时获取参数，不需要 `getStaticPaths()`

**影响的页面**:
- `frontend/src/pages/locations/[id].astro`
- `frontend/src/pages/teams/[id].astro`
- `frontend/src/pages/users/[id].astro`
- `frontend/src/pages/teams/[id]/edit.astro`
- `frontend/src/pages/admin/locations/[id]/edit.astro`
- `frontend/src/pages/blog/[slug].astro`

### 3. 部署方式

**决策**: 使用 `wrangler deploy` 部署 SSR Worker

**理由**: 
- 保持 Workers 平台部署（而非 Pages）
- `@astrojs/cloudflare` 适配器在 `astro build` 后生成 `.output/server/_worker.js`
- 通过 `wrangler deploy` 可部署 SSR Worker

**CI/CD 变更**:
- 构建: `astro build`
- 部署: `wrangler deploy`（需要支持 SSR 的 Workers 配置）

## Risks / Trade-offs

| Risk | Mitigation |
|------|-----------|
| SSR 冷启动延迟 ~100ms | 对用户体验影响微小，可接受 |
| Workers 请求额度可能超限 | 当前流量远低于免费额度，可监控 |
| 需要重新配置 wrangler.toml | 参考 Astro 官方 Cloudflare 部署文档 |
