# static-build Specification

## Purpose
TBD - created by archiving change migrate-frontend-to-workers. Update Purpose after archive.
## Requirements
### Requirement: Astro 项目使用静态构建模式
Astro 项目 MUST 从 SSR 模式（`output: "server"` + `adapter: cloudflare()`）切换为默认静态构建模式，所有 `.astro` 页面在 `astro build` 时预渲染为静态 HTML 文件。

#### Scenario: 构建产出静态 HTML
- **WHEN** 执行 `pnpm web:build`（即 `astro build`）
- **THEN** `frontend/dist/` 目录下每个 `.astro` 页面对应一个 `index.html` 文件
- **AND** 不生成 `_worker.js` 或 SSR 相关产物

#### Scenario: 本地开发模式不变
- **WHEN** 执行 `pnpm web:dev`（即 `astro dev`）
- **THEN** 开发服务器在 localhost:5432 正常启动
- **AND** 所有页面可正常访问

### Requirement: 移除 Cloudflare Pages 适配器依赖
项目 MUST 移除 `@astrojs/cloudflare` 适配器及其在配置中的引用，不再依赖 Cloudflare Pages 特有的 SSR 能力。

#### Scenario: 配置文件不含 SSR 适配器
- **WHEN** 检查 `astro.config.mjs`
- **THEN** 不存在 `import cloudflare from "@astrojs/cloudflare"` 导入
- **AND** 不存在 `adapter: cloudflare()` 配置项
- **AND** 不存在 `output: "server"` 配置项

### Requirement: 公共静态资源正确映射
`frontend/public/` 目录下的静态资源（favicon.svg、wechat-qr.png 等）MUST 在构建后保持可访问路径不变。

#### Scenario: 静态资源可访问
- **WHEN** 构建产物部署后访问 `/favicon.svg`
- **THEN** 返回 `frontend/public/favicon.svg` 文件内容

