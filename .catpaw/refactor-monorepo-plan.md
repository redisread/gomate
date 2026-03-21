# GoMate Monorepo 拆分计划

> 文档创建时间：2026-03-19
> 当前分支：feat/refactor-split
> 目标：将 GoMate 从 Next.js 全栈单体应用拆分为 Monorepo 架构

---

## 团队角色分工

### 成员 1 — 架构师 / 项目负责人（Alex）
**职责：**
- 设计并搭建 Monorepo 骨架（pnpm workspace）
- 制定各包之间的依赖关系和接口规范
- 建立共享包 `packages/types`（Zod schema + TypeScript 类型）
- 建立共享包 `packages/config`（ESLint、TypeScript 基础配置）
- 设计 API 契约（OpenAPI spec 或 Zod 共享类型）
- 协调各端联调和集成测试

**交付物：**
- `package.json`（根 workspace 配置）
- `packages/types/` — 共享类型和 Zod schema
- `packages/config/` — 共享 ESLint/TS 配置
- `ARCHITECTURE.md` — 架构决策记录

---

### 成员 2 — 后端工程师（Backend / Ben）
**职责：**
- 搭建 `api/` Hono + Cloudflare Worker 后端
- 迁移所有 Next.js API Routes → Hono 路由
- 迁移 `db/schema.ts` 和 Drizzle ORM 配置
- 迁移 Better Auth 认证系统
- 配置 `api/wrangler.toml`（D1、R2、KV 绑定）
- 编写 API 单元测试

**交付物：**
- `api/` 完整后端服务
- `api/src/routes/` 所有路由迁移
- `api/src/db/` 数据库层
- `api/wrangler.toml`

---

### 成员 3 — Web 前端工程师（Frontend / Fiona）
**职责：**
- 搭建 `frontend/` Astro 6 + React Islands 前端
- 迁移所有页面组件（locations、teams、users、profile 等）
- 迁移 `components/` 可复用组件库
- 迁移 `lib/copy.ts` 文案管理
- 对接 `api/` 后端接口（替换 Server Actions）
- 配置 Cloudflare Pages 部署

**交付物：**
- `frontend/` 完整 Web 前端
- `frontend/src/components/` 组件迁移
- `frontend/src/lib/api.ts` API 客户端封装
- `frontend/astro.config.mjs`

---

### 成员 4 — 移动端工程师（Mobile / Ming）
**职责：**
- 搭建 `mobile/` Flutter 项目（iOS + Android）
- 实现核心页面：首页、地点列表/详情、队伍列表/详情
- 实现认证流程（登录/注册/找回密码）
- 实现用户中心（我的队伍、收藏、资料编辑）
- 对接 `api/` 后端接口
- 配置 CI/CD（GitHub Actions）

**交付物：**
- `mobile/` Flutter 项目
- `mobile/lib/screens/` 所有页面
- `mobile/lib/services/api_service.dart` API 封装
- iOS 和 Android 构建配置

---

### 成员 5 — DevOps / 全栈支援（DevOps / Dana）
**职责：**
- 配置 GitHub Actions CI/CD 流水线
- 配置各子包的独立部署流程
- 迁移并维护数据库迁移脚本
- 配置环境变量管理（`.env` 体系）
- 搭建本地开发联调环境
- 编写开发文档和 README

**交付物：**
- `.github/workflows/` CI/CD 配置
- 根目录 `README.md` 和各子包文档
- 本地开发一键启动脚本
- 环境变量模板和文档

---

## 目标项目结构

