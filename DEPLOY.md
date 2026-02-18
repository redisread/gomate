# GoMate 项目 Cloudflare 部署指南

## 概述

本文档介绍如何将 GoMate 项目部署到 Cloudflare Pages。

**技术栈**:
- **框架**: Next.js 15.5.2 + React 18 + TypeScript
- **部署方式**: Cloudflare Pages (via @cloudflare/next-on-pages)
- **数据库**: Cloudflare D1 (SQLite)
- **存储**: Cloudflare R2 (图片，可选)
- **认证**: Better Auth

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

# 设置密钥（需要先部署一次）
wrangler pages secret put BETTER_AUTH_SECRET --project-name gomate
```

### 7. 本地开发测试

```bash
# 构建
npm run cf:build

# 本地预览
npm run cf:dev
```

### 8. 部署到 Cloudflare Pages

```bash
# 构建并部署
npm run cf:build
npm run cf:deploy
```

或使用 Git 集成：

1. 推送代码到 GitHub
2. 登录 [Cloudflare Dashboard](https://dash.cloudflare.com)
3. 进入 **Pages** → **创建项目** → **连接 GitHub 仓库**
4. 构建设置：
   - **Build command**: `npm run cf:build`
   - **Build output directory**: `.vercel/output/static`
5. 添加 D1 数据库绑定
6. 保存并部署

---

## 详细配置

### wrangler.toml 配置

```toml
name = "gomate"
compatibility_date = "2025-02-01"
compatibility_flags = ["nodejs_compat"]

# Cloudflare Pages 构建输出目录
pages_build_output_dir = ".vercel/output/static"

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
NEXT_PUBLIC_APP_URL = "https://gomate.pages.dev"
BETTER_AUTH_URL = "https://gomate.pages.dev"
```

### package.json Scripts

```json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "cf:build": "npx @cloudflare/next-on-pages",
    "cf:deploy": "wrangler pages deploy .vercel/output/static",
    "cf:dev": "wrangler pages dev .vercel/output/static",
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
  distDir: '.vercel/output/static',
  trailingSlash: true,

  // 图片优化配置（静态导出需要禁用）
  images: {
    unoptimized: true,
    remotePatterns: [
      { protocol: "https", hostname: "images.unsplash.com" },
      { protocol: "https", hostname: "*.r2.cloudflarestorage.com" },
    ],
  },

  // TypeScript
  typescript: {
    ignoreBuildErrors: true,
  },

  // ESLint
  eslint: {
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
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
wrangler pages secret put BETTER_AUTH_SECRET --project-name gomate
```

### 生产环境 (Cloudflare Vars)

在 `wrangler.toml` 的 `[vars]` 部分定义：

```toml
[vars]
NEXT_PUBLIC_APP_URL = "https://gomate.pages.dev"
BETTER_AUTH_URL = "https://gomate.pages.dev"
```

---

## 故障排除

### 问题 1：依赖冲突

**症状**: `peer dependency conflict with next`

**解决**:
确保使用正确的 Next.js 版本：
```bash
npm install next@15.5.2 --legacy-peer-deps
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

### 问题 4：动态路由 404

**症状**: 动态路由页面返回 404

**解决**:
确保动态路由添加了 `generateStaticParams`：

```typescript
export function generateStaticParams() {
  return [
    { id: 'item-1' },
    { id: 'item-2' },
  ];
}
```

---

## 监控和日志

### 查看实时日志

```bash
wrangler pages deployment tail --project-name gomate
```

### Dashboard 监控

- [Cloudflare Dashboard](https://dash.cloudflare.com)
- 选择 **Pages**
- 查看部署历史和统计

---

## 成本估算

Cloudflare 免费额度：
- **Pages**: 无限请求，500 次构建/月
- **D1**: 500 万次查询/天，5GB 存储
- **R2**: 10GB 存储，100 万次读取/月
- **带宽**: 无限

对于个人/小项目，免费额度完全够用。

---

## 参考链接

- [Cloudflare Pages 文档](https://developers.cloudflare.com/pages/)
- [Cloudflare D1 文档](https://developers.cloudflare.com/d1/)
- [Wrangler CLI 文档](https://developers.cloudflare.com/workers/wrangler/)
- [@cloudflare/next-on-pages](https://github.com/cloudflare/next-on-pages)
