# GoMate 单 Worker / D1 V2 生产变更规约

> 2026-08-16 起适用。当前没有真实用户；认证和活动数据不迁移，但切流后按单独批准将旧库
> 36 条公开地点转换为 V2 Region/Location 数据。

## 1. 当前发布边界

- `frontend/src/worker.ts` 是唯一 Worker 入口。
- 页面和 API 同源；API 只存在于 `https://<origin>/api/*`。
- D1 使用全新 `gomate-db-v2`，唯一 baseline 为
  `api/db/migrations/0000_init.sql`。
- 旧 `gomate-api`、`gomate-frontend`、旧 D1、旧定时任务均不在新发布链路中。
- 合并本重构 PR 不等于上线：不得自动创建资源、迁移远端数据库或切换
  `gomate.live` route。

## 2. 生产写入授权

任何 Cloudflare 资源创建、D1 远程 migration/execute、secret 写入、Worker 部署或
route 切换，都必须：

1. 在任务或 PR 中列出精确目标、影响面与回滚方式；
2. 获得 Victor 的显式批准；
3. 通过 GitHub `production` protected environment；
4. Astro/Vite 构建通过 job 级 `CLOUDFLARE_ENV=production` 固定环境，构建后由
   Wrangler 自动读取 `dist/server/wrangler.json`；仅 D1、类型生成等直接读取源
   Wrangler 配置的命令显式使用 `--env production`，禁止依赖默认环境。阶段 A 的 KV
   namespace 创建是唯一例外：工作流仍固定 `CLOUDFLARE_ENV=production`，但不得传
   `--env production`，否则 Wrangler 会把环境前缀加入经审查的精确 namespace 名称；
5. 完成后记录资源 ID、Worker version 与验证证据。

## 3. 两阶段发布

### 阶段 A：绑定 PR

1. 先创建 GitHub `production` protected environment：deployment branch policy 仅允许
   `main`，至少配置一名 required reviewer，并把 Cloudflare token/account/zone、Better Auth
   secret、Resend key 与精确 preview workers.dev origin 六项全部保存为 environment secrets；
   不得继续依赖 repository secrets 作为生产发布凭据。
2. 只能从 `main` 手动运行 `Provision unified Worker V2 bindings`，输入
   `PROVISION_BINDINGS`，在 `production` environment 审批后创建 D1 `gomate-db-v2`
   （APAC location hint）与 KV `gomate-cache-v2`。工作流必须先确认两个精确名称均不存在，
   且不得迁移 D1、部署 Worker、修改 secret/R2/route/domain；若只成功创建一个资源，保留它并
   停止，禁止自动删除，后续清理仍需另一次显式批准。
3. R2 复用 `gomate`：阶段 A 只记录账号、APAC location 与公开域名的只读证据，不写入或
   删除对象。
4. 使用 Wrangler `--update-config` 写入资源 ID，或只手工修改
   `frontend/wrangler.jsonc` 中的 `REPLACE_IN_BINDINGS_PR`。
5. 以单独 PR 审查精确 ID；该 PR 不加入生产 route，也不执行 migration/deploy。

占位符存在时，`.github/workflows/deploy.yml` 必须 fail closed。

### 阶段 B：受保护 preview

1. 手动运行 `Deploy unified Worker preview`，输入 `DEPLOY_PREVIEW`。
2. 在任何远程写入前，流水线校验 main ref、资源 ID、精确 preview origin，且通过
   Cloudflare API 确认 `gomate-production-preview` 没有 custom domain，且未绑定到该
   账号任一可见 zone route；审计 token 必须具备账号内 Zone Read / Workers Routes
   Read，任一 zone 查询失败也必须停止。
3. 流水线用 `--env production --remote` 对新 D1 应用 baseline。
4. secrets 通过临时 `--secrets-file` 与代码一次部署，不运行会提前发布版本的
   `wrangler secret put`。
5. 部署 `gomate-production-preview`，保持 `WRITE_MODE=protected` 且不挂生产域名。
6. 执行 `/api/health`、SSR 页面读取烟测，并用一个认证 mutation 断言
   `503 + WRITE_PROTECTED`；请求必须在进入 Better Auth 前被拦截，不能写 D1。
   Worker 部署完成后，health/SSR 共用约 2 分钟的 readiness deadline；只对尚未出现应用
   `X-Request-ID` 的 workers.dev 传播期 `404/523` 与网络失败重试，每次请求不得超过剩余预算。
   一旦收到其他状态、成功状态但内容类型错误，或认证 mutation 不是精确的
   `503 + WRITE_PROTECTED`，必须立即失败，禁止用重试掩盖实现错误。
