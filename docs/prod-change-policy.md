# GoMate 生产变更规约

本文只描述当前生产拓扑、授权边界和自动发布状态。已完成的一次性迁移、割接与退役过程由 Git 历史保留，不作为现行操作手册继续维护。

## 1. 当前生产拓扑

- 生产域名：`https://gomate.live`
- Worker 服务：`gomate`（唯一生产 Worker）
- Worker 入口：`src/worker.ts`
- API：同源 `/api/*`，进程内交给 `src/server/app.ts`
- D1：binding `DB`，目标数据库 `gomate-db-v3`（生产数据库必须由受保护环境按名称绑定；仓库不携带旧数据库 UUID）
- R2：binding `R2`，bucket `gomate`
- Rate Limiting bindings：`AUTH_SIGN_IN_RATE_LIMITER`、`AUTH_SIGN_UP_RATE_LIMITER`、`AUTH_EMAIL_RATE_LIMITER`
- Preview URL：同一 `gomate` Worker 的 version/alias Preview；不创建独立 Worker、D1 或 R2
- 正常生产 `WRITE_MODE` 为 `open`；`protected` 只用于经过审批的事故写保护，不作为常规发布配置。
- Cloudflare Workers Builds 的 Git 连接负责发布授权；运行时 secret（`BETTER_AUTH_SECRET`、`RESEND_API_KEY`）只在受保护 production 环境配置，仓库不保存 Cloudflare 或应用 secret。

旧 split Workers、`api.gomate.live`、旧 D1、旧 KV 和旧 route rollback 已删除；当前 Worker 不引入 KV 运行时缓存。

仓库根配置是本地开发配置：Worker 名称保持为连接的 `gomate`（满足 Workers Builds
连接校验），但使用本地 D1/R2 状态；
`production` 环境显式绑定线上 Worker、D1、R2 和 route。根配置不再指向任何生产资源，
生产命令必须显式传入 `--env production`。

仓库 migration baseline 为 19 张业务表、13 个触发器；seed 与运行时代码依赖稳定
Region ID `region-cn`、`region-cn-guangdong`、`region-cn-shenzhen`。
`region-cn-shenzhen` 还是匿名 local-circle fallback，不得随意改名。生产实际 migration
状态必须从只读 inventory 验证，不能由仓库文件推断。

## 2. 授权边界

以下操作均属于生产写入：创建/删除 Cloudflare 资源、D1 remote migration/execute、KV/R2 写入、secret 写入、Worker 部署、version promotion、route/custom-domain 变更和 `WRITE_MODE` 变更。

生产基础设施写入和每次进入 `main` 的应用变更必须同时满足：

1. 在任务或 PR 中列出精确资源、预期状态、影响面、验证和回滚方式；
2. 基础设施变更获得用户对本次精确范围的显式批准；应用发布则以已审核 PR 合并到受保护的 `main` 作为发布批准；
3. Worker 部署与 D1 migration 从 `main` 通过 Cloudflare Workers Builds 执行；
4. 不使用 admin bypass；
5. secrets 只在需要它的步骤暴露，且不得写入日志、artifact、PR、命令参数或仓库级 Actions secrets；
6. 执行后保存 run URL、head SHA、资源/version 结果与只读验证证据。

禁止在开发机直接运行生产 Cloudflare 写命令。只读 inventory/health 检查可以在任务范围内执行，但不得据此扩大写入权限。

仓库提供 `pnpm deploy:production` 作为 Cloudflare Workers Builds 的生产部署入口；该命令只能由
`main` 分支的 Workers Build 调用。GitHub Actions 只在目标为 `main` 的 PR 上执行只读质量
检查，不监听 `push main`，不配置生产 Cloudflare 或应用 secrets，也不提供本机生产写入路径。
合并到 `main` 后不再等待第二次人工确认。

## 3. 发布能力