```
gomate/                            # Monorepo 根目录
├── package.json                   # pnpm workspace 配置
├── pnpm-workspace.yaml            # workspace 包声明
├── .npmrc                         # pnpm 配置
├── turbo.json                     # Turborepo 构建缓存（可选）
├── .github/
│   └── workflows/
│       ├── api-deploy.yml         # 后端自动部署
│       ├── frontend-deploy.yml    # Web 前端自动部署
│       ├── mobile-build.yml       # 移动端构建
│       └── test.yml               # 全局测试
│
├── api/                           # 后端：Hono + Cloudflare Worker
│   ├── src/
│   │   ├── index.ts               # Hono 主入口
│   │   ├── routes/
│   │   │   ├── auth.ts            # 认证路由（Better Auth）
│   │   │   ├── locations.ts       # 地点 API
│   │   │   ├── teams.ts           # 队伍 API
│   │   │   ├── users.ts           # 用户 API
│   │   │   ├── cities.ts          # 城市 API
│   │   │   ├── tags.ts            # 标签 API
│   │   │   ├── pois.ts            # POI API
│   │   │   ├── favorites.ts       # 收藏 API
│   │   │   ├── upload.ts          # 文件上传
│   │   │   └── contact.ts         # 联系表单
│   │   ├── middleware/
│   │   │   ├── auth.ts            # 认证中间件
│   │   │   ├── cors.ts            # CORS 配置
│   │   │   └── rate-limit.ts      # 速率限制
│   │   ├── db/
│   │   │   ├── schema.ts          # Drizzle ORM schema（从 db/ 迁移）
│   │   │   ├── index.ts           # 数据库连接工厂
│   │   │   └── migrations/        # 迁移文件
│   │   ├── lib/
│   │   │   ├── auth.ts            # Better Auth 配置
│   │   │   ├── email.ts           # 邮件服务（Resend）
│   │   │   ├── storage.ts         # R2 存储工具
│   │   │   └── team-status.ts     # 队伍状态管理
│   │   └── types.ts               # 后端内部类型
│   ├── wrangler.toml              # Cloudflare 绑定配置
│   ├── drizzle.config.ts
│   ├── package.json
│   └── tsconfig.json
│
├── frontend/                      # Web 前端：Astro 6 + React Islands
│   ├── src/
│   │   ├── pages/                 # Astro 页面（SSR/SSG）
│   │   │   ├── index.astro        # 首页
│   │   │   ├── locations/
│   │   │   │   ├── index.astro    # 地点列表
│   │   │   │   └── [id].astro     # 地点详情
│   │   │   ├── teams/
│   │   │   │   ├── index.astro    # 队伍列表
│   │   │   │   └── [id].astro     # 队伍详情
│   │   │   ├── users/[id].astro   # 用户资料
│   │   │   ├── my-teams.astro     # 我的队伍（需认证）
│   │   │   ├── favorites.astro    # 我的收藏（需认证）
│   │   │   ├── profile/
│   │   │   │   ├── index.astro
│   │   │   │   └── edit.astro
│   │   │   ├── login.astro
│   │   │   ├── register.astro
│   │   │   ├── forgot-password.astro
│   │   │   ├── admin/             # 管理后台
│   │   │   └── (static pages)     # about, contact, privacy, terms
│   │   ├── components/
│   │   │   ├── ui/                # shadcn/ui 组件（从 components/ui/ 迁移）
│   │   │   ├── features/          # 业务组件（从 components/features/ 迁移）
│   │   │   └── layout/            # 布局组件（Navbar、Footer）
│   │   ├── islands/               # React Islands（交互式组件）
│   │   │   ├── TeamList.tsx       # 队伍列表（带筛选）
│   │   │   ├── JoinButton.tsx     # 加入队伍按钮
│   │   │   ├── AuthForms.tsx      # 登录/注册表单
│   │   │   ├── ProfileEdit.tsx    # 资料编辑
│   │   │   └── ShareDialog.tsx    # 分享对话框
│   │   ├── lib/
│   │   │   ├── api.ts             # API 客户端（fetch wrapper）
│   │   │   ├── auth-client.ts     # Better Auth 客户端
│   │   │   ├── copy.ts            # 中文文案（从 lib/copy.ts 迁移）
│   │   │   └── utils.ts
│   │   └── styles/
│   │       └── global.css         # Tailwind CSS v4 全局样式
│   ├── public/                    # 静态资源
│   ├── astro.config.mjs
│   ├── tailwind.config.mjs
│   ├── package.json
│   └── tsconfig.json
│
├── mobile/                        # 移动端：Flutter
│   ├── lib/
│   │   ├── main.dart              # 入口
│   │   ├── app.dart               # 路由和主题配置
│   │   ├── screens/               # 页面
│   │   │   ├── home/
│   │   │   ├── locations/
│   │   │   │   ├── location_list_screen.dart
│   │   │   │   └── location_detail_screen.dart
│   │   │   ├── teams/
│   │   │   │   ├── team_list_screen.dart
│   │   │   │   └── team_detail_screen.dart
│   │   │   ├── auth/
│   │   │   │   ├── login_screen.dart
│   │   │   │   ├── register_screen.dart
│   │   │   │   └── forgot_password_screen.dart
│   │   │   ├── profile/
│   │   │   │   ├── profile_screen.dart
│   │   │   │   └── edit_profile_screen.dart
│   │   │   └── my_teams/
│   │   ├── widgets/               # 可复用 Widget
│   │   │   ├── location_card.dart
│   │   │   ├── team_card.dart
│   │   │   ├── difficulty_badge.dart
│   │   │   └── loading_widget.dart
│   │   ├── models/                # 数据模型（与 packages/types 对应）
│   │   │   ├── location.dart
│   │   │   ├── team.dart
│   │   │   ├── user.dart
│   │   │   └── city.dart
│   │   ├── services/
│   │   │   ├── api_service.dart   # HTTP 客户端
│   │   │   ├── auth_service.dart  # 认证服务
│   │   │   └── storage_service.dart # 本地存储
│   │   └── utils/
│   │       ├── constants.dart
│   │       └── helpers.dart
│   ├── android/
│   ├── ios/
│   ├── test/
│   ├── pubspec.yaml
│   └── README.md
│
└── packages/                      # 共享包
    ├── types/                     # 共享类型定义
    │   ├── src/
    │   │   ├── index.ts           # 导出入口
    │   │   ├── location.ts        # 地点类型 + Zod schema
    │   │   ├── team.ts            # 队伍类型 + Zod schema
    │   │   ├── user.ts            # 用户类型 + Zod schema
    │   │   ├── city.ts            # 城市类型
    │   │   ├── tag.ts             # 标签类型
    │   │   └── enums.ts           # 枚举（Difficulty、TeamStatus 等）
    │   ├── package.json
    │   └── tsconfig.json
    └── config/                    # 共享配置
        ├── eslint/
        │   └── index.js           # 基础 ESLint 配置
        ├── typescript/
        │   ├── base.json          # 基础 TS 配置
        │   └── cloudflare.json    # Cloudflare Workers TS 配置
        └── package.json
```