7. smoke 输出 health 与 protected-mutation 两个 `X-Request-ID`；随后第二个 `production`
   protected-environment job 必须由审批人在 Workers Logs 完成人工证据检查后放行。未审批时
   整个部署工作流保持未完成。

`api/db/seed.sql` 明确只用于 development/local replay，禁止由 preview workflow 或人工命令
直接应用到远程 D1：其中示例 Location 的媒体 URL 不是生产资产。baseline 只建结构，因此在
阶段 C 前必须通过另一个受审查的数据 PR 和一次独立 production approval 完成最小 Region
bootstrap。该变更只能写入已复核的国家/省/city Region 行，不得顺带创建用户、地点或标签；
首发必须沿用稳定 ID `region-cn`、`region-cn-guangdong`、`region-cn-shenzhen`，其中
`region-cn-shenzhen` 是匿名 local-circle 的运行时 fallback，禁止在数据 PR 中另行改名。
执行前记录 SQL 文件 checksum 与这些精确 Region ID，执行后验证 `level=city`、
`service_enabled=1`、IANA timezone 和地图中心坐标，并保存 D1 查询证据。若验证失败，在尚无
业务引用时只按该清单中的精确 Region ID 回滚；不得运行 development seed 作为快捷方案。
生产 bootstrap 只能从 `main` 手动运行 `Bootstrap production V2 Regions`，输入
`BOOTSTRAP_REGIONS` 并通过 `production` environment 审批。工作流在写入前要求全部 18 个
非 Region 业务表与 Region 表均为空，只执行 `api/db/bootstrap/regions-v1.sql`，并把 checksum、
精确三行查询和业务行计数保存为 90 天 artifact。`regions-v1.rollback.sql` 只作为经再次审批的
紧急回滚输入，禁止由 bootstrap 失败自动执行。

### 阶段 C：route 切换

route 变更必须是 preview 验证后的独立、受保护操作。切换前将 `APP_URL` 更新为
`https://gomate.live`；切换后再把 `WRITE_MODE` 改为 `open`。这两项不得随首次
preview 部署自动发生。

从 `main` 手动运行 `Cut over unified Worker production` 并输入 `CUTOVER_PRODUCTION`。
流水线先证明 `gomate.live` 只属于已审核的旧 `gomate-frontend` 或新
`gomate-production-preview`；阶段 C 成功后不再接受曾用于恢复错误双重环境选择的
临时 Worker。然后使用 environment secret
`PRODUCTION_APP_URL=https://gomate.live` 将同一 unified Worker 以 `WRITE_MODE=protected`
挂为 custom domain。部署后的 custom-domain inventory 断言共用 120 秒有界传播窗口；窗口结束仍
不属于新 Worker 时失败闭合。受保护读/SSR/写阻断与 Workers Logs 证据通过后，连续 30 分钟只读观察；
第二次 production approval 后才部署 `WRITE_MODE=open`，执行一次可清理的注册、邮箱确认、
登录、session、资料写入、退出 canary，随后按精确 canary email 删除测试账号并证明计数为 0。
开放写入的日志证据审批后再连续观察 30 分钟。任一阶段失败都停止后续 job。

回滚只允许从 `main` 手动运行 `Roll back unified Worker production cutover` 并输入
`ROLLBACK_PRODUCTION`：先把 unified Worker 恢复为 `WRITE_MODE=protected`，确认 503 写阻断，
再通过 Cloudflare Workers custom-domain API 把 `gomate.live` 精确重新附加到
`gomate-frontend`。回滚不删除 V2 D1、KV、R2、Worker、版本或 secrets。

### 阶段 C.1：旧地点数据一次性导入

阶段 C 切流后、阶段 D 删除旧 D1 前，从 `main` 手动运行
`Migrate production V2 Locations` 并输入 `MIGRATE_LEGACY_LOCATIONS`，通过
`production` environment 审批。该工作流只读旧 D1 固定 UUID
`7d17d076-202f-48f8-b343-24209cdb0ba1`，要求旧地点查询恰好返回 36 行且规范化快照
SHA-256 为 `7685b4d2424271c2d5fc7bd871c8e25e20dbecd9a336477a4b16552b45662677`；任一字段
变化都必须在写入前失败闭合。

转换只新增 5 个省级 Region、11 个非深圳 city Region 和 36 个 published Location，保留旧地点
ID、名称、slug、描述、坐标、HTTPS 媒体 URL 与时间戳；活动类型转为
`supported_activity_types`，徒步字段转为 V2 `extra.hiking` snake_case。旧库没有任何地点标签关联，
因此不得从未关联的旧标签词典伪造 `location_tags`。目标写入前必须证明新库仍只有首发三条
Region 且 `locations=0`；写入后必须逐字段比对 36 条 V2 projection、16 条新增 Region，并通过
`/api/locations?limit=100` 证明全部公开可读。工作流不得修改用户、队伍、故事、标签、Worker、
route、domain、KV、R2、secret 或 migration ledger；精确 rollback SQL 只作为 90 天 artifact
保存，不自动执行。

