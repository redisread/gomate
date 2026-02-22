# CLAUDE.md

本文件为 Claude Code (claude.ai/code) 提供操作本代码仓库的指引。

## 项目概述

GoMate 是一个极简的「地点组队」平台，专注于深圳徒步场景，帮助户外爱好者通过结构化组队找到志同道合的徒步伙伴。

## 技术栈

- **框架**: Next.js 15.5 + App Router
- **React**: 18.3.1
- **语言**: TypeScript 5（启用严格模式）
- **样式**: Tailwind CSS v4 + shadcn/ui 组件
- **ORM**: Drizzle ORM
- **数据库**: CloudFlare D1 (SQLite)
- **认证**: Better Auth 1.1.0（邮箱/密码）
- **部署**: CloudFlare Workers/Pages（通过 OpenNext）
- **邮件**: Resend
- **存储**: CloudFlare R2（图片上传）

## 开发命令

```bash
# 开发（推荐 - 使用 wrangler dev 并模拟 D1 数据库）
npm run cf:dev

# 构建 CloudFlare 版本
npm run cf:build

# 部署到 CloudFlare
npm run cf:deploy

# 数据库操作
npm run db:generate      # 生成 Drizzle 迁移文件
npm run db:studio        # 打开 Drizzle Studio
npm run d1:migrate:local # 本地应用 D1 迁移
npm run d1:migrate:prod  # 生产环境应用 D1 迁移

# 代码检查
npm run lint
```

## 架构说明

### 数据库层 (`db/`)

使用 Drizzle ORM 和 SQLite 方言。核心数据表：
- `users` - 用户账号（Better Auth 扩展字段：bio、level）
- `sessions`、`accounts`、`verifications` - Better Auth 表
- `locations` - 徒步地点（含标签、坐标、难度等）
- `teams` - 徒步队伍（状态：recruiting、full、ongoing、completed、cancelled）
- `team_members` - 队伍成员（角色：leader/member，状态：pending/approved/rejected）
- `password_resets` - 密码重置令牌

JSON 字段以文本形式存储：`bestSeason`、`tags`、`images`、`waypoints`、`facilities`、`requirements`、`warnings`、`equipmentNeeded`。

时间戳使用 Unix 整数：`createdAt`、`updatedAt`、`expiresAt`，配置为 `{ mode: "timestamp" }`。

### 认证系统 (`lib/auth.ts`)

Better Auth 支持双环境：
- CloudFlare Workers：通过 `drizzleAdapter` 使用 D1 数据库绑定
- 本地开发：通过动态导入使用 `better-sqlite3`

`createAuth(env?)` 函数检测环境并返回相应配置。默认导出的 `auth` 是一个 Proxy，用于延迟初始化认证实例。

### API 路由 (`app/api/`)

- `auth/[...all]/route.ts` - Better Auth 处理程序（所有认证端点）
- `teams/` - 队伍的增删改查和搜索
- `locations/` - 地点列表和详情
- `user/` - 用户资料操作
- `upload/` - 文件上传处理
- `r2/` - CloudFlare R2 图片操作

### Server Actions (`app/actions/`)

用于数据变更的 Server Actions：
- `teams.ts` - 创建、更新、加入、退出队伍
- `locations.ts` - 地点操作
- `users.ts` - 用户资料更新

### 路径别名

Webpack 和 Turbopack 配置使用 `@/` 前缀：
- `@/app/*` → `./app/*`
- `@/components/*` → `./components/*`
- `@/lib/*` → `./lib/*`
- `@/db/*` → `./db/*`

## 环境变量配置

`.env.local` 中必需的变量：
```bash
BETTER_AUTH_SECRET=        # 至少 32 位，生成命令：openssl rand -base64 32
BETTER_AUTH_URL=http://localhost:8787
```

D1 远程操作的可选变量：
```bash
CLOUDFLARE_ACCOUNT_ID=
CLOUDFLARE_DATABASE_ID=
CLOUDFLARE_D1_TOKEN=
RESEND_API_KEY=
```

## 数据库开发模式

1. **本地 D1（`cf:dev` 默认）**: 数据存储在 `.wrangler/state/v3/d1/miniflare-D1DatabaseObject/*.sqlite`
2. **本地 SQLite 文件**: 在 drizzle.config.ts 中设置 `LOCAL_DB_PATH`
3. **远程 D1**: 配置 CloudFlare 凭证用于生产环境操作

直接查询本地 D1：
```bash
sqlite3 .wrangler/state/v3/d1/miniflare-D1DatabaseObject/*.sqlite "SELECT * FROM users;"
```

## 关键约定

- 组件命名：PascalCase
- 函数/变量命名：camelCase
- 数据库枚举（定义在 schema.ts）：
  - `Difficulty`: "easy" | "moderate" | "hard" | "expert"
  - `TeamStatus`: "recruiting" | "full" | "ongoing" | "completed" | "cancelled"
  - `TeamMemberRole`: "leader" | "member"
  - `TeamMemberStatus`: "pending" | "approved" | "rejected"

## Git 提交规范

```
feat: 新功能
fix: 修复
docs: 文档
style: 格式调整
refactor: 重构
test: 测试
chore: 构建/工具
```

## 重要文件

- `db/schema.ts` - 数据库模式和类型定义
- `lib/auth.ts` - Better Auth 配置（双环境支持）
- `lib/auth-client.ts` - 客户端认证工具
- `wrangler.toml` - CloudFlare Workers 配置（含 D1/R2 绑定）
- `drizzle.config.ts` - Drizzle ORM 配置（自动检测驱动）
- `open-next.config.ts` - OpenNext CloudFlare 适配器配置
- `worker.ts` - CloudFlare Worker 入口文件

## 注意事项

- 当前未配置测试框架
- 图片优化已配置支持 Unsplash、R2、Google 和 GitHub 头像
- TypeScript 严格模式已启用；生产构建时忽略构建错误
- 生产构建时忽略 ESLint 错误
