## 1. 移除 SSR 适配器

- [x] 1.1 从 `frontend/astro.config.mjs` 移除 `import cloudflare from "@astrojs/cloudflare"` 导入
- [x] 1.2 从 `frontend/astro.config.mjs` 移除 `adapter: cloudflare()` 配置项
- [x] 1.3 从 `frontend/astro.config.mjs` 移除 `output: "server"` 配置项
- [x] 1.4 从 `frontend/package.json` 移除 `@astrojs/cloudflare` 依赖
- [x] 1.5 执行 `pnpm install` 更新 lockfile
- [x] 1.6 执行 `pnpm web:build` 验证静态构建成功，确认产出 `dist/` 目录且不含 `_worker.js`

## 2. 配置 Workers Static Assets

- [x] 2.1 创建 `frontend/wrangler.toml`，配置 Workers 名称为 `gomate-frontend`，使用与 API 相同的 `account_id`
- [x] 2.2 在 `wrangler.toml` 中配置 `assets` 目录指向 `dist`
- [x] 2.3 配置 `wrangler.toml` 的 `[env.production]` 区块
- [x] 2.4 从 `frontend/.env.production` 确认 `PUBLIC_API_URL=https://api.gomate.live` 已配置

## 3. 验证本地构建和部署

- [x] 3.1 执行 `pnpm web:build` 确认静态构建成功
- [x] 3.2 在 `frontend/` 目录执行 `wrangler deploy --dry-run`（或 `wrangler deploy --dry-run --outdir`）验证部署配置
- [x] 3.3 执行 `pnpm type-check` 确认类型检查通过

## 4. 更新 CI/CD 部署流程

- [x] 4.1 修改 `.github/workflows/frontend-deploy.yml`，将 `cloudflare/pages-action@v1` 替换为 `cloudflare/wrangler-action`
- [x] 4.2 更新部署步骤使用 `wrangler deploy` 命令部署到 Workers
- [x] 4.3 在 CI/CD 中添加 `pnpm type-check` 步骤，类型检查失败时阻断部署
- [x] 4.4 确保 CI/CD 的 `PUBLIC_API_URL` 环境变量在构建时正确注入

## 5. 验证线上功能

- [x] 5.1 确认 CORS 配置（`api/src/middleware/cors.ts`）允许 `https://gomate.live` 来源
- [x] 5.2 确认 Cloudflare Dashboard 中 `gomate.live` 域名已绑定到前端 Workers 项目
- [x] 5.3 推送代码触发 CI/CD，验证前端 Workers 部署成功
- [x] 5.4 访问 `https://gomate.live` 验证首页正常加载 (HTTP 200)
- [ ] 5.5 访问主要页面（地点列表、队伍列表、登录、注册、个人中心）验证功能正常
- [ ] 5.6 验证数据获取正常（客户端 fetch 能正确调用 `https://api.gomate.live`）
