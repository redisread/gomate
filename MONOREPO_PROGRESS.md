# GoMate Monorepo 拆分进度记录

> 记录时间：2026-03-19

## 概述

将原有 Next.js 单体项目拆分为 monorepo 架构，使用 pnpm workspace 统一管理。原有 Next.js 代码**完整保留**，新结构与旧代码并存，便于逐步迁移。

## 完成状态

| 子项目 | 技术栈 | 状态 | 本地端口 |
|--------|--------|------|----------|
| 根目录（原 Next.js） | Next.js 15.5 + Cloudflare | ✅ 保留完整 | 3000 |
| `api/` 后端 | Hono + Cloudflare Worker | ✅ 完成 | 8787 |
| `frontend/` Web 前端 | Astro 4 + React Islands | ✅ 完成 | 4321 |
| `mobile/` 移动端 | Flutter (iOS/Android) | ✅ 完成 | - |
| `packages/types/` | TypeScript + Zod | ✅ 完成 | - |
| `packages/config/` | tsconfig 共享 | ✅ 完成 | - |
| `.github/workflows/` | GitHub Actions CI/CD | ✅ 完成 | - |

---

## 目录结构

```
gomate/
├── app/                        # 原 Next.js App Router（保留）
├── components/                 # 原 React 组件（保留）
├── lib/                        # 原工具库（保留）
├── db/                         # 原数据库层（保留）
│
├── api/                        # 新：Hono + Cloudflare Worker 后端
│   ├── src/
│   │   ├── index.ts            # 主入口，注册所有路由
│   │   ├── routes/             # 11 个路由文件
│   │   │   ├── auth.ts         # Better Auth 代理
│   │   │   ├── teams.ts        # 队伍管理（16 个端点）
│   │   │   ├── locations.ts    # 地点管理
│   │   │   ├── users.ts        # 用户信息
│   │   │   ├── upload.ts       # R2 文件上传
│   │   │   ├── hiking-routes.ts # 路线管理
│   │   │   ├── favorites.ts    # 收藏
│   │   │   ├── cities.ts       # 城市列表
│   │   │   ├── tags.ts         # 标签列表
│   │   │   ├── contact.ts      # 联系表单
│   │   │   └── admin.ts        # 管理工具
│   │   ├── db/
│   │   │   ├── schema.ts       # Drizzle schema（从 db/schema.ts 迁移）
│   │   │   └── index.ts        # D1 数据库初始化
│   │   ├── lib/
│   │   │   ├── auth.ts         # Better Auth + Hono 适配
│   │   │   ├── email.ts        # Resend 邮件服务
│   │   │   ├── storage.ts      # R2 存储工具
│   │   │   └── team-status.ts  # 队伍状态工具
│   │   └── middleware/
│   │       ├── auth.ts         # 认证中间件
│   │       └── cors.ts         # CORS（允许 localhost:3000/4321 和生产域名）
│   ├── package.json            # @gomate/api
│   ├── tsconfig.json
│   └── wrangler.toml           # D1/R2/KV 绑定配置
│
├── frontend/                   # 新：Astro 4 + React Islands Web 前端
│   ├── src/
│   │   ├── pages/              # 12 个 Astro 页面（薄壳）
│   │   │   ├── index.astro     # 首页
│   │   │   ├── login.astro
│   │   │   ├── register.astro
│   │   │   ├── forgot-password.astro
│   │   │   ├── locations/
│   │   │   │   ├── index.astro
│   │   │   │   └── [id].astro
│   │   │   ├── teams/
│   │   │   │   ├── index.astro
│   │   │   │   ├── [id].astro
│   │   │   │   └── create.astro
│   │   │   ├── my-teams/index.astro
│   │   │   ├── profile/
│   │   │   │   ├── index.astro
│   │   │   │   └── edit.astro
│   │   │   └── users/[id].astro
│   │   ├── components/
│   │   │   ├── features/       # 13 个 React Islands（client:load）
│   │   │   │   ├── home-client.tsx
│   │   │   │   ├── login-client.tsx
│   │   │   │   ├── register-client.tsx
│   │   │   │   ├── forgot-password-client.tsx
│   │   │   │   ├── locations-client.tsx
│   │   │   │   ├── location-detail-client.tsx
│   │   │   │   ├── teams-client.tsx
│   │   │   │   ├── team-detail-client.tsx
│   │   │   │   ├── create-team-client.tsx
│   │   │   │   ├── my-teams-client.tsx
│   │   │   │   ├── profile-client.tsx
│   │   │   │   ├── profile-edit-client.tsx
│   │   │   │   └── user-detail-client.tsx
│   │   │   └── layout/
│   │   │       ├── navbar.tsx  # 含滚动监听、移动端抽屉、登录/退出
│   │   │       └── footer.tsx
│   │   ├── layouts/
│   │   │   └── Layout.astro    # 主布局
│   │   ├── lib/
│   │   │   ├── api.ts          # fetch 封装，指向 api/ 后端
│   │   │   ├── auth-client.ts  # Better Auth 客户端
│   │   │   ├── copy.ts         # 中文文案（从 lib/copy.ts 迁移）
│   │   │   ├── types.ts        # 前端类型
│   │   │   └── utils.ts        # 工具函数
│   │   └── styles/
│   │       └── globals.css     # Tailwind v4 全局样式
│   ├── astro.config.mjs        # Astro 配置（React + @tailwindcss/vite + Cloudflare）
│   ├── package.json            # @gomate/frontend
│   ├── tailwind.config.ts
│   └── tsconfig.json
│
├── mobile/                     # 新：Flutter iOS/Android 移动端
│   ├── lib/
│   │   ├── main.dart           # 应用入口（Riverpod + flutter_dotenv）
│   │   ├── app.dart            # GoRouter 路由（9 个路由）+ 主题
│   │   ├── core/
│   │   │   ├── api/
│   │   │   │   ├── api_client.dart      # Dio HTTP 客户端
│   │   │   │   ├── auth_api.dart        # 认证 API
│   │   │   │   ├── teams_api.dart       # 队伍 API
│   │   │   │   └── locations_api.dart   # 地点 API
│   │   │   ├── models/
│   │   │   │   ├── user.dart
│   │   │   │   ├── team.dart
│   │   │   │   ├── location.dart
│   │   │   │   └── route.dart
│   │   │   ├── services/
│   │   │   │   └── auth_service.dart    # flutter_secure_storage
│   │   │   └── constants/
│   │   │       └── api_constants.dart   # API 端点常量
│   │   ├── features/
│   │   │   ├── auth/screens/            # login, register
│   │   │   ├── home/screens/            # home
│   │   │   ├── locations/screens/       # list, detail
│   │   │   ├── teams/screens/           # list, detail, create
│   │   │   └── profile/screens/         # profile
│   │   └── shared/theme/
│   │       └── app_theme.dart           # 主题（主色 #16A34A）
│   ├── pubspec.yaml            # Flutter 依赖
│   └── .env.example
│
├── packages/
│   ├── types/                  # @gomate/types 共享类型
│   │   └── src/
│   │       ├── index.ts        # Location/Team/Route/TeamMember/UserPublicProfile 等
│   │       └── enums.ts        # 11 个枚举（Difficulty/TeamStatus/UserLevel 等）
│   └── config/                 # @gomate/config 共享配置
│       └── tsconfig/
│           ├── base.json       # 基础 TypeScript 配置
│           └── cloudflare.json # Cloudflare Workers 扩展
│
├── .github/workflows/
│   ├── api-deploy.yml          # push main → wrangler deploy
│   ├── frontend-deploy.yml     # push main → Cloudflare Pages
│   └── mobile-build.yml        # Flutter Android + iOS 构建
│
├── pnpm-workspace.yaml         # workspace: api/frontend/mobile/packages/*
├── .npmrc                      # pnpm 配置
└── package.json                # 根配置（保留 Next.js 依赖 + 新增 workspace 脚本）
```