---

## 拆分任务清单

### 阶段一：Monorepo 骨架搭建（Alex — 第 1-2 天）

- [ ] 初始化根 `package.json`（pnpm workspace）
- [ ] 创建 `pnpm-workspace.yaml`
- [ ] 创建 `packages/config/` — ESLint 和 TypeScript 共享配置
- [ ] 创建 `packages/types/` — 从 `lib/types.ts` 和 `db/schema.ts` 提取共享类型
- [ ] 为每个子包添加 Zod schema（对应现有类型）
- [ ] 编写 `ARCHITECTURE.md`

**packages/types 需要包含的类型（来自现有 `lib/types.ts`）：**
```typescript
// 枚举
Difficulty: "easy" | "moderate" | "hard" | "expert"
TeamStatus: "recruiting" | "full" | "ongoing" | "completed" | "cancelled"
TeamMemberRole: "leader" | "member"
TeamMemberStatus: "pending" | "approved" | "rejected" | "leave_pending"
UserLevel: "beginner" | "intermediate" | "advanced" | "expert"
UserRole: "user" | "admin"

// 接口
City, Location, Route, Team, TeamMember, User, Tag, POI
```

---

### 阶段二：后端迁移（Ben — 第 2-5 天）

**迁移映射表：**

| 现有文件 | 目标位置 |
|---------|---------|
| `db/schema.ts` | `api/src/db/schema.ts` |
| `db/index.ts` | `api/src/db/index.ts` |
| `db/migrations/` | `api/src/db/migrations/` |
| `lib/auth.ts` | `api/src/lib/auth.ts` |
| `lib/email.ts` | `api/src/lib/email.ts` |
| `lib/team-status.ts` | `api/src/lib/team-status.ts` |
| `lib/rate-limit.ts` | `api/src/middleware/rate-limit.ts` |
| `app/api/auth/` | `api/src/routes/auth.ts` |
| `app/api/locations/` | `api/src/routes/locations.ts` |
| `app/api/teams/` | `api/src/routes/teams.ts` |
| `app/api/user/` | `api/src/routes/users.ts` |
| `app/api/upload/` | `api/src/routes/upload.ts` |
| `app/api/r2/` | `api/src/lib/storage.ts` |
| `app/api/contact/` | `api/src/routes/contact.ts` |
| `app/api/cities/` | `api/src/routes/cities.ts` |
| `app/api/tags/` | `api/src/routes/tags.ts` |
| `app/api/pois/` | `api/src/routes/pois.ts` |
| `app/api/favorites/` | `api/src/routes/favorites.ts` |
| `wrangler.toml` | `api/wrangler.toml` |

