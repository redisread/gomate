## spec: ci-cd-worker-deploy

前端部署到 Cloudflare Workers 平台时，必须支持 SSR Worker 部署。

### Requirements

#### Requirement: SSR Worker 部署
CI/CD 流水线 MUST 使用支持 SSR 的 Workers 部署方式，而非纯静态文件部署。

**Why**: SSR 模式构建产物包含 `_worker.js`（或等效的 SSR 入口），需要通过 Workers 运行时执行，而非静态文件托管。

#### Requirement: wrangler deploy
CI/CD MUST 使用 `wrangler deploy` 或等效的 Workers 部署方式。

**Why**: 保持 Workers 平台部署，与 API Worker 保持一致的部署流程。
