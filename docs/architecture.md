# GoMate 项目架构文档

## 项目概述

GoMate 是一个基于 Next.js 全栈技术栈的极简「地点组队」平台，专注于深圳徒步场景，帮助户外爱好者通过结构化组队找到志同道合的徒步伙伴。

## 技术栈

- **框架**: Next.js 15.5 (App Router)
- **React**: 18.3.1
- **语言**: TypeScript 5 (严格模式)
- **样式**: Tailwind CSS v4
- **UI 组件**: shadcn/ui + Radix UI
- **数据库**: Cloudflare D1 (SQLite) + Drizzle ORM
- **认证**: Better Auth 1.3.0（邮箱/密码）
- **国际化**: next-intl
- **表单验证**: Zod
- **动画**: framer-motion
- **二维码**: qrcode.react
- **邮件**: Resend
- **部署**: Cloudflare Workers/Pages（通过 OpenNext）
- **文件存储**: Cloudflare R2

## 目录结构

```
gomate/
├── app/                              # Next.js App Router
│   ├── actions/                      # Server Actions (8个文件)
│   │   ├── cities.ts                 # 城市相关操作
│   │   ├── locations.ts              # 地点相关操作
│   │   ├── pois.ts                   # POI 相关操作
│   │   ├── routes.ts                 # 路线相关操作
│   │   ├── tags.ts                   # 标签相关操作
│   │   ├── teams.ts                  # 队伍相关操作
│   │   ├── users.ts                  # 用户相关操作
│   │   └── index.ts                  # 统一导出
│   ├── admin/                        # 后台管理
│   │   ├── layout.tsx
│   │   └── locations/page.tsx        # 地点管理页
│   ├── api/                          # API 路由（共43个）
│   │   ├── auth/
│   │   │   ├── [...all]/route.ts     # Better Auth 处理器
│   │   │   ├── forgot-password/route.ts
│   │   │   └── reset-password/route.ts
│   │   ├── locations/
│   │   │   ├── route.ts              # 地点列表
│   │   │   └── [id]/
│   │   │       ├── route.ts          # 地点详情
│   │   │       ├── favorite/route.ts # 收藏地点
│   │   │       └── pois/route.ts     # 地点 POI
│   │   ├── teams/
│   │   │   ├── route.ts              # 队伍列表
│   │   │   ├── join/route.ts         # 加入队伍
│   │   │   └── [id]/
│   │   │       ├── route.ts          # 队伍详情/更新/删除
│   │   │       ├── applications/route.ts
│   │   │       ├── cancel-application/route.ts
│   │   │       ├── form/route.ts
│   │   │       ├── leave/route.ts
│   │   │       ├── leave-request/route.ts
│   │   │       ├── my-status/route.ts
│   │   │       └── members/[userId]/
│   │   │           ├── approve/route.ts
│   │   │           ├── approve-leave/route.ts
│   │   │           ├── reject/route.ts
│   │   │           ├── reject-leave/route.ts
│   │   │           └── remove/route.ts
│   │   ├── routes/
│   │   │   ├── route.ts              # 路线列表
│   │   │   └── [id]/route.ts         # 路线详情
│   │   ├── pois/
│   │   │   ├── route.ts              # POI 列表
│   │   │   └── [id]/route.ts         # POI 详情
│   │   ├── user/
│   │   │   ├── route.ts              # 当前用户信息
│   │   │   ├── update/route.ts       # 更新用户信息
│   │   │   ├── applications/route.ts # 我的申请
│   │   │   ├── created-teams/route.ts
│   │   │   └── pending-approvals/route.ts
│   │   ├── users/[id]/route.ts       # 公开用户信息
│   │   ├── cities/route.ts           # 城市列表
│   │   ├── tags/route.ts             # 标签列表
│   │   ├── favorites/route.ts        # 收藏列表
│   │   ├── entity-pois/route.ts      # 实体-POI 关联
│   │   ├── upload/
│   │   │   ├── avatar/route.ts       # 上传头像
│   │   │   └── location/route.ts     # 上传地点图片
│   │   ├── r2/[...path]/route.ts     # R2 文件访问
│   │   ├── contact/route.ts          # 联系表单
│   │   ├── admin/clear-rate-limit/route.ts
│   │   ├── locations-debug/route.ts  # 调试接口
│   │   └── locations-log/route.ts    # 日志接口
│   ├── components/                   # 应用专属组件
│   │   ├── features/                 # 功能组件
│   │   ├── layout/                   # 布局组件 (Navbar, Footer)
│   │   ├── ui/                       # UI 基础组件
│   │   └── providers.tsx             # 全局 Provider
│   ├── about/page.tsx                # 关于页
│   ├── contact/page.tsx              # 联系页
│   ├── favorites/page.tsx            # 收藏页
│   ├── forgot-password/page.tsx      # 忘记密码
│   ├── locations/
│   │   ├── page.tsx                  # 地点列表
│   │   └── [id]/page.tsx             # 地点详情
│   ├── login/page.tsx                # 登录页
│   ├── my-teams/page.tsx             # 我的队伍
│   ├── privacy/page.tsx              # 隐私政策
│   ├── profile/
│   │   ├── page.tsx                  # 个人主页
│   │   └── edit/page.tsx             # 编辑资料
│   ├── register/page.tsx             # 注册页
│   ├── reset-password/page.tsx       # 重置密码
│   ├── routes/[id]/page.tsx          # 路线详情
│   ├── teams/
│   │   ├── page.tsx                  # 队伍列表
│   │   ├── create/page.tsx           # 创建队伍
│   │   └── [id]/
│   │       ├── page.tsx              # 队伍详情
│   │       └── edit/page.tsx         # 编辑队伍
│   ├── terms/page.tsx                # 服务条款
│   ├── users/[id]/page.tsx           # 用户主页
│   ├── globals.css                   # 全局样式
│   ├── layout.tsx                    # 根布局
│   └── page.tsx                      # 首页
├── components/                       # 全局共享组件
│   └── ui/                           # shadcn/ui 组件
├── lib/                              # 工具函数和业务逻辑
│   ├── auth.ts                       # Better Auth 配置（双环境）
│   ├── auth-client.ts                # 客户端认证工具
│   ├── auth-context.tsx              # 认证 Context
│   ├── rate-limit.ts                 # 限流工具
│   ├── storage.ts                    # R2 存储工具
│   ├── email.ts / email/resend.ts    # 邮件发送
│   ├── api-client.ts                 # API 客户端
│   ├── map-utils.ts                  # 地图工具
│   ├── poi-types.ts                  # POI 类型定义
│   ├── user-extra.ts                 # 用户扩展字段类型
│   ├── route-extra.ts                # 路线扩展字段类型
│   ├── team-data.ts / team-display.ts / team-status.ts  # 队伍工具
│   ├── hooks/use-favorite.ts         # 收藏 Hook
│   ├── constants.ts / constants/     # 常量定义
│   └── utils.ts                      # 通用工具函数
├── db/                               # 数据库相关
│   ├── schema.ts                     # Drizzle 表定义（15张表）
│   ├── migrations/                   # 数据库迁移文件
│   └── seed/                         # Seed 数据脚本
├── emails/                           # 邮件模板（React Email）
│   ├── welcome-email.tsx
│   ├── verification-email.tsx
│   ├── team-application-email.tsx
│   ├── team-success-email.tsx
│   └── application-result-email.tsx
├── scripts/                          # 构建补丁脚本
│   ├── patch-init.js
│   └── patch-nextjs-source.js
├── content/                          # MDX 内容
├── docs/                             # 项目文档
├── public/                           # 静态资源
├── wrangler.toml                     # Cloudflare Workers 配置
├── open-next.config.ts               # OpenNext 适配器配置
└── worker.ts                         # Cloudflare Worker 入口
```

