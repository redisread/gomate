# 🏔️ GoMate 地点组队平台

> 发现有趣地点，找到同行伙伴

[![Live](https://img.shields.io/badge/Live-gomate.live-blue)](https://gomate.live)

## 产品定位

GoMate 是一个**地点组队平台**，解决「想出门但找不到伙伴」的问题：

| 功能            | 描述                                           |
| --------------- | ---------------------------------------------- |
| 🗺️ **发现地点** | 城市及周边户外地点推荐，含难度、标签、POI 标记 |
| 👥 **组建队伍** | 一键发布组队信息，设定人数、时间、要求         |
| ✅ **便捷参与** | 申请加入队伍，队长审核，组队出发               |

## 在线体验

**网站：** https://gomate.live

**测试账号：**

- 邮箱：`1427298683@qq.com`
- 密码：`11111111`

**核心流程：**
浏览地点 → 查看详情 → 加入/创建队伍 → 等待确认 → 一起出发

## 技术架构

```
前端: Astro 4 + React 18 + Tailwind CSS
后端: Hono + Cloudflare Workers + D1 数据库
部署: Cloudflare（全球边缘节点）
```

## 快速开始

```bash
# 安装依赖
pnpm install

# 方式 1：直接启动（假设本地 D1 已初始化）
pnpm dev

# 方式 2：一键重置本地数据库并启动（推荐第一次使用）
pnpm dev:fresh

# 仅重置本地数据库并灌入测试数据
pnpm db:reset

# 本地测试账号（由 db:reset 自动生成）
# 邮箱：admin@test.com / leader_a@test.com / leader_b@test.com / member_a@test.com
# 密码：test1234
```

## E2E 测试

### Playwright（推荐）

```bash
# 安装浏览器（首次运行）
pnpm exec playwright install chromium

# 运行所有 E2E 测试（自动启动本地服务器）
pnpm e2e

# 无头模式（CI 用）
pnpm e2e:ci

# 调试模式（带 UI）
pnpm e2e:ui

# 测试 staging 环境
pnpm e2e:staging
```

### browser-use（AI 驱动探索式测试）

```bash
# 启动带远程调试的 Chrome
/Applications/Google\ Chrome.app/Contents/MacOS/Google\ Chrome \
  --remote-debugging-port=9222 \
  --user-data-dir=/tmp/browser-use-profile

# 运行 AI 驱动测试
BU_CDP_URL=http://localhost:9222 browser-use <<'PY'
exec(open("e2e/browser-use/login_flow.py").read())
PY
```

## 本地环境配置

1. API 密钥：复制 `api/.dev.vars.example` 为 `api/.dev.vars`
2. 前端 API 地址：复制 `frontend/.env.local.example` 为 `frontend/.env.local`

## 部署

```bash
pnpm api:deploy    # 后端
pnpm web:build     # 前端
```

## 相关仓库

- 📱 **移动端**（Flutter）：已归档至 [gomate-mobile](https://github.com/redisread/gomate-mobile)

## 许可证

MIT
