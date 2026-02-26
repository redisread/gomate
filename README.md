# GoMate

一个极简的「地点组队」平台，专注于深圳徒步场景。

## 项目简介

GoMate 旨在用结构化的方式解决小红书找搭子信息混乱的问题，帮助户外爱好者快速找到志同道合的徒步伙伴。

## 技术栈

- **框架**: Next.js 15.5 + App Router
- **React**: 18.3.1
- **语言**: TypeScript 5 (严格模式)
- **样式**: Tailwind CSS v4 + shadcn/ui
- **数据库**: CloudFlare D1 (SQLite) + Drizzle ORM
- **认证**: Better Auth 1.1.0（邮箱/密码）
- **部署**: CloudFlare Workers/Pages（通过 OpenNext）
- **存储**: CloudFlare R2（图片上传）

## 快速开始

### 1. 安装依赖

```bash
npm install
```

### 2. 配置环境变量

```bash
cp .env.example .env.local
# 编辑 .env.local 填写实际值
```

必需的环境变量：
```bash
BETTER_AUTH_SECRET=your-secret-key   # 至少 32 位
BETTER_AUTH_URL=http://localhost:3000
```

生成密钥：
```bash
openssl rand -base64 32
```

### 3. 启动开发服务器

```bash
npm run dev
```

访问 http://localhost:3000

### 4. 数据库说明

本地开发使用 `npm run dev` 时，通过 OpenNext 自动模拟 Cloudflare D1/R2 环境：

- 数据存储在 `.wrangler/state/v3/d1/miniflare-D1DatabaseObject/`
- 支持热更新，代码修改自动生效

**查看本地 D1 数据：**
```bash
sqlite3 .wrangler/state/v3/d1/miniflare-D1DatabaseObject/*.sqlite \
  "SELECT id, name, email, createdAt FROM users;"
```

**数据库迁移：**
```bash
npm run db:generate    # 生成迁移文件
```

### 5. 生产环境部署

```bash
# 设置 Cloudflare 密钥
wrangler secret put BETTER_AUTH_SECRET

# 部署
npm run cf:deploy
```

## 常用命令

```bash
# 开发（支持热更新，自动注入 Cloudflare D1/R2 绑定）
npm run dev

# 构建 & 部署
npm run cf:build         # 构建 Cloudflare Workers 版本
npm run cf:deploy        # 部署到 Cloudflare

# 数据库
npm run db:generate      # 生成 Drizzle 迁移文件
npm run db:studio        # 打开 Drizzle Studio
npm run d1:migrate:local # 本地应用 D1 迁移
npm run d1:migrate:prod  # 生产环境应用 D1 迁移

# 代码检查
npm run lint
```

> **注意**: `npm run dev` 通过 `initOpenNextCloudflareForDev()` 自动注入 Cloudflare 绑定（D1、R2），支持热更新，无需使用 `wrangler dev`。

## 项目结构

```
app/
├── api/auth/[...all]/      # Better Auth API 路由
├── login/                   # 登录页面
├── register/                # 注册页面
├── locations/               # 地点相关页面
├── teams/                   # 队伍相关页面
├── profile/                 # 用户资料
└── page.tsx                 # 首页

components/                  # UI 组件
lib/
├── auth.ts                  # Better Auth 服务端配置
├── auth-client.ts           # Better Auth 客户端配置
├── auth-context.tsx         # React 认证上下文
└── actions/                 # Server Actions

db/
├── schema.ts                # 数据库表定义
├── index.ts                 # 数据库连接
└── migrations/              # 迁移文件
```

## 认证系统

项目使用 **Better Auth** 处理用户认证：

- 邮箱 + 密码注册/登录
- Session 自动管理（Cookie）
- 密码自动加密（bcrypt）
- 支持自定义字段（bio, level）

## 开发规范

### 代码风格

- 使用 TypeScript 严格模式
- 组件使用 PascalCase
- 工具函数使用 camelCase
- 优先使用 Server Components

### Git 提交规范

```
feat: 新功能
fix: 修复
docs: 文档
style: 格式调整
refactor: 重构
test: 测试
chore: 构建/工具
```

## 许可证

MIT
