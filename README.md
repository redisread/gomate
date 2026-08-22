# 🏔️ GoMate 地点组队平台

> 发现有趣地点，找到同行伙伴

[![Live](https://img.shields.io/badge/Live-gomate.live-blue)](https://gomate.live)

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
统一 Worker: Astro 7 SSR + React 18 + Hono `/api/*`
数据: Cloudflare D1 + R2（无运行时 KV）
部署: Cloudflare Workers Builds 从 Git 构建并部署同一个 Worker
```

## 快速开始

```bash
# 安装依赖
pnpm install

# 检查本地环境是否就绪（Node/pnpm、环境文件、端口、wrangler 登录等）
pnpm env:check

# 方式 1：直接启动（假设本地 D1 已初始化）
pnpm dev

# 方式 2：初始化本地 secrets、迁移和 seed（推荐第一次使用）
pnpm init:worktree

# 仅重置本地数据库并灌入测试数据
pnpm db:reset

# v3 seed 仅写入 Region、地点与标签；用户在测试中独立注册
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
pnpm test:e2e

# 无头模式（CI 用）
pnpm test:e2e:ci

# 调试模式（带 UI）
pnpm exec playwright test --ui --project=chromium

```

## 本地环境配置

复制统一 Worker 的本地 secrets：

```bash
cp .dev.vars.example .dev.vars
```

浏览器和 SSR 都使用同源 `/api`，无需配置 `PUBLIC_API_URL`。

## 本地环境故障排查

如果本地 Worker 启动失败或 E2E 测试行为异常，先运行：

```bash
pnpm env:check
```

常见问题：

| 问题                            | 可能原因                               | 解决办法                                         |
| ------------------------------- | -------------------------------------- | ------------------------------------------------ |
| `pnpm dev` 提示端口被占用       | 统一 Worker 的 5432 端口被其他进程占用 | 关闭占用端口的进程，或运行 `pnpm dev:wt` 使用下一个空闲端口 |
| E2E 注册或登录失败              | 本地 D1 未初始化或 secrets 不一致      | 运行 `pnpm db:reset` 并检查 `.dev.vars`          |
| Playwright 报错找不到浏览器     | Chromium 未安装                        | `pnpm exec playwright install chromium`          |
| `wrangler` 提示未登录           | Cloudflare 账号未认证                  | `pnpm exec wrangler login`                       |
| `.dev.vars` 缺失                | 本地 secrets 未配置                    | 复制 `.dev.vars.example` 并填入                 |

如果排查后仍无法解决，请附带 `pnpm env:check` 输出和错误日志提 issue。

## 部署

PR 通过 `pnpm test:ci` 后由 Cloudflare Workers Builds 从 Git 构建；preview 使用隔离的
Cloudflare 环境，生产部署使用 protected environment 和 migration gate。线上由统一 Worker
`gomate` 提供 `gomate.live`。禁止从本机或临时命令执行生产 Worker、D1、R2、secret 或
route 写入，详见 `docs/prod-change-policy.md`。

## 相关仓库

- 📱 **移动端**（Flutter）：已归档至 [gomate-mobile](https://github.com/redisread/gomate-mobile)

## 许可证

MIT
