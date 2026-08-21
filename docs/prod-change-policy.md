# GoMate 生产变更规约

本文只描述当前生产拓扑、授权边界、发布能力和回滚方式。已完成的一次性迁移、割接与退役过程由 GitHub Actions run 和 Git 历史保留，不作为现行操作手册继续维护。

## 1. 当前生产拓扑

- 生产域名：`https://gomate.live`
- Worker 服务：`gomate-production-preview`（历史命名，现为唯一生产 Worker）
- Worker 入口：`frontend/src/worker.ts`
- API：同源 `/api/*`，进程内交给 `api/src/app.ts`
- D1：binding `DB`，`gomate-db-v2`，UUID `befa3d89-6551-4a25-8a1c-670efe62a315`
- KV：binding `CACHE_KV`，`gomate-cache-v2`，ID `f9904d1fa72140c18067e07d541ca92b`
- R2：binding `R2`，bucket `gomate`
- Rate Limiting bindings：`AUTH_SIGN_IN_RATE_LIMITER`、`AUTH_SIGN_UP_RATE_LIMITER`、`AUTH_EMAIL_RATE_LIMITER`
- GitHub `production` environment secrets：`CLOUDFLARE_API_TOKEN`、`CLOUDFLARE_ACCOUNT_ID`、`CLOUDFLARE_ZONE_ID`、`BETTER_AUTH_SECRET`、`RESEND_API_KEY`、`PRODUCTION_APP_URL`；受保护部署根据生产 origin 生成 Worker runtime secret `APP_URL`

旧 split Workers、`api.gomate.live`、旧 D1、旧 KV 和旧 route rollback 已删除。`pnpm check:legacy-removal` 阻止这些标识重新进入运行时代码或工作流。

生产 D1 目标结构为 19 张业务表、13 个触发器；稳定 Region ID 包括 `region-cn`、`region-cn-guangdong`、`region-cn-shenzhen`。`region-cn-shenzhen` 还是匿名 local-circle fallback，不得随意改名。迁移发布前不得把仓库目标结构误报为已应用生产状态。

## 2. 授权边界

以下操作均属于生产写入：创建/删除 Cloudflare 资源、D1 remote migration/execute、KV/R2 写入、secret 写入、Worker 部署、version promotion、route/custom-domain 变更和 `WRITE_MODE` 变更。

每次生产写入必须同时满足：

1. 在任务或 PR 中列出精确资源、预期状态、影响面、验证和回滚方式；
2. 获得用户对本次精确范围的显式批准；
3. 从 `main` 通过 GitHub `production` protected environment 执行；
4. 使用正常 environment review，不使用 admin bypass；
5. secrets 只在需要它的步骤暴露，且不得写入日志、artifact、PR、命令参数或仓库级 Actions secrets；
6. 执行后保存 run URL、head SHA、资源/version 结果与只读验证证据。

禁止在开发机直接运行生产 Cloudflare 写命令。只读 inventory/health 检查可以在任务范围内执行，但不得据此扩大写入权限。

## 3. 当前发布能力

仓库不在 push `main` 时自动部署。`.github/workflows/deploy.yml` 只接受 `main` 上手动输入 `DEPLOY_PRODUCTION`，并通过 GitHub `production` protected environment 执行。发布顺序固定为：

1. 重跑源代码、migration、类型、测试、构建、bundle size 与 startup 门禁；
2. 验证 `gomate.live` 仍只绑定到 `gomate-production-preview`，生产 binding、route、write mode、observability 与 secrets 声明符合仓库配置；
3. 使用官方 `cloudflare/wrangler-action@v4` 和仓库锁定的 Wrangler 版本执行 `versions upload`，通过 `WRANGLER_OUTPUT_FILE_PATH` 读取不可变 version ID；
4. 保持现行版本 100% 流量，将候选版本加入 deployment 但设为 0%，通过 `Cloudflare-Workers-Version-Overrides` 请求头在 `gomate.live` 上验证候选版本；冒烟包含 health、Region 与 Astro SSR，并为 Cloudflare deployment 传播保留两分钟重试窗口；
5. 在同一个受保护 job 内将同一个候选 version ID 提升到 100%，不得重新构建；候选、推广、观察和恢复不跨 job，避免审批等待或新 runner 初始化留下 0% 的中间 deployment；
6. 验证 health、Region、SSR、`X-Request-ID` 与 Version Metadata，并进行五分钟只读观察；候选或生产验证失败或取消时恢复上一版本 100%。

Wrangler secrets 文件只在 GitHub runner temp 中以 `0600` 权限短暂存在，清理脚本只接受精确文件名；secrets 文件和内容不得进入 artifact。候选证据 artifact 只保存原 deployment inventory 与 Wrangler 结构化输出，保留 90 天。

Worker 发布 workflow 不执行 D1 migration。数据库变更只走独立的 `.github/workflows/migrate-production.yml`：手动输入 `APPLY_PRODUCTION_MIGRATIONS` 和已证明同时兼容 migration 前后 schema 的当前 Worker version UUID；workflow 要求 allowlist 只包含这一个 UUID，且该 UUID 正在承载 100% 生产流量，随后才应用 pending migrations。这样 migration 开始前就已关闭所有旧 schema 版本的回滚入口，Worker 发布失败也不会把旧版本恢复到一个已经不兼容的 schema。

每次成功发布后，run summary 会给出不可变 version UUID。只有经过单独 PR 审核并加入 `.github/production-version-allowlist.json` 的 version，才能作为 rollback 或 schema contract migration 的兼容性边界；空 allowlist 会安全地禁止这两类操作，不允许用自由文本确认绕过。

