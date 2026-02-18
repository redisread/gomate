# GoMate 项目 Cloudflare 部署指南

## 概述

本文档介绍如何将 GoMate 项目部署到 Cloudflare Workers + D1。

**技术栈**:
- **框架**: Next.js 16.1.6 + React 19.2.3
- **部署方式**: Cloudflare Workers (静态导出 + Worker 脚本)
- **数据库**: Cloudflare D1 (SQLite)
- **存储**: Cloudflare R2 (图片，可选)
- **认证**: Better Auth

**注意**: 由于 OpenNext 与 Next.js 16 存在兼容性问题，本项目采用**静态导出 + Workers** 方案。

---

## 前置要求

- Node.js 20+
- npm
- Cloudflare 账号
- wrangler CLI

---

## 快速开始

### 1. 安装依赖

```bash
# 安装 wrangler CLI（全局）
npm install -g wrangler

# 安装项目依赖
npm install
```

### 2. 登录 Cloudflare

```bash
wrangler login
```

### 3. 创建 D1 数据库

```bash
# 创建数据库
wrangler d1 create gomate-db

# 记录输出中的 database_id
# 例如: database_id = "7d17d076-202f-48f8-b343-24209cdb0ba1"
```

### 4. 更新 wrangler.toml

编辑 `wrangler.toml`，填写数据库 ID：

```toml
[[d1_databases]]
binding = "DB"
database_name = "gomate-db"
database_id = "你的数据库ID"
```

### 5. 应用数据库迁移

```bash
# 应用迁移（本地测试）
wrangler d1 execute gomate-db --file=./migrations/0001_init.sql --local
wrangler d1 execute gomate-db --file=./migrations/0002_seed.sql --local

# 应用迁移（生产环境）
wrangler d1 execute gomate-db --file=./migrations/0001_init.sql --remote
wrangler d1 execute gomate-db --file=./migrations/0002_seed.sql --remote
```

### 6. 设置密钥

```bash
# 生成 Better Auth Secret
openssl rand -base64 32

# 设置密钥（需要先部署一次 Workers）
wrangler secret put BETTER_AUTH_SECRET
```

### 7. 本地开发测试

```bash
# 构建静态站点
npm run cf:build

# 本地开发
wrangler dev
```

### 8. 部署到 Cloudflare Workers

```bash
# 构建
npm run cf:build

# 部署
npm run cf:deploy
```

部署成功后会显示 Workers 域名，例如：
```
✨ Successfully published your script to:
https://gomate.your-account.workers.dev
```

---

## 详细配置

### wrangler.toml 配置

```toml
name = "gomate"
main = "worker.ts"
compatibility_date = "2025-02-01"
compatibility_flags = ["nodejs_compat"]

# D1 数据库绑定
[[d1_databases]]
binding = "DB"
database_name = "gomate-db"
database_id = "你的数据库ID"

# R2 存储桶绑定（可选）
[[r2_buckets]]
binding = "R2"
bucket_name = "gomate-images"

# 环境变量
[vars]
NEXT_PUBLIC_APP_URL = "https://gomate.your-account.workers.dev"
BETTER_AUTH_URL = "https://gomate.your-account.workers.dev"
```

### package.json Scripts

```json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "cf:build": "next build",
    "cf:deploy": "wrangler deploy",
    "d1:create": "wrangler d1 create gomate-db",
    "d1:migrate:local": "wrangler d1 migrations apply gomate-db --local",
    "d1:migrate:prod": "wrangler d1 migrations apply gomate-db --remote"
  }
}
```

### next.config.ts 配置

```typescript
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 静态导出配置
  output: 'export',
  distDir: 'dist',
  trailingSlash: true,

  // 图片优化配置（静态导出需要禁用）
  images: {
    unoptimized: true,
    remotePatterns: [
      { protocol: "https", hostname: "images.unsplash.com" },
      { protocol: "https", hostname: "*.r2.cloudflarestorage.com" },
    ],
  },
};

export default nextConfig;
```

---

## 项目结构

```
gomate/
├── app/                          # Next.js App Router
│   ├── locations/[id]/           # 动态路由
│   │   ├── page.tsx              # 服务器组件
│   │   └── content.tsx           # 客户端组件
│   └── teams/[id]/
│       ├── page.tsx
│       └── content.tsx
├── db/                           # 数据库配置
│   ├── schema.ts
│   └── index.ts
├── migrations/                   # D1 迁移文件
│   ├── 0001_init.sql
│   └── 0002_seed.sql
├── worker.ts                     # Workers 入口脚本
├── wrangler.toml                 # Wrangler 配置
└── next.config.ts                # Next.js 配置
```

