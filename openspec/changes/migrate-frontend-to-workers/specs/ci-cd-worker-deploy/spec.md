## ADDED Requirements

### Requirement: CI/CD 使用 Workers 部署前端
GitHub Actions CI/CD 流水线 MUST 将前端部署为 Cloudflare Workers（使用 Static Assets），而非 Cloudflare Pages。

#### Scenario: 前端触发 Workers 部署
- **WHEN** `frontend/**` 或 `packages/**` 路径下的文件推送到 main 分支
- **THEN** GitHub Actions 触发前端构建和部署
- **AND** 使用 `wrangler deploy` 部署到 Workers 平台
- **AND** 不使用 `cloudflare/pages-action` 或 Pages 相关部署步骤

### Requirement: 部署产物为 Workers Static Assets
前端构建产物 MUST 通过 `wrangler deploy` 以 Static Assets 方式上传到 Workers 项目。

#### Scenario: 部署包含完整静态资源
- **WHEN** CI/CD 执行前端部署步骤
- **THEN** 执行 `pnpm web:build` 生成 `dist/` 目录
- **AND** 执行 `wrangler deploy` 将 `dist/` 作为 Static Assets 上传
- **AND** 部署完成后 `https://gomate.live` 可访问

### Requirement: 部署前执行类型检查
前端部署前 MUST 通过 `pnpm type-check` 确保 TypeScript 类型检查通过。

#### Scenario: 类型检查失败阻断部署
- **WHEN** CI/CD 执行 `pnpm type-check`
- **THEN** 如果类型检查失败，流水线终止
- **AND** 不执行后续的构建和部署步骤
