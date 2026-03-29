# CLAUDE.md

本文件为 Claude Code (claude.ai/code) 提供操作本代码仓库的指引。

## 项目概述

GoMate 是一个极简的「地点组队」平台，专注于深圳徒步场景，帮助户外爱好者通过结构化组队找到志同道合的徒步伙伴。

## 项目架构（pnpm Monorepo）

```
gomate/
├── api/          # 后端 - Hono 4 + Cloudflare Workers + Drizzle ORM
├── frontend/     # 前端 - Astro 4 + React 18 + Tailwind CSS 4
├── mobile/       # 移动端 - Flutter 3.24 + Riverpod 2.6
├── packages/
│   ├── types/    # 共享 TypeScript 类型 (@gomate/types)
│   └── config/   # 共享 tsconfig 配置 (@gomate/config)
├── package.json
└── pnpm-workspace.yaml
```

## 技术栈

### 后端（api/）
- **框架**: Hono 4 + Cloudflare Workers
- **ORM**: Drizzle ORM + SQLite 方言
- **数据库**: Cloudflare D1 (SQLite)
- **认证**: Better Auth 1.3（邮箱/密码）
- **文件存储**: Cloudflare R2
- **邮件**: Resend
- **验证**: Zod

### 前端（frontend/）
- **框架**: Astro 4.16（SSR 模式，Cloudflare 适配器）
- **UI**: React 18 + Tailwind CSS 4 + shadcn/ui
- **语言**: TypeScript 5（严格模式）
- **架构**: Astro 薄壳 + React Islands（client:load）

### 移动端（mobile/）
- **框架**: Flutter 3.24+
- **状态管理**: Riverpod 2.6
- **路由**: GoRouter 14
- **HTTP**: Dio 5.7

## 开发命令

```bash
# 安装依赖
pnpm install

# 同时启动 API 和前端
pnpm dev

# 单独启动
pnpm api:dev        # API: localhost:8799
pnpm web:dev        # Frontend: localhost:5432
cd mobile && flutter run

# 本地调试检查
# 启动本地调试前先检查是否已启动：
#   lsof -ti:8799    # 检查 API 端口 (8799)
#   lsof -ti:5432    # 检查前端端口 (5432)
# 如果端口已被占用，说明调试已启动，无需重复启动

# 构建
pnpm api:deploy     # 部署 API 到 Cloudflare Workers
pnpm web:build      # 构建前端

# 类型检查和 Lint
pnpm type-check
pnpm lint
```

## 测试账号

- 账号 1：`wujiahong2013@gmail.com`（管理员）密码：`11111111`
- 账号 2：`1427298682@qq.com`（管理员）密码：`11111111`
- 账号 3：`1427298683@qq.com`（普通用户）密码：`11111111`

## 架构说明

### 后端 API（api/src/）

```
api/src/
├── index.ts              # Worker 入口（11 个路由注册）
├── routes/
│   ├── auth.ts           # Better Auth 代理
│   ├── teams.ts          # 队伍管理（核心，~978 行）
│   ├── locations.ts      # 地点管理
│   ├── users.ts          # 用户信息
│   ├── hiking-routes.ts  # 路线管理
│   ├── upload.ts         # R2 文件上传
│   ├── favorites.ts      # 收藏功能
│   ├── cities.ts         # 城市列表
│   ├── tags.ts           # 标签列表
│   ├── contact.ts        # 联系表单
│   └── admin.ts          # 管理工具
├── middleware/
│   ├── cors.ts           # CORS 中间件
│   └── auth.ts           # 认证中间件
├── db/
│   ├── schema.ts         # Drizzle ORM schema（17 张表）
│   └── index.ts          # D1 数据库初始化
└── lib/
    ├── auth.ts           # Better Auth + Hono 适配
    ├── email.ts          # Resend 邮件服务
    ├── storage.ts        # R2 存储工具
    └── team-status.ts    # 队伍状态工具
```

### 前端（frontend/src/）

```
frontend/src/
├── pages/                # Astro 页面（SSR 壳）
│   ├── index.astro
│   ├── locations/[id].astro
│   ├── teams/[id].astro
│   ├── teams/create.astro
│   ├── my-teams/index.astro
│   ├── profile/index.astro
│   └── users/[id].astro
├── components/
│   ├── features/         # React Islands（client:load）
│   │   ├── home-client.tsx
│   │   ├── locations-client.tsx
│   │   ├── teams-client.tsx
│   │   ├── team-detail-client.tsx
│   │   ├── create-team-client.tsx
│   │   ├── my-teams-client.tsx
│   │   ├── profile-client.tsx
│   │   └── ...（共 13 个）
│   ├── layout/
│   │   ├── navbar.tsx
│   │   └── footer.tsx
│   └── ui/               # shadcn/ui 组件
├── layouts/
│   └── Layout.astro      # 主布局模板
└── lib/
    ├── api.ts            # fetch 封装（指向 API 服务）
    ├── auth-client.ts    # Better Auth 客户端
    ├── copy.ts           # 中文文案（Single Source of Truth）
    ├── types.ts          # 前端类型定义
    └── utils.ts          # 工具函数
```

**API 基地址配置：**
- 本地：`http://localhost:8799`
- 生产：通过环境变量 `PUBLIC_API_URL` 注入

### 数据库层（api/src/db/schema.ts）

17 张数据表，使用 Drizzle ORM + SQLite 方言：

