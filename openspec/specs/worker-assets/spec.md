# worker-assets Specification

## Purpose
TBD - created by archiving change migrate-frontend-to-workers. Update Purpose after archive.
## Requirements
### Requirement: Workers 通过 Static Assets 绑定提供前端文件
前端 Workers 项目 MUST 使用 Cloudflare Workers Static Assets 绑定，将 Astro 构建产物（`dist/` 目录）作为静态文件提供服务。

#### Scenario: wrangler.toml 配置 Static Assets
- **WHEN** 检查 `frontend/wrangler.toml`
- **THEN** 包含 `assets` 配置项，`directory` 指向 `dist`
- **AND** Workers 的 `name` 设置为 `gomate-frontend`

#### Scenario: Workers 部署包含静态资源
- **WHEN** 执行 `wrangler deploy` 部署前端 Workers
- **THEN** `dist/` 目录下所有文件被上传为 Static Assets
- **AND** 访问 Workers URL 可浏览前端页面

### Requirement: 自定义域名 gomate.live 绑定到前端 Workers
前端 Workers 项目 MUST 绑定自定义域名 `gomate.live`，用户通过该域名访问前端应用。

#### Scenario: 域名访问正常
- **WHEN** 访问 `https://gomate.live`
- **THEN** 返回前端首页 HTML
- **AND** 所有子路由（如 `/locations`、`/teams` 等）返回对应静态页面

### Requirement: 生产环境变量正确配置
前端构建 MUST 使用生产环境 API 地址（`https://api.gomate.live`），通过 `import.meta.env.PUBLIC_API_URL` 注入。

#### Scenario: 生产构建使用正确 API 地址
- **WHEN** 执行生产构建（`NODE_ENV=production astro build`）
- **THEN** `import.meta.env.PUBLIC_API_URL` 的值为 `https://api.gomate.live`