### 阶段 D：旧资源退役

阶段 C 于 2026-08-16T18:53:01Z 完成；旧资源最早只能在
2026-08-23T18:53:01Z 后退役。从 `main` 手动运行
`Retire legacy Cloudflare resources` 并输入 `RETIRE_LEGACY_RESOURCES`，且必须通过
`production` environment 审批。流水线先证明 `gomate.live` 精确属于
`gomate-production-preview`，并核对新 D1/KV 与共享 R2；随后只删除：

- `api.gomate.live` custom domain；
- Workers `gomate-api`、`gomate-frontend`、`gomate-production-preview-production`；
- D1 `gomate-db`（`7d17d076-202f-48f8-b343-24209cdb0ba1`）；
- KV `GOMATE_KV`（`638ecd78e70c48fda01904bc9c2105d8`）和
  `gomate-frontend-session`（`6e3db6b00bc4421faeb1402c2e51f7d1`）。

脚本不得调用 R2 删除 API；执行后重新读取 Cloudflare inventory，并验证生产 Worker、
`gomate-db-v2`、`gomate-cache-v2`、R2 `gomate`、health 和深圳 Region。任一名称、ID、域名归属、
时间边界、36 条地点迁移结果或生产资源不匹配时，在首个 DELETE 前失败闭合。流水线可安全重跑：
已经删除的精确旧资源视为完成，但新资源缺失仍立即失败。

## 4. 回滚

- 应用回滚：核实 Worker deployment/version 对应的 commit 后，回滚到已验证版本。
- route 回滚：将 `gomate.live` 恢复到旧 Worker；不要删除新资源。
- 数据回滚：地点导入前由 workflow 生成精确 rollback SQL 并保存 90 天；该 SQL 仍需单独批准，
  且只能在没有新 Team/Story 引用迁入地点时执行。出现 schema 或写入问题时先把
  `WRITE_MODE` 恢复为 `protected`，再从 D1 Time Travel/备份恢复或创建新的 V2
  数据库；不得修改已应用的 migration 文件。
- secrets 与资源只有在稳定观察期结束后才能清理，清理需再次显式批准。

## 5. D1 硬约束

- 所有 DDL 只通过 migration；禁止用 `d1 execute` 手工执行 DDL。
- `0000_init.sql` 与 journal/snapshot/schema 必须同步，CI 运行
  `pnpm --filter @gomate/api check:migrations`。
- 多步原子写入使用 D1 `batch()`；禁止 `db.transaction()` 或裸
  `BEGIN`/`COMMIT`。
- JSON 列在 SQLite 中为 TEXT + CHECK，在 Drizzle 中使用 `mode: "json"`；业务层
  只传对象/数组，不保留旧 JSON 字符串兼容。
- 未经明确需求不得把 session 放入 KV。登录、注册与认证邮件的主要滥用保护使用
  Wrangler 中受审查的三个 Cloudflare Rate Limiting binding；key 对 email/来源与用途
  做 SHA-256，不传原始 PII。Better Auth 的私有 KV 计数仅作为带 TTL 的纵深防御，
  value 只保存 count 与时间。两层保护均不是权限、计费或精确全局计数真相。

## 6. 本地与 CI 验证

合并前至少执行：

```bash
pnpm check:legacy-removal
pnpm test:delivery
pnpm audit --prod --audit-level high
pnpm --filter @gomate/api check:migrations
pnpm --filter @gomate/api lint
pnpm --filter @gomate/api type-check
pnpm --filter @gomate/api build
pnpm --filter @gomate/api test
pnpm i18n:build
pnpm --filter @gomate/frontend i18n:validate
pnpm --filter @gomate/frontend worker:types:check
pnpm --filter @gomate/frontend lint
pnpm --filter @gomate/frontend type-check
pnpm --filter @gomate/frontend test
pnpm --filter @gomate/frontend build
pnpm --filter @gomate/frontend worker:dry-run
pnpm --filter @gomate/frontend worker:startup
pnpm e2e
```

## 7. 可观测性与首发值守

统一 Worker 使用 Cloudflare 原生 Workers Logs 与 automatic traces。生产配置固定为：

- logs、invocation logs 与 dashboard persistence 显式开启，首发阶段
  `head_sampling_rate=1`；当前没有真实用户，优先保留完整首发证据，产生稳定流量后再以
  独立 PR 按实际用量调低。