---

## 数据库管理

### 执行 SQL

```bash
# 执行 SQL 文件
wrangler d1 execute gomate-db --file=./migrations/xxxx.sql --remote

# 执行单行命令
wrangler d1 execute gomate-db --command="SELECT * FROM locations" --remote
```

### 数据库备份

```bash
# 导出数据
wrangler d1 export gomate-db --remote --output=backup.sql
```

---

## 环境变量

### 开发环境 (.env.local)

```bash
USE_MOCK_DATA=false
USE_LOCAL_DB=true
LOCAL_DB_PATH=./local.db
BETTER_AUTH_SECRET=dev-secret-key
BETTER_AUTH_URL=http://localhost:3000
```

### 生产环境 (Cloudflare Secrets)

```bash
# 设置密钥
wrangler secret put BETTER_AUTH_SECRET
```

### 生产环境 (Cloudflare Vars)

在 `wrangler.toml` 的 `[vars]` 部分定义：

```toml
[vars]
NEXT_PUBLIC_APP_URL = "https://gomate.your-account.workers.dev"
BETTER_AUTH_URL = "https://gomate.your-account.workers.dev"
```

---

## 故障排除

### 问题 1：构建失败 / 动态路由错误

**症状**: `Error: Page "/locations/[id]" is missing "generateStaticParams"`

**解决**:
所有动态路由都必须导出 `generateStaticParams`：

```typescript
export function generateStaticParams() {
  return [
    { id: 'location-1' },
    { id: 'location-2' },
  ];
}
```

### 问题 2：数据库连接失败

**症状**: `Error: No such D1 database`

**解决**:
1. 检查 `wrangler.toml` 中的 `database_id` 是否正确
2. 确认数据库已创建：`wrangler d1 list`

### 问题 3：图片不显示

**症状**: 图片加载失败

**解决**:
1. 确认 `next.config.ts` 中设置了 `unoptimized: true`
2. 检查图片域名是否在 `remotePatterns` 中

### 问题 4：Better Auth 认证失败

**症状**: 登录/注册报错

**解决**:
1. 检查 `BETTER_AUTH_SECRET` 是否设置
2. 确认 `BETTER_AUTH_URL` 使用生产域名
3. 检查数据库表是否正确创建

---

## 监控和日志

### 查看实时日志

```bash
wrangler tail
```

### Dashboard 监控

- [Cloudflare Dashboard](https://dash.cloudflare.com)
- 选择 **Workers & Pages**
- 查看：
  - 调用统计
  - 错误率
  - D1 查询统计

---

## 自定义域名

1. 在 Cloudflare Dashboard 进入 Workers 项目
2. 点击 **Triggers** 标签
3. 点击 **Add Custom Domain**
4. 输入你的域名（如 `gomate.com`）
5. 按照提示添加 DNS 记录
6. 更新 `wrangler.toml` 中的 URL 配置

---

## 成本估算

Cloudflare 免费额度：
- **Workers**: 100,000 请求/天
- **D1**: 500 万次查询/天，5GB 存储
- **R2**: 10GB 存储，100 万次读取/月
- **带宽**: 无限

对于个人/小项目，免费额度完全够用。

---

## 部署方案对比

| 特性 | 当前方案 (Workers + 静态导出) | OpenNext + Workers | 静态导出 + Pages |
|------|------------------------------|-------------------|------------------|
| SSR | ❌ 不支持 | ✅ 完整支持 | ❌ 不支持 |
| API Routes | ✅ Workers 支持 | ✅ 原生支持 | ⚠️ 需 Functions |
| Server Actions | ❌ 不支持 | ✅ 原生支持 | ❌ 不支持 |
| 动态路由 | ⚠️ 需 generateStaticParams | ✅ 无需配置 | ⚠️ 需 generateStaticParams |
| 图片优化 | ❌ 需禁用 | ✅ 支持 | ❌ 需禁用 |
| 部署复杂度 | 简单 | 中等 | 简单 |

---

## 参考链接

- [Cloudflare Workers 文档](https://developers.cloudflare.com/workers/)
- [Cloudflare D1 文档](https://developers.cloudflare.com/d1/)
- [Wrangler CLI 文档](https://developers.cloudflare.com/workers/wrangler/)
- [Next.js Static Export](https://nextjs.org/docs/app/building-your-application/deploying/static-exports)