**Hono 路由示例（对应现有 Next.js API）：**
```typescript
// api/src/index.ts
import { Hono } from "hono";
import { cors } from "hono/cors";
import locationsRoute from "./routes/locations";
import teamsRoute from "./routes/teams";
import authRoute from "./routes/auth";

const app = new Hono<{ Bindings: CloudflareEnv }>();

app.use("*", cors({ origin: ["https://gomate.jiahongw.com"] }));

app.route("/api/locations", locationsRoute);
app.route("/api/teams", teamsRoute);
app.route("/api/auth", authRoute);
// ...

export default app;
```

**api/wrangler.toml 配置：**
```toml
name = "gomate-api"
main = "src/index.ts"
compatibility_date = "2026-02-26"
compatibility_flags = ["nodejs_compat"]

[[d1_databases]]
binding = "DB"
database_name = "gomate-db"
database_id = "7d17d076-202f-48f8-b343-24209cdb0ba1"

[[r2_buckets]]
binding = "R2"
bucket_name = "gomate"

[[kv_namespaces]]
binding = "GOMATE_KV"
id = "638ecd78e70c48fda01904bc9c2105d8"
```

---

### 阶段三：Web 前端迁移（Fiona — 第 3-7 天）

**迁移映射表：**

| 现有文件 | 目标位置 | 处理方式 |
|---------|---------|---------|
| `app/page.tsx` | `frontend/src/pages/index.astro` | 转为 Astro 页面 |
| `app/locations/page.tsx` | `frontend/src/pages/locations/index.astro` | 静态部分 Astro，交互部分 React Island |
| `app/locations/[id]/page.tsx` | `frontend/src/pages/locations/[id].astro` | 同上 |
| `app/teams/page.tsx` | `frontend/src/pages/teams/index.astro` | 同上 |
| `app/teams/[id]/page.tsx` | `frontend/src/pages/teams/[id].astro` | 同上 |
| `app/login/page.tsx` | `frontend/src/islands/AuthForms.tsx` | 纯 React Island |
| `app/profile/edit/page.tsx` | `frontend/src/islands/ProfileEdit.tsx` | 纯 React Island |
| `components/ui/` | `frontend/src/components/ui/` | 直接迁移 |
| `components/features/` | `frontend/src/components/features/` | 直接迁移 |
| `components/layout/` | `frontend/src/components/layout/` | 直接迁移 |
| `lib/copy.ts` | `frontend/src/lib/copy.ts` | 直接迁移 |
| `lib/auth-client.ts` | `frontend/src/lib/auth-client.ts` | 直接迁移 |
| `app/locales/` | `frontend/src/locales/` | 直接迁移 |

**API 客户端封装（替换 Server Actions）：**
```typescript
// frontend/src/lib/api.ts
const API_BASE = import.meta.env.PUBLIC_API_URL || "https://gomate-api.workers.dev";

export async function fetchLocations(params?: LocationsQuery) {
  const url = new URL(`${API_BASE}/api/locations`);
  // ...
  return fetch(url).then(r => r.json());
}

export async function fetchTeams(params?: TeamsQuery) { ... }
export async function createTeam(data: CreateTeamInput) { ... }
export async function joinTeam(teamId: string) { ... }
```

**astro.config.mjs 配置：**
```javascript
import { defineConfig } from "astro/config";
import react from "@astrojs/react";
import tailwind from "@astrojs/tailwind";
import cloudflare from "@astrojs/cloudflare";

export default defineConfig({
  output: "server",
  adapter: cloudflare(),
  integrations: [react(), tailwind()],
});
```

---

### 阶段四：移动端开发（Ming — 第 3-10 天）

**核心页面优先级：**

1. **P0（核心流程）：**
   - 首页（地点列表 + 搜索）
   - 地点详情（图片、描述、队伍列表）
   - 队伍详情（成员、加入按钮）
   - 登录/注册

2. **P1（用户功能）：**
   - 我的队伍（已加入/已创建）
   - 用户资料
   - 收藏列表

3. **P2（高级功能）：**
   - 创建队伍
   - 资料编辑
   - 分享功能

**pubspec.yaml 核心依赖：**
```yaml
dependencies:
  flutter:
    sdk: flutter
  dio: ^5.0.0              # HTTP 客户端
  go_router: ^13.0.0       # 路由
  riverpod: ^2.0.0         # 状态管理
  shared_preferences: ^2.0.0 # 本地存储
  cached_network_image: ^3.0.0 # 图片缓存
  flutter_secure_storage: ^9.0.0 # 安全存储（token）
  intl: ^0.19.0            # 国际化
```

