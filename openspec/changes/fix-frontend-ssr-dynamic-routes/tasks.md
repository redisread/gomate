## 1. 恢复 SSR 配置

- [x] 1.1 在 `frontend/astro.config.mjs` 中加回 `output: "server"`
- [x] 1.2 安装 `@astrojs/cloudflare` 适配器（如尚未安装）
- [x] 1.3 在 `frontend/astro.config.mjs` 中加回 `adapter: cloudflare()`

## 2. 清理动态路由页面

- [x] 2.1 删除 `frontend/src/pages/locations/[id].astro` 的 `getStaticPaths()`
- [x] 2.2 删除 `frontend/src/pages/teams/[id].astro` 的 `getStaticPaths()`
- [x] 2.3 删除 `frontend/src/pages/users/[id].astro` 的 `getStaticPaths()`
- [x] 2.4 删除 `frontend/src/pages/teams/[id]/edit.astro` 的 `getStaticPaths()`
- [x] 2.5 删除 `frontend/src/pages/admin/locations/[id]/edit.astro` 的 `getStaticPaths()`
- [x] 2.6 删除 `frontend/src/pages/blog/[slug].astro` 的 `getStaticPaths()`（如有）

## 3. 配置 Workers SSR 部署

- [x] 3.1 更新 `frontend/wrangler.toml` 配置 SSR Worker 部署
- [x] 3.2 更新 `.github/workflows/frontend-deploy.yml` 使用支持 SSR 的部署流程

## 4. 验证

- [x] 4.1 本地 `pnpm dev` 验证动态路由正常
- [x] 4.2 本地 `pnpm web:build` 验证 SSR 构建产物
- [x] 4.3 推送 main 验证 CI/CD 部署
- [ ] 4.4 验证线上动态路由返回 200
- [ ] 4.5 验证 SEO meta 标签正确渲染
