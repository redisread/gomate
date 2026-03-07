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
- **认证**: Better Auth （邮箱/密码）
- **部署**: CloudFlare Workers/Pages（通过 OpenNext）
- **邮件**: Resend
- **w文件存储**: CloudFlare R2（图片上传）

## 开发参考

遵守使用 OpenNext 的最佳实践，可以参考 ：
- https://opennext.js.org/cloudflare/get-started
- https://developers.cloudflare.com/workers/framework-guides/web-apps/nextjs/

Cloudflare 适配器提供了一个 opennextjs-cloudflare 命令行界面 (CLI)，用于开发、构建和部署应用程序。除非另有文档说明或您清楚自己在做什么，否则不应直接使用 wrangler 命令。可以参考 https://opennext.js.org/cloudflare/cli


测试用户账号信息：
- 测试账号 1：
  账号：wujiahong2013@gmail.com （管理员）
  密码：11111111
- 测试账号 2：
  账号：1427298682@qq.com （管理员）
  密码：11111111
- 测试账号 3：
  账号：1427298683@qq.com （普通用户）
  密码：11111111


## 开发命令


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
BETTER_AUTH_URL=http://localhost:3000
```

D1 远程操作的可选变量：
```bash
CLOUDFLARE_ACCOUNT_ID=
CLOUDFLARE_DATABASE_ID=
CLOUDFLARE_D1_TOKEN=
RESEND_API_KEY=
```

## 本地开发与测试规范

### 本地 Cloudflare 环境模拟

本项目本地测试**直接使用 Cloudflare 的真实服务**（D1、R2 等），通过 OpenNext 的 Cloudflare 适配器在本地模拟 Workers 运行环境。

本地开发时，`npm run dev` 通过 `initOpenNextCloudflareForDev()` 自动模拟 Cloudflare 环境：

- **D1 数据库**：数据存储在 `.wrangler/state/v3/d1/miniflare-D1DatabaseObject/*.sqlite`
- **R2 对象存储**：文件存储模拟在 `.wrangler/state/v3/r2/`

### 数据库操作规范

**直接查询本地 D1（调试用）：**
```bash
sqlite3 .wrangler/state/v3/d1/miniflare-D1DatabaseObject/*.sqlite "SELECT * FROM users;"
```

**数据库迁移：**
- 迁移文件位于 `db/migrations/`
- 本地应用迁移通过 `npx opennextjs-cloudflare` 相关命令执行，避免直接使用 `wrangler` 命令
- 生产环境迁移需通过 Cloudflare Dashboard 或 CI/CD 流程执行

**Seed 数据：**
- Seed 脚本位于 `db/seed/`，入口为 `db/seed.ts`
- 包含地点（locations）、POI 和路线（routes）数据
- 执行 seed 前确保本地 D1 数据库已完成迁移

### R2 文件存储规范

- 本地开发时 R2 通过 miniflare 模拟，上传的文件存储在 `.wrangler/state/v3/r2/` 目录
- 图片上传通过 `app/api/upload/` 和 `app/api/r2/` 路由处理
- 生产环境文件存储在真实 Cloudflare R2 Bucket，需在 `wrangler.toml` 中配置 R2 绑定

## 关键约定

- 组件命名：PascalCase
- 函数/变量命名：camelCase
- 数据库枚举（定义在 schema.ts）：
  - `Difficulty`: "easy" | "moderate" | "hard" | "expert"
  - `TeamStatus`: "recruiting" | "full" | "ongoing" | "completed" | "cancelled"
  - `TeamMemberRole`: "leader" | "member"
  - `TeamMemberStatus`: "pending" | "approved" | "rejected"

## 中文文案管理规范

### copy.ts 架构

所有用户可见的中文字符串统一在 `lib/copy.ts` 中管理，作为 Single Source of Truth。

**文件结构：**
- 按功能域（feature）组织，最多 2 层嵌套（如 `copy.nav.home`）
- 枚举文案统一放在 `copy.enums`，与数据库枚举值一一对应
- 导出时使用 `as const` 确保类型推断精确

**主要章节：**
```typescript
copy.common      // 通用文案（加载中、返回、保存等）
copy.nav         // 导航栏
copy.auth        // 认证相关（登录、注册、重置密码）
copy.locations   // 地点相关
copy.teams       // 队伍相关
copy.myTeams     // 我的队伍页
copy.filter      // 筛选面板
copy.contact     // 联系我们
copy.email       // 邮件模板
copy.errors      // 错误消息
copy.success     // 成功消息
copy.api         // API 错误
copy.share       // 分享功能
copy.admin       // 管理后台
copy.ui          // UI 组件文案
copy.enums       // 枚举值映射（与数据库枚举对应）
```

### 使用规范

**1. 基本使用**
```typescript
import { copy } from "@/lib/copy";

// 直接引用
<button>{copy.auth.loginBtn}</button>

// 动态文案使用模板字符串
<span>{`共 ${count} ${copy.teams.teamCountSuffix}`}</span>
// 或使用 replace
copy.teams.openTeamsSubtitle.replace("{count}", String(count))
```

**2. 添加新文案**
- 在对应功能域下添加，保持层级不超过 2 层
- 键名使用 camelCase，语义化命名
- 避免重复：先搜索是否已有相同/类似文案

**3. 枚举文案**
- 所有枚举值的显示文案必须放在 `copy.enums` 下
- 与数据库 schema.ts 中的枚举定义保持一致

**4. 禁止事项**
- 禁止在组件中直接写硬编码中文字符串
- 禁止在 copy.ts 中使用 JSX
- 禁止超过 2 层嵌套

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
