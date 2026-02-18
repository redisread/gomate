# GoMate 项目 Cloudflare 部署指南

## 概述

本文档详细介绍如何将 GoMate 项目（Next.js 16 + React 19）部署到 Cloudflare 平台。

**技术栈**:
- **框架**: Next.js 16.1.6 + React 19.2.3
- **部署方式**: Cloudflare Pages 静态导出
- **数据库**: Cloudflare D1 (SQLite)
- **API**: Cloudflare Pages Functions
- **存储**: Cloudflare R2 (图片，可选)
- **认证**: Better Auth

**部署架构**:
```
┌─────────────────────────────────────────────────────────────┐
│                    Cloudflare Pages                         │
│  ┌──────────────┐  ┌─────────────────┐  ┌──────────────┐   │
│  │  静态页面     │  │  Pages Functions │  │  D1 数据库    │   │
│  │  (Next.js)   │  │    (API)         │  │  (SQLite)    │   │
│  └──────────────┘  └─────────────────┘  └──────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

---

## 前置要求

- Node.js 20+
- npm 或 pnpm
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

浏览器会打开授权页面，点击允许访问。

### 3. 创建 D1 数据库

```bash
# 创建数据库
npm run d1:create

# 记录输出中的 database_id
# 例如: database_id = "a1b2c3d4-e5f6-7890-abcd-ef1234567890"
```

### 4. 更新 wrangler.toml

编辑 `wrangler.toml`，填写数据库 ID：

```toml
[[d1_databases]]
binding = "DB"
database_name = "gomate-db"
database_id = "你的数据库ID"  # <-- 替换为第3步获取的ID
```

### 5. 运行数据库迁移

```bash
# 应用迁移（本地测试）
npm run d1:migrate:local

# 应用迁移（生产环境）
npm run d1:migrate:prod
```

### 6. 设置密钥

```bash
# 生成 Better Auth Secret
openssl rand -base64 32

# 设置密钥
wrangler secret put BETTER_AUTH_SECRET
# 粘贴生成的密钥
```

### 7. 本地构建测试

```bash
# 构建静态站点
npm run pages:build

# 本地预览（需要先在 wrangler.toml 中配置数据库ID）
npm run pages:preview
```

### 8. 部署到 Cloudflare Pages

```bash
# 部署
npm run pages:deploy
```

或使用 Git 集成（推荐）：

1. 推送代码到 GitHub
2. 登录 [Cloudflare Dashboard](https://dash.cloudflare.com)
3. 进入 Pages → 创建项目 → 连接 GitHub 仓库
4. 构建设置：
   - **Build command**: `npm run pages:build`
   - **Build output directory**: `dist`
5. 添加环境变量和数据库绑定
6. 保存并部署

---

## 详细配置

### wrangler.toml 配置

```toml
name = "gomate"
compatibility_date = "2025-02-01"
compatibility_flags = ["nodejs_compat"]

# 构建输出目录
pages_build_output_dir = "dist"

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
    "pages:build": "next build",
    "pages:preview": "wrangler pages dev dist --compatibility-flags=nodejs_compat",
    "pages:deploy": "wrangler pages deploy dist",
    "cf-typegen": "wrangler types",
    "d1:create": "wrangler d1 create gomate-db",
    "d1:migrate:local": "wrangler d1 migrations apply gomate-db --local",
    "d1:migrate:prod": "wrangler d1 migrations apply gomate-db --remote"
  }
}
```

### next.config.ts 配置

```typescript
const nextConfig: NextConfig = {
  // Cloudflare Pages 静态导出配置
  output: 'export',
  distDir: 'dist',
  trailingSlash: true,

  // 图片优化配置（静态导出需要禁用）
  images: {
    unoptimized: true,
    remotePatterns: [
      { protocol: "https", hostname: "images.unsplash.com" },
      { protocol: "https", hostname: "*.r2.cloudflarestorage.com" },
      { protocol: "https", hostname: "*.r2.dev" },
    ],
  },

  // ... 其他配置
};
```

---

## 数据库管理

### 创建迁移

```bash
# 创建新的迁移文件
wrangler d1 migrations create gomate-db 迁移名称

# 编辑 migrations/xxx_迁移名称.sql
```

### 应用迁移

```bash
# 本地测试
wrangler d1 migrations apply gomate-db --local