## 路由设计

### 公开页面

| 路径 | 说明 |
|------|------|
| `/` | 首页（地点列表 + 热门队伍） |
| `/locations` | 地点列表（搜索/筛选） |
| `/locations/[id]` | 地点详情（路线、队伍） |
| `/routes/[id]` | 路线详情 |
| `/teams` | 队伍列表 |
| `/teams/[id]` | 队伍详情 |
| `/users/[id]` | 用户公开主页 |
| `/about` | 关于页 |
| `/contact` | 联系页 |
| `/terms` | 服务条款 |
| `/privacy` | 隐私政策 |

### 认证页面

| 路径 | 说明 |
|------|------|
| `/login` | 登录 |
| `/register` | 注册 |
| `/forgot-password` | 忘记密码 |
| `/reset-password` | 重置密码 |

### 登录后页面

| 路径 | 说明 |
|------|------|
| `/profile` | 个人主页 |
| `/profile/edit` | 编辑个人资料 |
| `/my-teams` | 我的队伍 |
| `/favorites` | 我的收藏 |
| `/teams/create` | 创建队伍 |
| `/teams/[id]/edit` | 编辑队伍 |

### 后台管理

| 路径 | 说明 |
|------|------|
| `/admin/locations` | 地点管理 |

## API 路由

### 认证 (4)
- `GET/POST /api/auth/[...all]` — Better Auth 统一入口
- `POST /api/auth/forgot-password` — 发送密码重置邮件
- `POST /api/auth/reset-password` — 重置密码