- traces 显式开启并持久化，`head_sampling_rate=0.1`。traces 是 head-based sampling，
  因此不能假定每个 smoke request 都有 trace。
- API 自定义日志是单个结构化对象，固定包含 `event/level/timestamp`；API 请求边界还包含
  `requestId/method/route/status/durationMs`。`requestId` 使用已校验的 `CF-Ray + UUID`，
  无合法 CF-Ray 时只使用 UUID，并通过响应 `X-Request-ID` 返回。
- Better Auth 的默认 logger 明确关闭，`onAPIError.throw=true` 使未处理 adapter/API 异常只经过
  Hono 的结构化脱敏边界；禁止恢复会输出 SQL、params 或原始 Error 的第三方默认日志。
- 密码重置由 GoMate 自有 latest-only challenge command 承担：每用户唯一 D1 记录只保存
  domain-separated SHA-256 摘要，签发/邮件完全位于 `waitUntil`；重置在单个 D1 batch 中
  claim challenge、更新唯一 credential、撤销全部 session 并消费 challenge。禁止恢复 Better
  Auth 原生 request/reset URL 或把 raw token 存入 D1。
- 日志只允许预定义的运行维度；不得记录请求/响应 body、headers、cookie、token、secret、
  原始 email/IP、用户资料或 Error message/stack/cause。Error 只保留安全归一化的类型及受限
  code。
- 邮箱验证和密码重置 bearer token 只存在于邮件链接 fragment，页面读取后立即清除，并以
  同源 POST body 提交；禁止恢复 Better Auth 带 token 的公开 GET URL，否则 invocation URL
  与 automatic span 会把 token 写入持久化遥测。

官方依据：
[Workers Logs 的结构化对象与采样](https://developers.cloudflare.com/workers/observability/logs/workers-logs/)、
[Workers automatic traces 与独立采样](https://developers.cloudflare.com/workers/observability/traces/)、
[Workers AsyncLocalStorage 异步上下文传播](https://developers.cloudflare.com/workers/runtime-apis/nodejs/asynclocalstorage/)。

### 7.1 On-call 必须能回答的问题

1. 哪个 API route/method/status 组合的错误率上升，持续了多久？
2. 哪些 route 的 `durationMs` p95/p99 退化，trace 将时间消耗定位到哪里？
3. 用户提供 `X-Request-ID` 后，能否定位同一请求的 completion、应用错误与 Cloudflare
   invocation/trace？
4. 503 是预期的 `WRITE_MODE=protected`，还是非预期的服务异常？

在 Cloudflare Worker 的 Observability Query Builder 中，首选过滤/分组维度为
`event`、`level`、`requestId`、`method`、`route`、`status`、`durationMs`、`error.type` 与
`errorType`；不要按原始 URL、query、用户 ID 或错误文本聚合。

### 7.2 首发观察与回滚阈值

1. preview smoke 必须检查 health 与受保护 mutation 响应的 `X-Request-ID`。部署工作流随后
   进入第二次 `production` protected-environment 人工审批；审批人必须在 Workers Logs 以两个
   ID 找到 `api_request_completed`，并确认日志不含 smoke body 中的 canary email/token。
   `app-runtime.test.ts` 在 CI 中通过注入安全 500 验证 Error 仅保留归一化 type/code，且不记录
   message、body 或 secret。任一自动证据缺失、人工审批未完成或字段退化为拼接字符串时，
   工作流保持未完成且不得进入后续 production routing/解除写保护流程。
2. `WRITE_MODE=protected` 的首个 30 分钟只观察 read/SSR：若 `/api/health` 连续 3 次
   非 2xx，或 API 5xx（排除预期 write-protection 503）在至少 100 个请求的滚动 5 分钟窗口
   超过 1%，保持写保护并回滚 Worker version/route。
3. 同一窗口内任一关键 read route 的 `durationMs` p95 连续 5 分钟超过 2 秒，或出现持续
   `api_unhandled_error`，停止切流并回滚；先按 `requestId` 检查 trace/log，再决定前滚。
4. 解除写保护后的 30 分钟 canary 中，auth 或关键 mutation 的非预期 5xx 超过 1%，立即把
   `WRITE_MODE` 恢复为 `protected`。如果已产生公开写入，按第 4 节的数据回滚规则保留 V2
   数据并进行事故决策，不自动切回旧 D1。

这些是首发人工值守阈值。本 PR **没有**创建 Cloudflare notification、外部 OTel destination、
Sentry/PagerDuty 告警或值班通知渠道；在真实流量和基线出现前不得把上述阈值描述为已自动告警。
