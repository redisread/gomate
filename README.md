# GoMate

一个极简的「地点组队」平台，专注于深圳徒步场景。

## 项目简介

GoMate 旨在用结构化的方式解决小红书找搭子信息混乱的问题，帮助户外爱好者快速找到志同道合的徒步伙伴。

## 技术栈

- **框架**: Next.js 15 + App Router
- **React**: 19
- **语言**: TypeScript 5 (严格模式)
- **样式**: Tailwind CSS v4
- **UI 组件**: shadcn/ui
- **数据库**: CloudFlare D1 (SQLite) + Drizzle ORM
- **认证**: Better Auth 1.4+
- **部署**: CloudFlare Workers/Pages

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
# Better Auth 密钥（至少 32 位）
BETTER_AUTH_SECRET=your-secret-key
BETTER_AUTH_URL=http://localhost:8787
```

生成密钥：
```bash
openssl rand -base64 32
```

### 3. 启动开发服务器

项目使用 **wrangler dev** 在本地模拟 CloudFlare Workers 环境（包含 D1 数据库）：

```bash
# 构建并启动
npm run cf:dev
```

访问 http://localhost:8787

### 4. 数据库说明

本地开发时，数据存储在 SQLite 文件中：

```
.wrangler/state/v3/d1/miniflare-D1DatabaseObject/
└── {database-id}.sqlite
```

**查看本地数据：**
```bash
# 查看所有用户
sqlite3 .wrangler/state/v3/d1/miniflare-D1DatabaseObject/*.sqlite \
  "SELECT id, name, email, createdAt FROM users;"

# 查看所有表
sqlite3 .wrangler/state/v3/d1/miniflare-D1DatabaseObject/*.sqlite ".tables"
```

**数据库迁移：**
```bash
# 生成迁移文件
npm run db:generate

# 查看生成的 SQL
ls drizzle/
```

### 5. 生产环境部署

**配置密钥：**
```bash
# 生成新的生产密钥（不要在本地使用）
openssl rand -base64 32

# 设置到 Cloudflare Secrets
wrangler secret put BETTER_AUTH_SECRET
```

**部署：**
```bash
# 部署到 Cloudflare
npm run cf:deploy
```

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

**相关文件：**
- `lib/auth-client.ts` - 客户端配置
- `app/api/auth/[...all]/route.ts` - API 路由

## 常用命令

```bash
# 开发（推荐）
npm run cf:dev              # 启动 wrangler 本地调试（含 D1 数据库）

# 构建
npm run cf:build            # 构建 Cloudflare Workers 版本

# 数据库
npm run db:generate         # 生成 Drizzle 迁移文件
npm run db:studio           # 打开 Drizzle Studio

# 部署
npm run cf:deploy           # 部署到 Cloudflare

# 本地 D1 数据库操作
sqlite3 .wrangler/state/v3/d1/miniflare-D1DatabaseObject/*.sqlite ".tables"
sqlite3 .wrangler/state/v3/d1/miniflare-D1DatabaseObject/*.sqlite "SELECT * FROM users;"
```

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