### 地点 (4)
- `GET /api/locations` — 地点列表（支持搜索/分页/筛选）
- `GET /api/locations/[id]` — 地点详情
- `POST /api/locations/[id]/favorite` — 收藏/取消收藏地点
- `GET /api/locations/[id]/pois` — 地点 POI 列表

### 队伍 (14)
- `GET/POST /api/teams` — 队伍列表/创建队伍
- `GET/PUT/DELETE /api/teams/[id]` — 队伍详情/更新/删除
- `POST /api/teams/join` — 申请加入队伍
- `GET /api/teams/[id]/applications` — 待审核申请列表
- `POST /api/teams/[id]/cancel-application` — 取消申请
- `GET /api/teams/[id]/form` — 队伍表单数据
- `POST /api/teams/[id]/leave` — 退出队伍
- `POST /api/teams/[id]/leave-request` — 申请退出（需审批）
- `GET /api/teams/[id]/my-status` — 当前用户在队伍中的状态
- `POST /api/teams/[id]/members/[userId]/approve` — 审批加入申请
- `POST /api/teams/[id]/members/[userId]/reject` — 拒绝加入申请
- `POST /api/teams/[id]/members/[userId]/approve-leave` — 审批退出申请
- `POST /api/teams/[id]/members/[userId]/reject-leave` — 拒绝退出申请
- `DELETE /api/teams/[id]/members/[userId]/remove` — 移除成员

### 路线 (2)
- `GET /api/routes` — 路线列表
- `GET /api/routes/[id]` — 路线详情

### POI (2)
- `GET /api/pois` — POI 列表
- `GET /api/pois/[id]` — POI 详情

### 用户 (6)
- `GET /api/user` — 当前登录用户信息
- `PUT /api/user/update` — 更新用户资料
- `GET /api/user/applications` — 我的加入申请
- `GET /api/user/created-teams` — 我创建的队伍
- `GET /api/user/pending-approvals` — 待我审批的申请
- `GET /api/users/[id]` — 公开用户信息

### 其他 (11)
- `GET /api/cities` — 城市列表
- `GET /api/tags` — 标签列表
- `GET /api/favorites` — 我的收藏列表
- `GET /api/entity-pois` — 实体-POI 关联查询
- `POST /api/upload/avatar` — 上传用户头像
- `POST /api/upload/location` — 上传地点图片
- `GET /api/r2/[...path]` — R2 文件访问代理
- `POST /api/contact` — 联系表单提交
- `POST /api/admin/clear-rate-limit` — 清除限流记录

## 数据库设计

### 表结构（共 15 张表）

#### Better Auth 表
| 表名 | 说明 |
|------|------|
| `users` | 用户账号（扩展字段：bio、level、gender、wechat 等） |
| `sessions` | 登录会话 |
| `accounts` | 第三方账号绑定 |
| `verifications` | 邮箱验证码 |

#### 核心业务表
| 表名 | 说明 |
|------|------|
| `cities` | 城市信息（含高德行政区划代码） |
| `locations` | 徒步地点（含坐标、封面、城市关联） |
| `routes` | 徒步路线（含难度、距离、爬升等） |
| `tags` | 标签（location/route/activity 类型） |
| `entity_to_tags` | 实体-标签多对多关联 |
| `teams` | 徒步队伍（关联地点和路线） |
| `team_members` | 队伍成员（含审批状态） |

#### 扩展功能表
| 表名 | 说明 |
|------|------|
| `pois` | 物理兴趣点（山峰、瀑布、停车场等） |
| `entity_to_pois` | 实体-POI 角色关联（支持路线途径点、地点设施等） |
| `user_favorites` | 用户收藏（支持地点、路线） |
| `password_resets` | 密码重置令牌 |

### 关系图

```
cities (1) ──< (N) locations (1) ──< (N) teams (N) >── (1) users
                    │                       │
                    └──< (N) routes ──────< (N) team_members (N) >── (1) users
                    │
                    └── entity_to_tags (N) >── (1) tags
                    └── entity_to_pois (N) >── (1) pois
```

### 枚举类型

```typescript
type Difficulty = "easy" | "moderate" | "hard" | "expert"
type TeamStatus = "recruiting" | "full" | "formed" | "completed" | "cancelled"
type TeamMemberStatus = "pending" | "approved" | "rejected" | "leave_pending"
type UserRole = "user" | "admin"
type UserLevel = "beginner" | "intermediate" | "advanced" | "expert"
type UserStatus = "active" | "suspended" | "banned" | "deleted"
type TagType = "location" | "route" | "activity"
```

