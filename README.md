# 🏔️ GoMate 地点组队平台

> 发现有趣地点，找到同行伙伴

[![Live](https://img.shields.io/badge/Live-gomate.live-blue)](https://gomate.live)
[![PR Validation](https://github.com/redisread/gomate/actions/workflows/pr-validation.yml/badge.svg?branch=main)](https://github.com/redisread/gomate/actions/workflows/pr-validation.yml)

## 产品定位

GoMate 是一个**地点组队平台**，解决「想出门但找不到伙伴」的问题：

| 功能            | 描述                                       |
| --------------- | ------------------------------------------ |
| 🗺️ **发现地点** | 城市及周边户外地点推荐，含标签、交通等信息 |
| 👥 **组建队伍** | 一键发布组队信息，设定人数、时间、要求     |
| ✅ **便捷参与** | 申请加入队伍，队长审核，组队出发           |

## 在线体验

**网站：** https://gomate.live

**核心流程：**
浏览地点 → 查看详情 → 加入/创建队伍 → 等待确认 → 一起出发

## 技术架构

```
统一 Worker: Astro 6 SSR + React 18 + Hono `/api/*`
数据: Cloudflare D1 + R2 + KV
部署: 一个 Cloudflare Worker（同源页面、认证与 API）
```

## 快速开始

```bash
# 安装依赖
pnpm install

# 检查本地环境是否就绪（Node/pnpm、环境文件、端口、wrangler 登录等）
pnpm env:check

# 方式 1：直接启动（假设本地 D1 已初始化）
pnpm dev

# 方式 2：一键重置本地数据库并启动（推荐第一次使用）
pnpm dev:fresh

# 仅重置本地数据库并灌入测试数据
pnpm db:reset

# V2 seed 仅写入 Region、地点与标签；用户在测试中独立注册
```

## 提升用户为 Admin

地点与 Region 管理接口需要 `role = 'admin'`。如果本地注册账号默认是 `user`，可用以下脚本提升：

```bash
pnpm db:promote-admin --email admin@test.com
```

该脚本只允许修改本地 D1。生产权限变更必须走受保护环境与显式审批，脚本传入
`--env` 或 `--yes` 会直接拒绝执行。

## E2E 测试

### Playwright（推荐）

覆盖范围：登录/注册、地点浏览、队伍创建、队伍申请与审批、首页浏览等核心路径。

```bash
# 安装浏览器（首次运行）
pnpm exec playwright install chromium

# 运行本地 E2E 测试（自动启动本地服务器）
pnpm e2e

# 无头模式（CI 用）
pnpm e2e:ci

# 调试模式（带 UI）
pnpm e2e:ui

```

### browser-use（AI 驱动探索式测试）

```bash
# 启动带远程调试的 Chrome
/Applications/Google\ Chrome.app/Contents/MacOS/Google\ Chrome \
  --remote-debugging-port=9222 \
  --user-data-dir=/tmp/browser-use-profile

# 运行 AI 驱动测试（home_smoke.py）
BU_CDP_URL=http://localhost:9222 pnpm e2e:browser-use
```

## 本地环境配置

复制统一 Worker 的本地 secrets：

```bash
cp frontend/.dev.vars.example frontend/.dev.vars
```

浏览器和 SSR 都使用同源 `/api`，无需配置 `PUBLIC_API_URL`。

## 本地环境故障排查

如果 `pnpm dev:fresh` 启动失败或 E2E 测试行为异常，先运行：

```bash
pnpm env:check
```

常见问题：

| 问题                            | 可能原因                               | 解决办法                                         |
| ------------------------------- | -------------------------------------- | ------------------------------------------------ |
| `pnpm dev:fresh` 提示端口被占用 | 统一 Worker 的 5432 端口被其他进程占用 | 关闭占用端口的进程，或运行 `pnpm env:check` 查看 |
| E2E 注册或登录失败              | 本地 D1 未初始化或 secrets 不一致      | 运行 `pnpm db:reset` 并检查 `.dev.vars`          |
| Playwright 报错找不到浏览器     | Chromium 未安装                        | `pnpm exec playwright install chromium`          |
| `wrangler` 提示未登录           | Cloudflare 账号未认证                  | `pnpm exec wrangler login`                       |
| `frontend/.dev.vars` 缺失       | 本地 secrets 未配置                    | 复制 `frontend/.dev.vars.example` 并填入         |

如果排查后仍无法解决，请附带 `pnpm env:check` 输出和错误日志提 issue。

## 部署

生产不随 main 自动部署。`.github/workflows/deploy.yml` 仅允许通过受保护环境手动
发布无生产域名的 preview；资源 ID 经独立 PR 审查、只读烟测通过后，才能另行切换
`gomate.live` 路由。详见 `docs/prod-change-policy.md`。

## 相关仓库

- 📱 **移动端**（Flutter）：已归档至 [gomate-mobile](https://github.com/redisread/gomate-mobile)

## 许可证

MIT
