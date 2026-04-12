## Context

GoMate 前端当前使用 Astro 4 + `@astrojs/cloudflare` 适配器，以 `output: "server"` 模式部署在 Cloudflare Pages 上。所有页面都是 Astro 壳（.astro 文件），内部 React Islands 组件使用 `client:load` 指令，数据获取完全在客户端通过 `fetchAPI()` 调用后端 API Worker（`api.gomate.live`）。

线上 Pages 项目已被删除，已创建同名 Workers 项目。需要将前端迁移到 Workers + Static Assets 架构。

**关键发现**：所有 18 个 Astro 页面都仅包含 `<Layout>` 包裹的 `<XxxClient client:load />`，页面本身不执行任何 SSR 数据获取。所有数据加载都在 React 组件内通过 `api.ts` 的 `fetch()` 完成。这意味着迁移到静态构建几乎是无缝的——只需移除 SSR 适配器，确保构建产出静态 HTML 壳即可。

## Goals / Non-Goals

**Goals:**
- 前端通过 Workers Static Assets 绑定提供静态文件服务
- 保持所有现有功能不变（数据获取已是客户端模式）
- 部署流程从 Pages 改为 Workers
- 本地开发体验保持不变

**Non-Goals:**
- 不引入 SSR/Edge 渲染能力（纯静态站点）
- 不修改后端 API Worker 配置
- 不改变现有的 API 调用模式（已经是客户端 fetch）
- 不涉及移动端（mobile/）变更

## Decisions

### 1. 使用 Workers Static Assets 而非 Pages

**决策**: 将前端构建产物通过 Workers Static Assets 绑定提供，由 API Worker 所在的 Workers 项目托管前端静态文件。

**理由**: 用户已在线上创建了同名 Workers 项目，且 Cloudflare 正将 Pages 功能合并到 Workers 平台。Static Assets 是 Workers 提供静态文件的标准方式。

**替代方案**:
- 继续使用 Pages（已不可行，线上项目已删除）
- 使用其他静态托管（增加运维复杂度，不必要）

### 2. Astro 改为静态构建模式

**决策**: 从 `astro.config.mjs` 中移除 `adapter: cloudflare()` 和 `output: "server"`，改为默认静态构建。

**理由**: 所有页面都不需要 SSR——页面本身只是 HTML 壳，数据全部通过客户端 `fetch()` 获取。静态构建更快、更简单、成本更低。

**替代方案**:
- 保留 SSR 模式并部署为独立 Worker（增加复杂度和成本，无收益）
- 使用 `@astrojs/cloudflare` 的 SSR 模式（已被当前架构取代）

### 3. 前端使用独立的 Workers 项目部署

**决策**: 前端通过 `wrangler deploy` 部署到 Workers，使用 Static Assets 绑定提供构建产物。前端和 API 使用不同的 Workers 项目（`gomate-frontend` 和 `gomate-api`）。

**理由**: 职责分离，前后端独立部署和扩缩。

### 4. wrangler.toml 放在 frontend/ 目录

**决策**: 在 `frontend/` 目录创建独立的 `wrangler.toml`，配置 Workers Static Assets 绑定指向 `dist/` 目录。

**理由**: 标准的 monorepo 做法，每个可部署单元有自己的 wrangler 配置。

## Risks / Trade-offs

| Risk | Mitigation |
|------|-----------|
| 静态构建后，原本 SSR 可能注入的 meta 标签（OG、SEO）会丢失 | 检查 Layout.astro 中是否有动态 meta 注入，如有需改为构建时静态生成或使用客户端 JS 动态设置 |
| 路由模式变化可能导致 SPA 路由 404 | Astro 静态构建会为每个 `.astro` 页面生成独立的 HTML 文件，不存在 SPA 路由问题 |
| 构建产物大小增加 Workers 部署时间 | Astro 静态构建产物通常 < 50MB，远低于 Workers 限制 |
| `_redirects` 或 `_headers` 等 Pages 特性在 Workers 中不可用 | Workers Static Assets 使用 `wrangler.toml` 配置重定向和 headers |

## Migration Plan

1. 在本地完成所有配置修改和构建验证
2. 推送代码到 main 分支触发 CI/CD
3. CI/CD 使用新的 Workers 部署流程部署前端
4. 验证线上 `https://gomate.live` 正常工作
5. 如有问题，回滚 git commit 重新触发旧的 Pages 部署（需恢复 Pages 项目）

## Open Questions

- 前端 Workers 项目的 `account_id` 是否与 API Worker 相同（同一 Cloudflare 账户）？假设相同，使用 api/wrangler.toml 中的 account_id
- 是否需要自定义域名绑定？当前 `gomate.live` 域名是否已配置到 Workers 项目？这需要用户在 Cloudflare Dashboard 手动配置