# 生产环境
wrangler d1 migrations apply gomate-db --remote
```

### 执行 SQL

```bash
# 执行 SQL 文件
wrangler d1 execute gomate-db --file=./migrations/0002_seed.sql --remote

# 执行单行命令
wrangler d1 execute gomate-db --command="SELECT * FROM locations" --remote
```

### 数据库备份

```bash
# 导出数据
wrangler d1 export gomate-db --remote --output=backup.sql
```

---

## API 开发

### Pages Functions 目录结构

```
functions/
└── api/
    └── [[path]].ts    # 通配路由处理器
```

### 添加新 API 端点

编辑 `functions/api/[[path]].ts`：

```typescript
// 示例：添加用户相关 API
if (path === "/users" && request.method === "GET") {
  const result = await (env as Env).DB.prepare(
    "SELECT id, name, image FROM users LIMIT 10"
  ).all();
  return jsonResponse({ success: true, data: result.results });
}
```

### 本地测试 API

```bash
# 启动本地开发服务器
npm run pages:preview

# 测试 API
curl http://localhost:8788/api/health
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
wrangler secret put DATABASE_URL  # 如果需要
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
3. 检查数据库绑定是否在 Pages 设置中配置

### 问题 3：API 404 错误

**症状**: 调用 `/api/xxx` 返回 404

**解决**:
1. 检查 `functions/api/[[path]].ts` 是否正确配置
2. 确认文件路径是 `functions/api/[[path]].ts`（双括号表示通配）
3. 本地测试：`wrangler pages dev dist`

### 问题 4：图片不显示

**症状**: 图片加载失败

**解决**:
1. 确认 `next.config.ts` 中设置了 `unoptimized: true`
2. 检查图片域名是否在 `remotePatterns` 中
3. 确认图片 URL 是可公开访问的

### 问题 5：Better Auth 认证失败

**症状**: 登录/注册报错

**解决**:
1. 检查 `BETTER_AUTH_SECRET` 是否设置：`wrangler secret list`
2. 确认 `BETTER_AUTH_URL` 使用生产域名
3. 检查数据库表是否正确创建
4. 确认用户表结构与 Better Auth 兼容

---

## 监控和日志

### 查看实时日志

```bash
wrangler pages deployment tail --project-name gomate
```

### Dashboard 监控

- [Cloudflare Dashboard](https://dash.cloudflare.com)
- 选择你的 Pages 项目
- 查看：
  - 部署历史
  - 流量分析
  - Functions 日志
  - D1 查询统计

---

## 自定义域名

1. 在 Cloudflare Dashboard 进入 Pages 项目
2. 点击 "Custom domains" 标签
3. 点击 "Set up a custom domain"
4. 输入你的域名（如 `gomate.com`）
5. 按照提示添加 DNS 记录
6. 等待 SSL 证书生成（通常几分钟）
7. 更新 `wrangler.toml` 和 `BETTER_AUTH_URL`

---

## 成本估算

Cloudflare 免费额度：
- **Pages**: 无限请求，500 次构建/月
- **D1**: 500 万次查询/天，5GB 存储
- **R2**: 10GB 存储，100 万次读取/月
- **带宽**: 无限

对于个人/小项目，免费额度完全够用。

---

## 注意事项

1. **Next.js 16 静态导出**: 由于 Next.js 16 不完全兼容 Cloudflare Workers Edge Runtime，我们使用静态导出 + Pages Functions 的方案

2. **动态路由**: 所有动态路由必须在构建时确定，使用 `generateStaticParams`

3. **API 路由**: Server Actions 在静态导出时不直接支持，需要通过 Pages Functions 或 Fetch API 调用

4. **图片优化**: 静态导出时禁用 Next.js 图片优化，使用原始图片 URL 或 Cloudflare Images

5. **数据库**: D1 是 SQLite 兼容的，但不支持某些高级特性（如外键约束在默认情况下不启用）

---

## 参考链接

- [Cloudflare Pages 文档](https://developers.cloudflare.com/pages/)
- [Cloudflare D1 文档](https://developers.cloudflare.com/d1/)
- [Cloudflare Pages Functions](https://developers.cloudflare.com/pages/functions/)
- [Wrangler CLI 文档](https://developers.cloudflare.com/workers/wrangler/)
- [Next.js Static Export](https://nextjs.org/docs/app/building-your-application/deploying/static-exports)