PR 使用仓库内 `pnpm test:ci` 加隔离 D1 的 6 条 Chromium E2E 做可重复质量门禁。Cloudflare Workers Builds 连接 Git 仓库，
`main` 分支执行生产构建和自动发布，所有非 `main` 分支执行远程 Preview 构建；关联 PR 时由
Cloudflare 原生 Git 集成评论 Preview URL。PR 审核与受保护分支仍是正式发布授权边界。
Preview 只上传不可提升的 Worker version，不执行 D1 migration。所有测试、类型检查、bundle
dry-run 和 size gate 都在 PR 完成；Workers Build 只安装锁定依赖、生成 locale 并构建当前分支的
`dist/`，随后按分支执行对应 deploy command。

Workers Builds 的推荐配置为：

1. Build command：`pnpm install --frozen-lockfile && pnpm i18n:build && pnpm build`；该阶段只生成
   当前分支的 artifact，不重复执行 PR 已通过的 `pnpm test:ci`、E2E 或 dry-run；
2. Build variables：`NODE_VERSION=22.13.0`、`PNPM_VERSION=11.19.0`、
   `SKIP_DEPENDENCY_INSTALL=1`；启用 build cache。仓库同时通过 `.node-version` 和
   `packageManager` 固定本地与 CI 工具链；
3. Deploy command：`pnpm deploy:production`。脚本先执行
   `wrangler d1 migrations apply DB --remote --env production --config wrangler.jsonc`，只有
   migration 成功后才执行 `wrangler deploy --env production`；
4. Preview deploy command：`pnpm deploy:preview`。脚本只执行
   `wrangler versions upload --env production --config wrangler.jsonc --preview-alias <alias>`；
   不执行 migration、`wrangler deploy` 或 version promotion。alias 由完整分支名稳定生成；
5. Deploy command 依赖同一次 Build 已生成的 `dist/`；migration 失败时不得继续部署，Worker
   发布失败也不得回滚或手工补写数据库；
6. 当前采用单一远程环境策略：`main` 是唯一生产分支，非 `main` Preview 使用
   `--env production` 读取正式 D1/R2；生产 `WRITE_MODE=protected` 拒绝业务写入，仅在合法
   Preview host 上允许登录/退出所需的认证 session 写入。Preview host 后缀通过受保护环境变量
   `PREVIEW_HOST_SUFFIX` 配置为当前账号的 `<account-subdomain>.workers.dev`，不得提交到仓库；
7. 发布后用 `/api/health`、SSR 页面、注册边界 smoke 和关键只读 API 做 smoke，记录 version ID、migration 结果和
   构建 run URL。任何 smoke 失败都停止后续推广。

## 4. D1、KV 与 R2

- 所有 DDL 只通过 `migrations/`；不得用 `d1 execute` 手工修改生产 schema。
- migration 采用 expand/code/contract：先应用旧代码可接受的增量 schema，再发布使用新 schema 的代码；删除列、表、约束等 contract migration 必须先发布同时兼容旧/新 schema 的 Worker，完成观察并关闭旧版本回滚窗口后再执行。
- contract migration 必须等待新的受保护流水线落地，并在执行前证明当前 Worker 同时兼容新旧 schema、关闭不兼容版本的回滚入口。
- 新 D1 v3 以 `0000_init.sql` 作为 fresh baseline，并由 `0001_reference_data.sql` 写入运行时必需的稳定 Region、Location 和 Tag；`0003_import_v2_catalog.sql` 只增量保留已退役 v2 的 16 个地区和 36 个公开地点，不覆盖 v3 现有目录，也不包含用户数据。已应用 migration 不可改写。后续新增迁移、Drizzle schema、journal 和 snapshot 必须同步，本地运行 `pnpm db:check`。
- 生产 D1 v3 的创建/绑定是独立的受保护基础设施变更；在该资源完成只读核对前，禁止把旧 D1 UUID 填回 `wrangler.jsonc`，也禁止执行远程 migration。
- 测试用户和可变 demo 数据不得进入 migration；测试 fixture 只在隔离的本地数据库创建。
- 多语句原子写使用 D1 `batch()` 与条件 DML；禁止 `db.transaction()` 和裸 `BEGIN`/`COMMIT`。
- JSON 列在 SQLite 为带 CHECK 的 TEXT，在 Drizzle 使用 `mode: "json"`；业务层传对象/数组。
- R2 对象删除、批量迁移或 bucket 配置变化必须独立列出 key/prefix 与恢复方式；“部署 Worker”不隐含任何 R2 修改授权。
- 不使用 KV 作为运行时缓存、session、权限、计费或精确计数真相；不得重新引入共享边缘缓存来承载用户相关数据。

