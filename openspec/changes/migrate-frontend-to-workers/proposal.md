## Why

当前前端部署在 Cloudflare Pages 上，使用 `@astrojs/cloudflare` 适配器以 SSR 模式运行。由于 Pages 产品已逐步迁移到 Workers 平台，且线上 Pages 项目已被删除并重建为同名 Worker 项目，需要将前端从 Pages 架构迁移到 Workers + 静态资源（Static Assets）架构，以确保部署正常运行。

## What Changes

- 将 Astro 输出模式从 `server`（SSR）改为静态构建（`output: "static"` 或移除 output 配置）
- 移除 `@astrojs/cloudflare` 适配器，改用 Workers 静态资源部署方案
- 修改构建输出，将所有页面预渲染为静态 HTML 文件
- 将 API 调用从 SSR 服务端请求改为客户端 `fetch` 调用后端 API Worker
- 添加 `wrangler.toml` 配置 Workers 静态资源服务
- 修改 CI/CD 部署流程，从 Pages 部署改为 Workers 部署
- **BREAKING**: 所有原本在服务端执行的 Astro 页面渲染改为构建时静态生成，动态数据获取必须通过客户端 JavaScript 调用 API

## Capabilities

### New Capabilities
- `static-build`: Astro 从 SSR 模式切换为静态站点生成，所有页面在构建时预渲染
- `worker-assets`: Workers 通过 Static Assets 绑定提供前端静态文件服务
- `client-data-fetching`: 所有数据获取从 SSR 改为客户端 fetch 调用 API Worker
- `ci-cd-worker-deploy`: CI/CD 流程从 Pages 部署改为 Workers 部署

### Modified Capabilities
<!-- 无已有 spec 需要修改 -->

## Impact

- **frontend/astro.config.mjs**: 移除 cloudflare adapter，改为静态构建
- **frontend/src/components/features/*.tsx**: 所有 React Island 组件需改为客户端数据加载（原本部分可能在 SSR 阶段注入数据）
- **frontend/src/lib/api.ts**: 确认 API 调用指向正确的生产环境 URL
- **frontend/src/pages/*.astro**: 页面需确保不依赖 SSR 特有功能（如 `getStaticPaths` 之外的动态数据）
- **.github/workflows/**: CI/CD 部署配置需从 Pages 改为 Workers
- **wrangler.toml**: 新增 Workers 配置文件
- **package.json scripts**: 更新构建和部署命令
