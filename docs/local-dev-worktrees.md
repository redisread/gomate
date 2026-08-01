# 多 worktree 本地开发

## 背景

`git worktree` 是独立 checkout，gitignored 文件不跟随：

- `api/.dev.vars`（auth secret）
- `frontend/.env.local`（PUBLIC_API_URL）
- 本地 D1 状态（原 `api/.wrangler/state`）

因此新 worktree 直接 `pnpm dev` 会端口冲突（8799 / 5432 写死）且缺数据（空库、缺 secrets、缺 i18n 生成文件）。

本方案的解决方式：

1. **动态端口**：`GOMATE_API_PORT` / `GOMATE_WEB_PORT` 控制 dev 端口，`pnpm dev:wt` 自动分配空闲端口
2. **共享本地 D1**：所有 worktree 用同一份本地 D1（默认 `~/.gomate/wrangler-state`），初始化一次即可，数据不再缺失
3. **一键初始化**：`pnpm init:worktree` 补齐 secrets / env / i18n / D1

## 环境变量

| 变量                     | 默认值                     | 说明                                                                                                                        |
| ------------------------ | -------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| `GOMATE_API_PORT`        | `8799`                     | API dev 端口                                                                                                                |
| `GOMATE_WEB_PORT`        | `5432`                     | 前端 dev 端口                                                                                                               |
| `GOMATE_LOCAL_STATE`     | `~/.gomate/wrangler-state` | wrangler 本地持久化目录（D1/KV/R2 状态），多 worktree 共享；显式设置时**请用绝对路径**（wrangler dev 与各脚本解析基准不同） |
| `GOMATE_DEV_VARS_SOURCE` | 无                         | `api/.dev.vars` 缺失时的复制来源路径                                                                                        |
| `GOMATE_SKIP_SYNC`       | 无                         | `=1` 时跳过 prod 地点数据同步（离线调试）                                                                                   |

## 快速开始（推荐）

```bash
pnpm init:worktree          # 补齐 secrets / .env.local / i18n / 共享 D1（幂等，只初始化一次）
pnpm dev:wt                 # 自动分配空闲端口并启动 API + 前端
```

- 端口冲突时自动递增找空闲端口（如主 checkout 占用 8799/5432，新 worktree 自动用 8800/5433）
- CORS 对 localhost 任意端口放行，无需手动同步白名单
- 共享 D1 数据（prod 对齐的 cities/locations）所有 worktree 通用

### 手动指定端口

```bash
GOMATE_API_PORT=8811 GOMATE_WEB_PORT=5545 pnpm dev:wt
```

### 首次初始化细节

`pnpm init:worktree` 依次完成：

1. `api/.dev.vars`：缺失时从 `--dev-vars-from <path>` 或 `GOMATE_DEV_VARS_SOURCE` 复制；都没有则打印指引并退出（secret 不进入 git）
2. `frontend/.env.local`：缺失时自动生成（`PUBLIC_API_URL` 指向当前 API 端口）
3. `frontend/src/i18n/locales-data.ts`：gitignored 构建产物，缺失时跑 `pnpm i18n:build`
4. 共享 D1：首次执行 `wrangler d1 migrations apply --local --persist-to <state>` + `tsx db/sync-locations.ts`（从 prod API 拉 cities/locations/tags），已有数据则跳过

QA 用户仍需手动注册（见 AGENTS.md「本地全栈测试环境」）。

## 数据维护

```bash
pnpm db:reset      # 清空共享 D1 并应用 migrations + seed（移动端测试角色）
pnpm db:sync       # 从 prod API 重新同步地点数据到共享 D1（cd api && tsx db/sync-locations.ts）
```

⚠️ `db:reset` 会直接删除共享 D1 目录：**先停掉所有正在运行的 dev 实例再执行**，否则运行中实例会持有已删除的 SQLite inode，后续写入丢失、数据分裂。

注意：`db:reset` 作用于共享目录，会清掉所有 worktree 的本地数据；需要 prod 对齐数据时先 `db:reset` 再 `db:sync`（或直接 `init:worktree` 里的 sync 步骤）。

旧 `api/.wrangler/state` 的本地数据不会自动迁移；如需保留，手动拷贝到共享目录：
`cp -R <旧worktree>/api/.wrangler/state/v3/d1 ~/.gomate/wrangler-state/v3/d1`

## 并发说明

多个 worktree 同时 `wrangler dev` 共享同一 SQLite 文件，本地并发写（如同时注册/创建队伍）实测可用；如遇到 `SQLITE_BUSY` 类错误，错峰操作或对单个 worktree 设置独立 `GOMATE_LOCAL_STATE`。

## e2e

playwright 默认连 `5432` / `8799`，多 worktree 下用环境变量覆盖：

```bash
E2E_BASE_URL=http://localhost:<web-port> E2E_API_URL=http://localhost:<api-port> E2E_ORIGIN=http://localhost:<web-port> pnpm e2e
```