## 5. 回滚与事故处理

1. 生产写路径异常时，优先把同一 Worker 恢复为 `WRITE_MODE=protected`，阻止新的业务写入。
2. 仓库当前没有受支持的自动回滚入口。事故期间只进行只读核对并暂停进一步写入；任何恢复操作必须等待精确目标、schema 兼容性和数据恢复方案获得单独批准，并通过重建后的受保护流程执行。
3. 旧 Worker、旧 route 和旧 D1 已不存在，不得重建 split deployment 作为回滚。
4. 数据问题使用 D1 Time Travel/备份或经单独批准的新 v3 数据库恢复；不得修改已应用 migration。
5. R2/KV 恢复必须基于本次变更预先记录的对象/namespace 证据，不执行模糊前缀或全 bucket 删除。
6. 任一自动验证、日志证据或人工审批缺失时停止，不用本机命令手工补写。

Preview 事故先在 Workers Builds 中关闭非生产分支 Preview 或恢复 Preview deploy command；正式
Worker 继续按受保护版本流程回滚。Preview 不执行 migration，且业务写入被拦截，因此不需要
回滚 D1 schema；认证 session 写入仍属于共享生产认证数据，需按认证数据保留策略处理。

## 6. 可观测性与隐私

生产 Workers Logs 与 invocation logs 持久化并全量采样；automatic traces 持久化并按 10% head sampling。统一 Worker 的 API 与 Astro SSR 响应都返回 `X-Worker-Version-ID`，API 请求另返回 `X-Request-ID`；`/api/health` body 返回当前 Worker `versionId`，结构化 completion 日志包含稳定的 `event/level/timestamp/requestId/method/route/status/durationMs`。

禁止记录请求/响应 body、headers、cookie、token、secret、原始 email/IP、用户资料或 Error message/stack/cause。Better Auth 默认 logger 必须保持关闭，未处理异常只经过 Hono 的结构化脱敏边界。邮箱验证和密码重置 token 只存在于邮件 URL fragment，页面清除后通过同源 POST body 提交。

发布或回滚后至少验证：

- `/api/health` 为 2xx、`status=ok`，body `versionId` 与响应 `X-Worker-Version-ID` 都等于本次推广或回滚目标；
- 正常生产 `/api/health` 的 `writeMode` 必须为 `open`；事故保护发布必须明确记录为 `protected`；
- SSR 页面为 2xx，且 `X-Worker-Version-ID` 等于同一目标；
- 关键 API 响应有 `X-Request-ID`，Workers Logs 可定位对应 completion；
- 公开 Location 与稳定深圳 Region 可读；
- 公开海报只渲染地点/队伍/故事的公开内容和通用创建者标签，不把用户姓名、头像或用户 ID
  带入共享边缘缓存；
- 日志不包含 smoke 使用的 email/token 或故障注入信息。

仓库未声明 Cloudflare notification、外部 OTel destination、Sentry/PagerDuty 或自动值班通知。
账号侧实际配置需要单独只读验证；不得把仓库缺省值或人工阈值描述为生产告警现状。

## 7. 合并与发布门禁

本地至少执行与变更范围匹配的 lint、type-check、test 和 build；生产相关改动还必须执行：

```bash
pnpm test:ci
pnpm audit --prod --audit-level high
pnpm worker:types
pnpm worker:dry-run
pnpm worker:size
pnpm test:e2e:ci
```

GitHub PR CI 会在 `pnpm test:ci`、Worker types/dry-run/size 通过后初始化 runner 临时 D1，
再自动执行 `pnpm test:e2e:ci`；该流程不持有 Cloudflare 生产凭据，也不访问远程 D1/R2。
本地检查必须记录实际完成的验证和未执行项。检查通过只说明代码具备合并条件，不等于获得生产写入授权。