**API Service 示例：**
```dart
// mobile/lib/services/api_service.dart
class ApiService {
  static const String baseUrl = 'https://gomate-api.workers.dev';
  final Dio _dio = Dio(BaseOptions(baseUrl: baseUrl));

  Future<List<Location>> getLocations({String? cityId, String? difficulty}) async {
    final response = await _dio.get('/api/locations',
      queryParameters: {'cityId': cityId, 'difficulty': difficulty});
    return (response.data['data'] as List)
        .map((json) => Location.fromJson(json))
        .toList();
  }

  Future<Team> getTeam(String id) async { ... }
  Future<void> joinTeam(String teamId) async { ... }
}
```

---

### 阶段五：CI/CD 和基础设施（Dana — 第 1-10 天，持续进行）

**GitHub Actions 工作流：**

```yaml
# .github/workflows/api-deploy.yml
name: Deploy API
on:
  push:
    branches: [main]
    paths: ["api/**", "packages/**"]
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v3
      - run: pnpm install
      - run: pnpm --filter api build
      - run: pnpm --filter api deploy
        env:
          CLOUDFLARE_API_TOKEN: ${{ secrets.CLOUDFLARE_API_TOKEN }}
```

**本地开发启动脚本：**
```bash
# 启动所有服务（根目录）
pnpm dev
# 等价于：
# api: wrangler dev (port 8787)
# frontend: astro dev (port 4321)
# mobile: flutter run
```

---

## 关键技术决策

### 1. 认证方案
- **方案**：Better Auth 保留在 `api/` 后端，前端通过 cookie/token 认证
- **原因**：Better Auth 已经支持 Cloudflare Workers，无需改动核心逻辑
- **实现**：`api/src/lib/auth.ts` 直接迁移，前端使用 `better-auth/client`

### 2. 前端框架选择（Astro 6）
- **静态内容**（地点介绍、关于页面）→ Astro 组件，SSG/SSR
- **交互内容**（表单、队伍操作、收藏）→ React Islands（`client:load` 或 `client:visible`）
- **优势**：更快的首屏加载，SEO 友好，Islands 架构减少 JS 体积

### 3. 共享类型策略
- `packages/types` 提供 TypeScript 类型 + Zod schema
- 后端用 Zod 做请求校验
- 前端用 Zod 做表单校验
- Flutter 端手动维护对应的 Dart 模型（通过 `json_serializable` 生成）

### 4. API 设计规范
- RESTful API，统一响应格式：
```typescript
// 成功
{ success: true, data: T, meta?: { total, page, pageSize } }
// 失败
{ success: false, error: { code: string, message: string } }
```

### 5. 数据库迁移
- `db/schema.ts` → `api/src/db/schema.ts`（直接迁移，无需改动）
- `db/migrations/` → `api/src/db/migrations/`（直接迁移）
- `db/seed/` → `api/src/db/seed/`（直接迁移）

---

## 执行时间线

```
Week 1（第 1-5 天）：
  Day 1: Alex 搭建 Monorepo 骨架 + Dana 配置 CI/CD 框架
  Day 2: Alex 完成 packages/types + Ben 开始后端迁移
  Day 3: Ben 完成路由迁移 + Fiona 开始前端迁移 + Ming 搭建 Flutter 项目
  Day 4: Ben 完成认证迁移 + Fiona 迁移组件
  Day 5: Ben 完成所有路由 + Fiona 完成页面迁移

Week 2（第 6-10 天）：
  Day 6: Fiona 完成 API 客户端对接 + Ming 完成核心页面
  Day 7: 全员联调（前端 + 后端接口对接）
  Day 8: Ming 完成用户功能 + Dana 完成 CI/CD
  Day 9: 集成测试和 Bug 修复
  Day 10: 部署验证和文档完善
```

---

## 注意事项

1. **保留原始项目**：在 `feat/refactor-split` 分支上进行，不影响 `main` 分支
2. **数据库不变**：D1 数据库 ID（`7d17d076-202f-48f8-b343-24209cdb0ba1`）和 KV ID 保持不变
3. **Cloudflare 资源共享**：`api/` 和 `frontend/` 共用同一个 D1、R2、KV
4. **CORS 配置**：`api/` 需要配置允许 `frontend/` 域名的 CORS
5. **Flutter 认证**：使用 `flutter_secure_storage` 存储 JWT token，通过 `Authorization: Bearer` 头传递
6. **逐步迁移**：可以先完成后端和前端，移动端单独推进，不阻塞主流程