| 表名 | 用途 |
|------|------|
| `users` | 用户账号（Better Auth 扩展：bio、level、nickname） |
| `sessions` | Better Auth 会话 |
| `accounts` | Better Auth 外部账户 |
| `verifications` | 邮件验证 |
| `cities` | 城市（行政级别、热门标记） |
| `locations` | 徒步地点（坐标、图片、季节） |
| `routes` | 徒步路线（难度、距离、时长、高程） |
| `tags` | 标签 |
| `entityToTags` | 标签关联（多对多） |
| `teams` | 队伍（状态、时间、人数限制） |
| `teamMembers` | 队伍成员（状态、加入时间） |
| `passwordResets` | 密码重置令牌 |
| `pois` | 兴趣点（地标、设施） |
| `entityToPois` | POI 关联（角色类型） |
| `userFavorites` | 用户收藏 |

**枚举类型（定义在 schema.ts 和 packages/types/src/enums.ts）：**
- `Difficulty`: `"easy"` | `"moderate"` | `"hard"` | `"expert"`
- `TeamStatus`: `"recruiting"` | `"full"` | `"formed"` | `"cancelled"` | `"completed"`
- `TeamMemberStatus`: `"pending"` | `"approved"` | `"rejected"` | `"leave_pending"`
- `UserRole`: `"user"` | `"admin"`
- `UserLevel`: `"beginner"` | `"intermediate"` | `"advanced"` | `"expert"`
- `PoiRoleType`: `"waypoint"` | `"checkpoint"` | `"viewpoint"` | `"facility"` | `"poi"`

**时间戳：** Unix 整数，配置为 `{ mode: "timestamp" }`。

**JSON 字段（以文本形式存储）：** `bestSeason`、`tags`、`images`、`waypoints`、`facilities`、`requirements`、`warnings`、`equipmentNeeded`。

### 认证系统（api/src/lib/auth.ts）

Better Auth 集成 Hono，支持双环境：
- **Cloudflare Workers**：通过 `drizzleAdapter` 使用 D1 数据库绑定
- **本地开发**：通过动态导入使用 `better-sqlite3`

## 本地开发与测试规范

### 本地 Cloudflare 环境模拟

本地开发通过 `wrangler dev` 模拟 Cloudflare Workers 环境：

- **D1 数据库**：数据存储在 `.wrangler/state/v3/d1/miniflare-D1DatabaseObject/*.sqlite`
- **R2 对象存储**：文件存储模拟在 `.wrangler/state/v3/r2/`

### 数据库操作规范

**直接查询本地 D1（调试用）：**
```bash
sqlite3 .wrangler/state/v3/d1/miniflare-D1DatabaseObject/*.sqlite "SELECT * FROM users;"
```

**数据库迁移（在 api/ 目录下）：**
```bash
npx drizzle-kit migrate
```

**Seed 数据（在 api/ 目录下）：**
```bash
node db/seed.ts
```

## 部署架构

```
生产环境（Cloudflare）：
  API Worker  → https://gomate-api-production.wujiahong2013.workers.dev
  Frontend    → https://gomate.live
  R2 公共 URL → https://gomate.cos.jiahongw.com

本地开发：
  API         → http://localhost:8799
  Frontend    → http://localhost:5432
```

**CI/CD（GitHub Actions）：**
- `api/**` 推送 main → 部署 API 到 Cloudflare Workers
- `frontend/**` 或 `packages/**` 推送 main → 部署前端到 Cloudflare Pages
- `mobile/**` 推送 main → 构建 Android APK + iOS IPA

## 关键约定

- 组件命名：PascalCase
- 函数/变量命名：camelCase
- 路径别名：`@/*` → `./src/*`（frontend 内）

## 中文文案管理规范

### copy.ts 架构

所有用户可见的中文字符串统一在 `frontend/src/lib/copy.ts` 中管理，作为 Single Source of Truth。

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
- 与 `api/src/db/schema.ts` 中的枚举定义保持一致

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

| 文件 | 用途 |
|------|------|
| `api/src/db/schema.ts` | 数据库模式和类型定义 |
| `api/src/lib/auth.ts` | Better Auth + Hono 配置 |
| `api/wrangler.toml` | Cloudflare Workers 配置（D1/R2/KV 绑定） |
| `api/drizzle.config.ts` | Drizzle ORM 配置 |
| `frontend/astro.config.mjs` | Astro + Cloudflare 适配器配置 |
| `frontend/src/lib/copy.ts` | 中文文案管理 |
| `frontend/src/lib/api.ts` | API 客户端封装 |
| `packages/types/src/index.ts` | 跨包共享 TypeScript 类型 |
| `packages/types/src/enums.ts` | 共享枚举定义 |
| `pnpm-workspace.yaml` | pnpm 工作区配置 |



## 文档维护规范

以下三个文档记录了项目的功能全貌，**每次新增或修改功能后必须同步更新对应文档**：

| 文档 | 路径 | 需要更新的场景 |
|------|------|--------------|
| 前端页面功能文档 | `docs/frontend-pages.md` | 新增/删除页面、新增/修改页面功能点、新增 UI 交互 |
| 后端 API 文档 | `docs/backend-api.md` | 新增/删除接口、修改请求参数或响应结构、修改认证要求 |
| 移动端模块文档 | `docs/mobile-modules.md` | 新增/删除页面或模块、修改路由、新增 API 调用、修改数据模型 |

**更新原则：**
- 新增功能：在对应文档的相应章节追加内容
- 删除功能：从文档中移除对应条目
- 修改功能：更新对应条目，保持文档与代码一致

## 开发建议
我默认打开了调试，你不需要执执行调试指令，除非我主动和你说。