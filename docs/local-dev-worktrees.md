# 单 Worker 的多 worktree 本地开发

## 运行模型

开发和生产共用同一套页面与 Hono API。`pnpm dev` 使用 Astro adapter 的默认开发
入口以保留 HMR，`src/middleware.ts` 会把 `/api/*` 交给同一个 `src/server/app.ts`；
`pnpm build`（固定 `CLOUDFLARE_ENV=production`）与 Cloudflare Workers Builds 使用
`src/worker.ts` 的正式 Hono pipeline。浏览器 E2E 单独构建本地配置，并由 Wrangler
使用与 `db:reset` 相同的持久化 binding 启动生成产物。根配置保留连接的 Worker
名称 `gomate` 以满足 Workers Builds 校验，但 D1/R2 使用本地名称，生产绑定只存在于显式的
`production` 环境。这样本地开发和正式部署都
只有一个应用进程，不维护第二套 API 实现。

同一进程与端口同时提供：

- 页面、静态资源与 Astro SSR；
- `/api/*` 下的 Hono API；
- Better Auth 的同源 Cookie；
- 本地 D1 与 R2 binding。

不再启动独立 API 进程，也不再使用 `PUBLIC_API_URL`、CORS 或 8799 端口。

## 初始化

每个 worktree 的 ignored secret 文件不会由 Git 复制。首次进入 checkout 时运行：

```bash
pnpm init:worktree --dev-vars-from /absolute/path/to/.dev.vars
pnpm dev:wt
```

也可先把 `.dev.vars.example` 复制为 `.dev.vars`。初始化脚本会：

1. 补齐统一 Worker secret 文件；
2. 生成 i18n 数据；
3. 对共享本地 D1 幂等应用全部 pending migration（包含稳定参考数据）。

`pnpm dev:wt` 从 5432 起选择一个空闲端口，只启动一个 Astro/Worker 进程。启动器
为该进程生成 ignored 的临时 Wrangler 配置，同时把 `dev.port` 与 `APP_URL` 写成
实际端口；进程退出时精确删除该临时文件。

## 环境变量

| 变量                     | 默认值                     | 说明                                      |
| ------------------------ | -------------------------- | ----------------------------------------- |
| `GOMATE_WEB_PORT`        | `5432`                     | 统一 Worker 端口；显式设置时不自动选择    |
| `GOMATE_LOCAL_STATE`     | `~/.gomate/wrangler-state` | D1/R2 本地持久化目录，建议使用绝对路径    |
| `GOMATE_DEV_VARS_SOURCE` | 无                         | `.dev.vars` 的复制来源                    |

Astro Cloudflare adapter 与数据库脚本使用同一个 `GOMATE_LOCAL_STATE`，因此所有
worktree 默认共享本地数据。若需要隔离，为该 worktree 指定独立绝对路径。

## 重置数据

```bash
pnpm db:reset
```

该命令通过 `DB` binding 枚举并删除目标 D1 中的全部用户表，不扫描或删除共享
Miniflare 目录里的 SQLite 文件，因此不会碰同一 persist root 下的 KV/R2 或其他
D1 binding。随后重新应用完整 migration 链和 seed。执行前停止所有使用同一 D1 的 dev
进程，避免并发写入。

本地数据库从仓库 v3 baseline 和 seed 重建，不从生产同步数据。

## E2E

Playwright 固定保留首页/健康检查、登录、认证保护、建队、申请审批 5 条关键路径，默认针对同一个 origin：

- 页面：`http://localhost:5432`
- API：`http://localhost:5432/api`

本地运行前先执行 `pnpm db:reset`。CI 使用 `GOMATE_LOCAL_STATE` 指向 runner 临时目录，
因此 migration、fixture 与浏览器服务共享同一个隔离 D1，且不会访问远程 Cloudflare 资源。

覆盖其他 worktree 端口时：

```bash
E2E_BASE_URL=http://localhost:<port> \
E2E_API_URL=http://localhost:<port>/api \
E2E_ORIGIN=http://localhost:<port> \
pnpm test:e2e
```