---

## 开发命令

```bash
# 原 Next.js（现有功能，推荐日常开发）
npm run dev                    # http://localhost:3000

# 新后端 API（Hono Worker）
pnpm api:dev                   # http://localhost:8787

# 新 Web 前端（Astro）
pnpm web:dev                   # http://localhost:4321

# 移动端（需安装 Flutter SDK）
cd mobile && flutter run
```

---

## 注意事项

### 已知问题 / 待处理

1. **`api/src/middleware/auth.ts`** 有 3 个 TypeScript Variables 泛型警告，不影响运行，待后续优化
2. **Astro 版本**：frontend/ 使用 Astro 4.16，可升级到 Astro 6（`pnpm dlx @astrojs/upgrade`）
3. **数据库迁移**：`api/` 的 `wrangler.toml` 指向同一个本地 D1 数据库，与原 Next.js 共享数据

### 架构说明

- **Astro 页面模式**：`.astro` 文件作为薄壳，交互逻辑封装在 React Islands（`client:load`）
- **API 调用**：frontend/ 通过 `fetchAPI()` 调用 `api/`，不直接访问数据库
- **认证**：frontend/ 和 api/ 均使用 Better Auth，共享 session cookie
- **Tailwind**：frontend/ 使用 `@tailwindcss/vite`（v4 方式），而非已废弃的 `@astrojs/tailwind`

### 迁移路径建议

```
阶段 1（当前）：原 Next.js 继续运行，新 api/ + frontend/ 并行开发
阶段 2：将 api/ 部署为独立 Worker，前端逐步切换到 api/
阶段 3：frontend/ 完成后替换原 Next.js，关闭旧项目
```
