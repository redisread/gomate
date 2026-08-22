# GoMate 生产变更规约

本文只描述当前生产拓扑、授权边界和生产写入冻结状态。已完成的一次性迁移、割接与退役过程由 Git 历史保留，不作为现行操作手册继续维护。

## 1. 当前生产拓扑

- 生产域名：`https://gomate.live`
- Worker 服务：`gomate`（唯一生产 Worker）
- Worker 入口：`frontend/src/worker.ts`
- API：同源 `/api/*`，进程内交给 `api/src/app.ts`
- D1：binding `DB`，`gomate-db-v2`，UUID `befa3d89-6551-4a25-8a1c-670efe62a315`
- KV：binding `CACHE_KV`，`gomate-cache-v2`，ID `f9904d1fa72140c18067e07d541ca92b`
- R2：binding `R2`，bucket `gomate`
- Rate Limiting bindings：`AUTH_SIGN_IN_RATE_LIMITER`、`AUTH_SIGN_UP_RATE_LIMITER`、`AUTH_EMAIL_RATE_LIMITER`
- GitHub `production` environment secrets：`CLOUDFLARE_API_TOKEN`、`CLOUDFLARE_ACCOUNT_ID`、`CLOUDFLARE_ZONE_ID`、`BETTER_AUTH_SECRET`、`RESEND_API_KEY`、`PRODUCTION_APP_URL`；受保护部署根据生产 origin 生成 Worker runtime secret `APP_URL`

旧 split Workers、`api.gomate.live`、旧 D1、旧 KV 和旧 route rollback 已删除。`pnpm check:legacy-removal` 阻止这些标识重新进入运行时代码或工作流。

仓库 migration 链的目标结构为 19 张业务表、13 个触发器；seed 与运行时代码依赖稳定
Region ID `region-cn`、`region-cn-guangdong`、`region-cn-shenzhen`。
`region-cn-shenzhen` 还是匿名 local-circle fallback，不得随意改名。生产实际 migration
状态必须从只读 inventory 验证，不能由仓库文件推断。

## 2. 授权边界

以下操作均属于生产写入：创建/删除 Cloudflare 资源、D1 remote migration/execute、KV/R2 写入、secret 写入、Worker 部署、version promotion、route/custom-domain 变更和 `WRITE_MODE` 变更。

每次生产写入必须同时满足：

1. 在任务或 PR 中列出精确资源、预期状态、影响面、验证和回滚方式；
2. 获得用户对本次精确范围的显式批准；
3. 从 `main` 通过经过审核的受保护流水线执行；
4. 使用正常的生产环境审核，不使用 admin bypass；
5. secrets 只在需要它的步骤暴露，且不得写入日志、artifact、PR、命令参数或仓库级 Actions secrets；
6. 执行后保存 run URL、head SHA、资源/version 结果与只读验证证据。

禁止在开发机直接运行生产 Cloudflare 写命令。只读 inventory/health 检查可以在任务范围内执行，但不得据此扩大写入权限。

当前仓库不包含满足上述条件的 CI/CD 或生产发布入口，因此所有生产写入保持冻结，直到新流水线经过代码审查、验证并正式落地。

## 3. 当前发布能力

仓库当前没有 GitHub Actions workflow、自动 CI、Worker 发布、D1 migration 或 Worker rollback 流水线。合并或 push `main` 不会触发部署，也没有受支持的仓库内生产写入命令。

流水线重构至少必须重新建立：变更验证、生产配置核对、migration 兼容性判断、不可变 Worker version、候选冒烟、受保护推广、发布后观察、失败恢复、证据留存和独立回滚。在这些能力全部经过测试和审核前，不得通过 Dashboard、本机 Wrangler 或一次性脚本绕过冻结状态。

## 4. D1、KV 与 R2

- 所有 DDL 只通过 `api/db/migrations/`；不得用 `d1 execute` 手工修改生产 schema。
- migration 采用 expand/code/contract：先应用旧代码可接受的增量 schema，再发布使用新 schema 的代码；删除列、表、约束等 contract migration 必须先发布同时兼容旧/新 schema 的 Worker，完成观察并关闭旧版本回滚窗口后再执行。
- contract migration 必须等待新的受保护流水线落地，并在执行前证明当前 Worker 同时兼容新旧 schema、关闭不兼容版本的回滚入口。
- 已应用迁移（包括 `0000_init.sql`）不可改写；新增迁移、Drizzle schema、journal 和 snapshot 必须同步，本地运行 `pnpm --filter @gomate/api check:migrations`。
- `api/db/seed.sql` 只用于 local/development，禁止应用到生产。
- 多语句原子写使用 D1 `batch()` 与条件 DML；禁止 `db.transaction()` 和裸 `BEGIN`/`COMMIT`。
- JSON 列在 SQLite 为带 CHECK 的 TEXT，在 Drizzle 使用 `mode: "json"`；业务层传对象/数组。
- R2 对象删除、批量迁移或 bucket 配置变化必须独立列出 key/prefix 与恢复方式；“部署 Worker”不隐含任何 R2 修改授权。
- KV 只承载缓存/限流纵深，不是权限、计费或精确全局计数真相；不得把 session 或原始 PII 放入 KV。

## 5. 回滚与事故处理

1. 生产写路径异常时，优先把同一 Worker 恢复为 `WRITE_MODE=protected`，阻止新的业务写入。
2. 仓库当前没有受支持的自动回滚入口。事故期间只进行只读核对并暂停进一步写入；任何恢复操作必须等待精确目标、schema 兼容性和数据恢复方案获得单独批准，并通过重建后的受保护流程执行。
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

仓库未声明 Cloudflare notification、外部 OTel destination、Sentry/PagerDuty 或自动值班通知。
账号侧实际配置需要单独只读验证；不得把仓库缺省值或人工阈值描述为生产告警现状。

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

仓库当前没有远程 CI；PR 必须记录实际完成的本地验证和未执行项。本地检查通过只说明代码具备合并条件，不等于获得生产写入授权。