GitHub 的失败和正常取消会进入自动恢复步骤；如果 runner 被强制终止或平台无法继续调度 cleanup step，自动恢复无法作为绝对保证。任何被取消的生产 workflow 都必须先核对当前 deployment，再决定是否运行独立回滚 workflow。

官方依据：

- GitHub Actions 集成：https://developers.cloudflare.com/workers/ci-cd/external-cicd/github-actions/
- Versions 与 deployments：https://developers.cloudflare.com/workers/versions-and-deployments/
- Version Override：https://developers.cloudflare.com/workers/versions-and-deployments/version-overrides/
- Wrangler 自动化输出：https://developers.cloudflare.com/workers/wrangler/system-environment-variables/

## 4. D1、KV 与 R2

- 所有 DDL 只通过 `api/db/migrations/`；不得用 `d1 execute` 手工修改生产 schema。
- migration 采用 expand/code/contract：先应用旧代码可接受的增量 schema，再发布使用新 schema 的代码；删除列、表、约束等 contract migration 必须先发布同时兼容旧/新 schema 的 Worker，完成观察并关闭旧版本回滚窗口后再执行。
- contract migration 执行前，必须通过单独 PR 从 allowlist 删除所有旧 UUID，只保留当前同时兼容新旧 schema 的 version；migration 完成后，生产记录保存该 minimum schema-compatible Worker UUID，后续再逐个审核新增版本。
- 已应用迁移（包括 `0000_init.sql`）不可改写；新增迁移、Drizzle schema、journal 和 snapshot 必须同步，CI 运行 `pnpm --filter @gomate/api check:migrations`。
- `api/db/seed.sql` 只用于 local/development，禁止应用到生产。
- 多语句原子写使用 D1 `batch()` 与条件 DML；禁止 `db.transaction()` 和裸 `BEGIN`/`COMMIT`。
- JSON 列在 SQLite 为带 CHECK 的 TEXT，在 Drizzle 使用 `mode: "json"`；业务层传对象/数组。
- R2 对象删除、批量迁移或 bucket 配置变化必须独立列出 key/prefix 与恢复方式；“部署 Worker”不隐含任何 R2 修改授权。
- KV 只承载缓存/限流纵深，不是权限、计费或精确全局计数真相；不得把 session 或原始 PII 放入 KV。

## 5. 回滚与事故处理

1. 生产写路径异常时，优先把同一 Worker 恢复为 `WRITE_MODE=protected`，阻止新的业务写入。
2. 核对 deployment/version、schema compatibility 与 commit 后，先确认目标 UUID 已在 `.github/production-version-allowlist.json`，再从 `main` 手动运行 `.github/workflows/rollback-production.yml`，输入精确 version UUID 和 `ROLLBACK_PRODUCTION`；workflow 先保持当前版本 100%、把目标版本设为 0%，通过 Version Override 验证 API 与 SSR，成功后才提升目标版本。任一后续验证失败或取消时恢复原版本。
3. 旧 Worker、旧 route 和旧 D1 已不存在，不得重建 split deployment 作为回滚。
4. 数据问题使用 D1 Time Travel/备份或经单独批准的新 V2 数据库恢复；不得修改已应用 migration。
5. R2/KV 恢复必须基于本次变更预先记录的对象/namespace 证据，不执行模糊前缀或全 bucket 删除。
6. 任一自动验证、日志证据或人工审批缺失时停止，不用本机命令手工补写。

## 6. 可观测性与隐私

生产 Workers Logs 与 invocation logs 持久化并全量采样；automatic traces 持久化并按 10% head sampling。统一 Worker 的 API 与 Astro SSR 响应都返回 `X-Worker-Version-ID`，API 请求另返回 `X-Request-ID`；`/api/health` body 返回当前 Worker `versionId`，结构化 completion 日志包含稳定的 `event/level/timestamp/requestId/method/route/status/durationMs`。

禁止记录请求/响应 body、headers、cookie、token、secret、原始 email/IP、用户资料或 Error message/stack/cause。Better Auth 默认 logger 必须保持关闭，未处理异常只经过 Hono 的结构化脱敏边界。邮箱验证和密码重置 token 只存在于邮件 URL fragment，页面清除后通过同源 POST body 提交。

发布或回滚后至少验证：

- `/api/health` 为 2xx、`status=ok`，body `versionId` 与响应 `X-Worker-Version-ID` 都等于本次推广或回滚目标；
- SSR 页面为 2xx，且 `X-Worker-Version-ID` 等于同一目标；
- 关键 API 响应有 `X-Request-ID`，Workers Logs 可定位对应 completion；
- 公开 Location 与稳定深圳 Region 可读；
- 日志不包含 smoke 使用的 email/token 或故障注入信息。

当前没有 Cloudflare notification、外部 OTel destination、Sentry/PagerDuty 或自动值班通知。不得把人工阈值描述为已经自动告警。

## 7. 合并与发布门禁

本地至少执行与变更范围匹配的 lint、type-check、test 和 build；生产相关改动还必须执行：

```bash
pnpm check:legacy-removal
pnpm test:delivery
pnpm audit --prod --audit-level high
pnpm --filter @gomate/api check:migrations
pnpm --filter @gomate/frontend worker:types:check
pnpm --filter @gomate/frontend worker:dry-run
pnpm --filter @gomate/frontend worker:startup
pnpm e2e
```

PR 的完整必需检查以 `.github/workflows/pr-validation.yml` 为准。所有检查通过只说明代码可合并，不等于获得生产写入授权。
