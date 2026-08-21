# GoMate 项目规则

本文件是仓库级代理规则的唯一维护入口。`CLAUDE.md` 只引用本文件；不要在其他规则文件复制同一套约束。

## 事实来源与文档边界

发生冲突时按以下顺序判断：可执行代码/配置/迁移与测试 → 本文件 → `docs/` 现行文档 → README。历史方案和已完成执行计划不留在工作树中，必要时从 Git 历史查阅。

| 主题                   | 现行来源                                                     |
| ---------------------- | ------------------------------------------------------------ |
| 项目启动、常用命令     | [`README.md`](README.md)                                     |
| API 合同               | [`docs/backend-api.md`](docs/backend-api.md)                 |
| 数据库关系、决策与约束 | [`docs/database.md`](docs/database.md)                       |
| 页面与前端运行时       | [`docs/frontend-pages.md`](docs/frontend-pages.md)           |
| 设计系统               | [`docs/design-system.md`](docs/design-system.md)             |
| 本地多 worktree 开发   | [`docs/local-dev-worktrees.md`](docs/local-dev-worktrees.md) |
| 生产变更与回滚         | [`docs/prod-change-policy.md`](docs/prod-change-policy.md)   |

设计或行为变化必须在同一 PR 更新对应现行文档。不要新增一次性执行计划、已上线功能 spec 或重复的“最终方案”文档；需要长期保留的架构决策应写入对应 `docs/` 文档的决策/约束段。

## 当前架构

- 唯一 Worker 入口是 `frontend/src/worker.ts`：`/api/*` 进程内交给 `api/src/app.ts`，其余请求交给 Astro Cloudflare handler。
- 页面、SSR、认证 Cookie 和 API 同源；浏览器 API 固定使用 `/api/*`，不引入独立 API origin、CORS 或前后端双进程。
- 前端入口位于 `frontend/src/pages/`，交互组件位于 `frontend/src/components/`，共享客户端调用位于 `frontend/src/lib/`。
- API 路由位于 `api/src/routes/`，通用能力位于 `api/src/lib/`，Drizzle schema 位于 `api/src/db/schema.ts`。
- 跨包公开类型放在 `packages/types`；不要在前后端各自维护同一 DTO 的兼容副本。
- 生产域名是 `https://gomate.live`，当前 Cloudflare Worker 服务名为 `gomate`。

## 工作方式

- 每次会话先完整读取 `.codex/skills/using-agent-skills/SKILL.md`，再按任务加载最少的适用技能。
- 修改前检查 `git status` 和现有实现；用户或其他 worktree 的改动不得被顺手回滚、覆盖或格式化。
- 使用 Node `>=22.12.0` 与 pnpm；不要用 npm、Yarn 等其他包管理器刷新 lockfile。
- 多 worktree 首次运行 `pnpm init:worktree`，之后用 `pnpm dev:wt` 启动统一 Worker；具体见本地开发文档。
- 行为改动必须有能先失败后通过的测试；纯文档改动至少验证链接、格式、引用和受影响的静态门禁。
- 变更保持单一目的，分支默认使用 `codex/` 前缀；合并前检查 staged diff、秘密、生成物和无关文件。

## 数据库与存储硬约束

- D1 binding 为 `DB`，数据库为 `gomate-db-v2`。迁移链包含 `0000_init.sql` baseline 与后续有序 migration；schema、journal、snapshot 与 migration 必须同步。
- 当前模型为 19 张业务表、13 个业务触发器。所有 DDL 只通过 migration；不得手工对生产 D1 执行 DDL。
- 多语句原子写使用 D1 `batch()` 与条件 DML；不要使用 `db.transaction()` 或裸 `BEGIN`/`COMMIT`。
- JSON 列在 Drizzle 使用 `mode: "json"`，业务层只传对象/数组，不增加字符串兼容层。
- `api/db/seed.sql` 仅用于本地开发/测试，不得应用到生产。
- R2 binding 为 `R2`（bucket `gomate`），KV binding 为 `CACHE_KV`（namespace `gomate-cache-v2`）。不得重新引入已退役的 Worker、D1、KV、域名或旧 binding。

## 前端规则

- 用户可见文案全部走 i18n；namespace 必须保持完整（例如 `content.discover.*`）。修改 locale 后运行 i18n build、validate 和类型检查。
- Astro 负责 SSR/页面边界，React island 只承载需要客户端状态的交互；不要把纯展示无理由改成 client component。
- SSR 调用 API 使用进程内 dispatcher，浏览器调用使用同源 `/api`；不得从 Worker 内 self-fetch 生产域名。
- 使用共享 DTO 和 V2 字段，不增加旧字段、旧响应 envelope 或旧分页参数别名。
- UI 改动遵循 `docs/design-system.md`，并验证键盘、可访问名称、移动端和 reduced-motion。

前端最低门禁：

```bash
pnpm i18n:build
pnpm --filter @gomate/frontend i18n:validate
pnpm --filter @gomate/frontend lint
pnpm --filter @gomate/frontend type-check
pnpm --filter @gomate/frontend test
pnpm --filter @gomate/frontend build
```

## API 与认证规则

- 新增/修改路由遵循 `api/src/app.ts` 和现有 `routes/` 边界；错误使用统一 API error/envelope，列表使用有界 limit 与 opaque cursor。
- 权限与跨表不变量必须在最终写语句中复核，不能只依赖先查后写；关键批处理需覆盖竞争与回滚测试。
- 认证只接受同源受控入口。邮箱验证和密码重置 token 只经 URL fragment 到页面，再以同源 POST body 提交；不得把 token 放进 path/query、日志或数据库明文。
- 日志事件名必须是稳定的 lowercase snake_case 字面量；禁止记录 body、headers、cookie、token、secret、原始 email/IP、用户资料或 Error message/stack/cause。
- API 行为变化同步更新 `docs/backend-api.md`。

API 最低门禁：

```bash
pnpm --filter @gomate/api lint
pnpm --filter @gomate/api type-check
pnpm --filter @gomate/api build
pnpm --filter @gomate/api test
pnpm --filter @gomate/api check:migrations
```

## 交付与生产红线

- PR 至少运行与变更范围匹配的测试；合并前运行 `pnpm check:legacy-removal` 与 `pnpm test:delivery`。完整 CI 以 `.github/workflows/pr-validation.yml` 为准。
- 生产不随 `main` 自动部署。任何远程 D1、KV、R2、Worker、route/domain 或 secret 变更都必须列出精确目标和回滚方式，获得用户显式批准，并通过 GitHub `production` protected environment。
- 不在本机直接执行生产 Cloudflare 写命令，不使用 admin bypass，不把生产 secrets 放到仓库级 Actions secrets、日志、PR 或命令参数。
- 当前仓库的 `deploy.yml` 通过 GitHub `production` protected environment 发布不可变 Worker version，并在同一受保护 job 内验证、推广或恢复；它不包含 D1 migration，也不代表可绕过逐次审批。生产发布现状与限制以 `docs/prod-change-policy.md` 为准。
- 生产异常先恢复/保持 `WRITE_MODE=protected`，再回滚到已验证 Worker version；旧 split Worker、旧 route 与旧数据库已退役，不得重建为回滚手段。

## 项目审查

用户要求 GoMate 专项审查或合并前专项审查时，使用 [`agents/gomate-reviewer.md`](agents/gomate-reviewer.md)。该 reviewer 只报告有代码路径和证据支持的问题，不直接修改代码。
