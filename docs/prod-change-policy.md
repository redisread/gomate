# GoMate 生产变更规约

本文只描述当前生产拓扑、授权边界和自动发布状态。已完成的一次性迁移、割接与退役过程由 Git 历史保留，不作为现行操作手册继续维护。

## 1. 当前生产拓扑

- 生产域名：`https://gomate.live`
- Worker 服务：`gomate`（唯一生产 Worker）
- 生产 Cron：`0 * * * *`（UTC 每小时），由同一 Worker 的 `scheduled` 入口关闭结束满
  24 小时且未完成/未关闭的队伍，正常运行时关闭延迟小于一小时。`WRITE_MODE` 非 `open`
  时跳过所有定时写入；恢复开放后下一次扫描补处理积压。配置随受保护的 main 流水线发布，
  不通过本机或 Dashboard 手工补写。日志事件为 `team_auto_close_completed`（含 count）、
  `team_auto_close_skipped`、`team_auto_close_failed`；失败抛出供平台记录。
- Worker 入口：`src/worker.ts`
- API：同源 `/api/*`，进程内交给 `src/server/app.ts`
- D1：binding `DB`，目标数据库 `gomate-db-v3`（生产数据库必须由受保护环境按名称绑定；仓库不携带旧数据库 UUID）
- R2：binding `R2`，bucket `gomate`
- Rate Limiting bindings：`AUTH_SIGN_IN_RATE_LIMITER`、`AUTH_SIGN_UP_RATE_LIMITER`、`AUTH_EMAIL_RATE_LIMITER`
- Preview URL：同一 `gomate` Worker 的 version/alias Preview；不创建独立 Worker、D1 或 R2
- 正常生产 `WRITE_MODE` 为 `open`；`protected` 只用于经过审批的事故写保护，不作为常规发布配置。
- Cloudflare Workers Builds 的 Git 连接负责发布授权；运行时 secret（`BETTER_AUTH_SECRET`、`RESEND_API_KEY`）只在受保护 production 环境配置，仓库不保存 Cloudflare 或应用 secret。

旧 split Workers、`api.gomate.live`、旧 KV 和旧 route rollback 已退役；2026-10-17 控制台仍可见 `gomate-db-v2`，不作为当前绑定或回滚目标，也不在本次删除范围内；当前 Worker 未配置 KV 运行时缓存。

仓库根配置是本地开发配置：Worker 名称保持为连接的 `gomate`（满足 Workers Builds
连接校验），但使用本地 D1/R2 状态；
`production` 环境显式绑定线上 Worker、D1、R2 和 route。根配置不再指向任何生产资源，
生产命令必须显式传入 `--env production`。

