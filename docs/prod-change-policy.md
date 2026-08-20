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
- GitHub `production` environment secrets：`CLOUDFLARE_API_TOKEN`、`CLOUDFLARE_ACCOUNT_ID`、`CLOUDFLARE_ZONE_ID`、`BETTER_AUTH_SECRET`、`RESEND_API_KEY`、`PREVIEW_APP_URL`、`PRODUCTION_APP_URL`；受保护部署根据目标 origin 生成 Worker runtime secret `APP_URL`

旧 split Workers、`api.gomate.live`、旧 D1、旧 KV 和旧 route rollback 已删除。`pnpm check:legacy-removal` 阻止这些标识重新进入运行时代码或工作流。

生产 D1 当前基线为 19 张业务表、8 个触发器；稳定 Region ID 包括 `region-cn`、`region-cn-guangdong`、`region-cn-shenzhen`。`region-cn-shenzhen` 还是匿名 local-circle fallback，不得随意改名。

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

仓库不在 push `main` 时自动部署。`.github/workflows/deploy.yml` 是手动、受保护的 preview 流程，固定：

- input `DEPLOY_PREVIEW`、`main` ref、`production` environment；
- `CLOUDFLARE_ENV=production`；
- 构建后的 Worker 无 route，`WRITE_MODE=protected`；
- baseline migration 只对已审核的 `DB` binding 幂等应用；
- secrets 通过临时 `--secrets-file` 与部署一起提交，不使用会提前发布版本的 `wrangler secret put`；
- smoke 验证 health、SSR、`503 WRITE_PROTECTED` 与 `X-Request-ID`；
- 第二个 environment gate 要求审批人在 Workers Logs 核对两个 request ID 和脱敏证据。

当前生产 Worker 已绑定 `gomate.live`，而 preview 流程会要求目标 Worker 无 custom domain/route，因此该流程会失败闭合，不能被视为日常生产 version rollout。建立新的生产发布能力前，必须用独立 PR 设计“构建已审核 version → protected canary/证据 → version promotion/rollback”的受保护流程；不得删除 route audit 或绕过它来复用 preview workflow。

任何新的生产发布流程至少要保留：固定 `main`、`production` environment、`gomate-production-mutation` concurrency、`cancel-in-progress=false`、源代码全量门禁、构建产物/绑定校验、最小 secrets 暴露、structured-log 人工证据与失败闭合。

## 4. D1、KV 与 R2

- 所有 DDL 只通过 `api/db/migrations/`；不得用 `d1 execute` 手工修改生产 schema。
- `0000_init.sql`、Drizzle schema、journal 和 snapshot 必须同步，CI 运行 `pnpm --filter @gomate/api check:migrations`。
- `api/db/seed.sql` 只用于 local/development，禁止应用到生产。
- 多语句原子写使用 D1 `batch()` 与条件 DML；禁止 `db.transaction()` 和裸 `BEGIN`/`COMMIT`。
- JSON 列在 SQLite 为带 CHECK 的 TEXT，在 Drizzle 使用 `mode: "json"`；业务层传对象/数组。
- R2 对象删除、批量迁移或 bucket 配置变化必须独立列出 key/prefix 与恢复方式；“部署 Worker”不隐含任何 R2 修改授权。
- KV 只承载缓存/限流纵深，不是权限、计费或精确全局计数真相；不得把 session 或原始 PII 放入 KV。

## 5. 回滚与事故处理

1. 生产写路径异常时，优先把同一 Worker 恢复为 `WRITE_MODE=protected`，阻止新的业务写入。
2. 核对 deployment/version 与 commit 后，回滚到已验证的 unified Worker version。
3. 旧 Worker、旧 route 和旧 D1 已不存在，不得重建 split deployment 作为回滚。
4. 数据问题使用 D1 Time Travel/备份或经单独批准的新 V2 数据库恢复；不得修改已应用 migration。
5. R2/KV 恢复必须基于本次变更预先记录的对象/namespace 证据，不执行模糊前缀或全 bucket 删除。
6. 任一自动验证、日志证据或人工审批缺失时停止，不用本机命令手工补写。

## 6. 可观测性与隐私

生产 Workers Logs 与 invocation logs 持久化并全量采样；automatic traces 持久化并按 10% head sampling。API 每个请求返回 `X-Request-ID`，结构化 completion 日志包含稳定的 `event/level/timestamp/requestId/method/route/status/durationMs`。

禁止记录请求/响应 body、headers、cookie、token、secret、原始 email/IP、用户资料或 Error message/stack/cause。Better Auth 默认 logger 必须保持关闭，未处理异常只经过 Hono 的结构化脱敏边界。邮箱验证和密码重置 token 只存在于邮件 URL fragment，页面清除后通过同源 POST body 提交。

发布或回滚后至少验证：

- `/api/health` 为 2xx 且 `status=ok`；
- SSR 页面为 2xx；
- 关键 API 响应有 `X-Request-ID`，Workers Logs 可定位对应 completion；
- 写保护阶段 mutation 精确返回 `503 WRITE_PROTECTED`；
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