## 数据流设计

### Server Actions 组织

```
app/actions/
├── cities.ts       # 城市相关操作
├── locations.ts    # 地点相关操作
├── pois.ts         # POI 相关操作
├── routes.ts       # 路线相关操作
├── tags.ts         # 标签相关操作
├── teams.ts        # 队伍相关操作
├── users.ts        # 用户相关操作
└── index.ts        # 统一导出
```

### 数据获取模式

1. **页面级数据**: 使用 `async/await` 在 Server Component 中直接获取
2. **交互数据**: 使用 Server Actions 处理 mutations
3. **客户端请求**: 通过 `lib/api-client.ts` 调用 API 路由
4. **数据刷新**: 使用 `revalidatePath` 或 `revalidateTag`

## 认证方案

使用 Better Auth 1.3.0：
- **登录方式**: 邮箱/密码
- **双环境支持**: Cloudflare Workers（D1）+ 本地开发（better-sqlite3）
- **会话缓存**: Cloudflare KV（`GOMATE_KV` 绑定）
- **邮件钩子**: 密码重置邮件、欢迎邮件（通过 Resend 发送）
- `createAuth(env?)` 函数检测运行环境并返回相应配置
- 默认导出的 `auth` 是一个 Proxy，用于延迟初始化

## 状态管理

### 服务端状态
- 使用 Server Actions 直接操作数据库
- 使用 `cache` 函数缓存数据获取

### 客户端状态
- 使用 React `useState` 管理表单状态
- 使用 `useTransition` 处理 pending 状态
- Context：`auth-context.tsx`、`locations-context.tsx`、`teams-context.tsx`、`mobile-menu-context.tsx`

## Cloudflare 部署配置

### wrangler.toml 绑定

| 绑定名 | 类型 | 用途 |
|--------|------|------|
| `DB` | D1 | 主数据库（gomate-db） |
| `R2` | R2 | 应用文件存储（图片、头像） |
| `NEXT_INC_CACHE_R2_BUCKET` | R2 | Next.js ISR 增量缓存 |
| `GOMATE_KV` | KV | 会话缓存 |
| `IMAGES` | Images | Cloudflare 图片优化 |
| `GOMATE_ANALYTICS` | Analytics Engine | 访问统计 |
| `ASSETS` | Assets | 静态资源 |
| `WORKER_SELF_REFERENCE` | Service | ISR 自引用 |

### OpenNext 配置

```ts
// open-next.config.ts
// 使用 r2IncrementalCache 作为 ISR 缓存后端
```

### 构建与部署命令

```bash
# 本地开发
npm run dev

# 构建（含 prebuild/postbuild 补丁脚本）
npm run build

# 部署
npx opennextjs-cloudflare deploy
```

## 性能优化

1. **图片**: 使用 Next.js Image 组件 + Cloudflare Images 优化
2. **字体**: 使用 next/font
3. **代码分割**: 使用动态导入
4. **数据缓存**: React `cache` + Next.js ISR（R2 后端）
5. **会话缓存**: Cloudflare KV

## 开发规范

### 文件命名
- 组件: PascalCase (e.g., `TeamCard.tsx`)
- 工具函数: camelCase (e.g., `formatDate.ts`)
- 页面: `page.tsx`、`layout.tsx`（Next.js 约定）

### 导入顺序
1. React/Next.js 内置
2. 第三方库
3. 内部模块 (`@/components`, `@/lib`)
4. 相对路径导入
5. 样式文件

### 类型定义
- 优先使用 `interface` 定义对象类型
- 使用 `type` 定义联合类型和工具类型
- 所有函数参数和返回值必须标注类型

## 环境变量

```bash
# Better Auth（必需）
BETTER_AUTH_SECRET=""      # 至少 32 位随机字符串
BETTER_AUTH_URL=""         # 应用 URL（本地：http://localhost:3000）

# Cloudflare D1 远程操作（可选，用于迁移脚本）
CLOUDFLARE_ACCOUNT_ID=""
CLOUDFLARE_DATABASE_ID=""
CLOUDFLARE_D1_TOKEN=""

# 邮件服务（可选）
RESEND_API_KEY=""

# wrangler.toml 中的环境变量（自动注入）
R2_PUBLIC_URL=""           # R2 公共访问 URL
RESEND_FROM_EMAIL=""       # 发件人地址
NEXT_PUBLIC_APP_URL=""     # 应用公开 URL
```

## 后续扩展点

- 私聊系统（Server-Sent Events 或 WebSocket）
- 更多城市和活动类型支持
- 活动动态流（ISR 或流式传输）
- 支付集成
- 移动端 App（React Native）