仓库历史 baseline 为 19 张业务表、13 个触发器；完整本地 contract 迁移后为 11 张核心表，
生产获准前缀现已包含完整 contract 链。稳定 Region ID `region-cn`、`region-cn-guangdong`、
`region-cn-shenzhen` 由参考目录管理。实际生产 migration 状态必须从只读 inventory 验证，
不能由仓库文件推断。阶段区别见[数据库文档](database.md#迁移与发布阶段)。

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

PR 使用仓库内 `pnpm test:ci` 加隔离 D1 的 Chromium 核心流程测试 做可重复质量门禁。Cloudflare Workers Builds 连接 Git 仓库，
`main` 分支执行生产构建和自动发布，所有非 `main` 分支执行远程 Preview 构建；关联 PR 时由
Cloudflare 原生 Git 集成评论 Preview URL。PR 审核与受保护分支仍是正式发布授权边界。
Preview 只上传不可提升的 Worker version，不执行 D1 migration。所有测试、类型检查、bundle
dry-run 和 size gate 都在 PR 完成；Workers Build 只安装锁定依赖、生成 locale 并构建当前分支的
`dist/`，随后按分支执行对应 deploy command。

Workers Builds 的推荐配置为（仓库升级不代表远程 Build variables 已同步，发布前需核对；运行时最低兼容版本仍为 Node 22.23.3）：

1. Build command：`pnpm install --frozen-lockfile && pnpm i18n:build && pnpm build`；该阶段只生成
   当前分支的 artifact，不重复执行 PR 已通过的 `pnpm test:ci`、E2E 或 dry-run；
2. Build variables：`SKIP_DEPENDENCY_INSTALL=1`；启用 build cache。Node 版本由根目录
   `.node-version` 固定，pnpm 版本由 `package.json` 的 `packageManager` 固定；不要新增重复的
   `NODE_VERSION` / `PNPM_VERSION` 覆盖。既有远程变量须先核对是否与仓库一致，删除或调整仍须
   走受保护的平台配置流程；本次仓库变更不代表远端变量已修改。CI 从相同文件读取版本，安装
   依赖前校验实际工具链；Workers Builds 在 `pnpm build` 启动 Astro 前校验，版本不符即停止，
   不进入部署。该检查不保证安装依赖阶段已经使用正确版本。生产依赖审计由 PR CI 执行，
   high/critical 漏洞阻止合并。
   版本选择依据见 [Cloudflare 构建镜像文档](https://developers.cloudflare.com/workers/ci-cd/builds/build-image/#package-manager-versions)：
   `packageManager` 使用精确版本，lockfile 决定依赖安装使用的包管理器。
3. Deploy command：`pnpm deploy:production`。脚本先按 `migrations/production-phases.json`
   校验 migration 名称、顺序、SQL 摘要及启用阶段，再用临时 Wrangler 配置只提供获准的连续前缀。
   migration 成功后才执行 `wrangler deploy --env production`；不能直接对完整目录执行远程 apply；
4. Preview deploy command：`pnpm deploy:preview`。脚本只执行
   `wrangler versions upload --env production --config dist/server/wrangler.json --keep-vars --var WRITE_MODE:protected --preview-alias <alias>`；
   命令使用同一次 Build 生成的 Astro bundle 配置，显式覆盖业务写保护并保留 production `vars` 中的 `PREVIEW_HOST_SUFFIX`，不执行 migration、
   `wrangler deploy` 或 version promotion。alias 由完整分支名稳定生成；
5. Deploy command 依赖同一次 Build 已生成的 `dist/`；migration 失败时不得继续部署，Worker
   发布失败也不得回滚或手工补写数据库；
6. 当前采用单一远程环境策略：`main` 是唯一生产分支，非 `main` Preview 使用
   `--env production` 读取正式 D1/R2；Preview version 的 `WRITE_MODE=protected` 拒绝业务写入，仅在合法
   Preview host 上允许登录/退出所需的认证 session 写入。Preview host 的公开账号后缀通过
   `wrangler.jsonc` 的 production `PREVIEW_HOST_SUFFIX` 固定，配置回归测试防止后续部署丢失；
7. 发布后用 `/api/health`、SSR 页面、注册边界 smoke 和关键只读 API 做 smoke，记录 version ID、migration 结果和
   构建 run URL。任何 smoke 失败都停止后续推广。

## 4. D1、KV 与 R2

- 所有 DDL 只通过 `migrations/`；不得用 `d1 execute` 手工修改生产 schema。
- migration 采用 expand/code/contract：先应用旧代码可接受的增量 schema，再发布使用新 schema 的代码；删除列、表、约束等 contract migration 必须先发布同时兼容旧/新 schema 的 Worker，完成观察并关闭旧版本回滚窗口后再执行。
- contract migration 通过发布阶段清单显式禁用；启用必须由后续受保护提交提供兼容 Worker version/commit、观察开始/结束时间、验证链接与旧版本回滚窗口关闭记录。规划器拒绝缺失证据或 SQL 摘要不一致，不提供环境变量绕过。`0011` 已随证据启用，`0010` 仅增量添加集合信息；清单启用不等于线上已执行，必须核对发布结果及 D1 记录。
- 新 D1 v3 以 `0000_init.sql` 作为 fresh baseline，并由 `0001_reference_data.sql` 写入运行时必需的稳定 Region、Location 和 Tag；`0003_import_v2_catalog.sql` 只增量保留已退役 v2 的 16 个地区和 36 个公开地点，不覆盖 v3 现有目录，也不包含用户数据。已应用 migration 不可改写。后续新增迁移、Drizzle schema、journal 和 snapshot 必须同步，本地运行 `pnpm db:check`。
- 生产 D1 v3 的创建/绑定是独立的受保护基础设施变更；在该资源完成只读核对前，禁止把旧 D1 UUID 填回 `wrangler.jsonc`，也禁止执行远程 migration。
- 测试用户和可变 demo 数据不得进入 migration；测试 fixture 只在隔离的本地数据库创建。
- 多语句原子写使用 D1 `batch()` 与条件 DML；禁止 `db.transaction()` 和裸 `BEGIN`/`COMMIT`。
- JSON 列在 SQLite 为带 CHECK 的 TEXT，在 Drizzle 使用 `mode: "json"`；业务层传对象/数组。
- R2 对象删除、批量迁移或 bucket 配置变化必须独立列出 key/prefix 与恢复方式；“部署 Worker”不隐含任何 R2 修改授权。
- 当前未启用运行时 KV。未来仅按[可靠性与性能设计](../CODING_STANDARDS.md#可靠性与性能设计)评估非敏感、可容忍陈旧的路由元数据副本；新增 KV/Queues 资源仍须满足本文的精确范围授权与受保护发布要求。KV 不得作为 session、权限、计费或精确计数真相，也不得承载共享的用户相关数据。

## 5. 回滚与事故处理

1. 生产写路径异常时，优先把同一 Worker 恢复为 `WRITE_MODE=protected`，阻止新的业务写入。
2. 仓库当前没有受支持的自动回滚入口。事故期间只进行只读核对并暂停进一步写入；任何恢复操作必须等待精确目标、schema 兼容性和数据恢复方案获得单独批准，并通过重建后的受保护流程执行。
3. 旧 Worker、旧 route 已退役；仍可见的旧 D1 不作为回滚目标，不得重建 split deployment 作为回滚。
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
- API 文档、地点和队伍公开读取正常；管理员文档与写入权限边界正确，退役 API 返回 404；
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

### Google OAuth 运行时配置

`gomate` 的 production 运行时还需要 `GOOGLE_CLIENT_ID`、`GOOGLE_CLIENT_SECRET`，值不得进入仓库、日志、PR 或仓库级 Actions secrets。部署继续继承已配置的运行时 secrets；不将 OAuth secret 放入所有分支共享的 Workers Builds 环境变量，也不增加本机生产写入入口。首次配置必须按本规约的精确授权与受保护流程执行。

Google 项目使用 GoMate 网站客户端，授权回调为 `https://gomate.live/api/auth/callback/google`，本地为 `http://localhost:5432/api/auth/callback/google`。仅申请 `openid email profile`。Google 前台的公开首页、隐私政策、服务条款分别为 `https://gomate.live`、`https://gomate.live/privacy`、`https://gomate.live/terms`。Google OAuth 对远程 Preview 保持关闭，无需将共享 Preview 域名加入 Google 客户端。

## Preview 与增量迁移的先后关系

Preview 共用生产 D1，且不执行 migration。首次发布包含 `meeting_point` 的 Worker 前，生产可能尚未应用 `0010`，此时 Preview 的队伍读取可能失败；不能据此宣称核心读取已验收。应在受保护 main 发布完成增量迁移后，验证精确 Worker version 的页面与 API；不增加旧字段兜底，也不在 Preview 或本机执行远程迁移。`0011` 已按迁移清单附带的观察与回滚窗口证据启用。恢复代码必须兼容收缩后的 schema，不能回退到依赖退役表的旧版本。
