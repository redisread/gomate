# GoMate Monorepo

GoMate 地点组队平台 - Monorepo 架构

一个极简的「地点组队」平台，支持多城市徒步场景，帮助户外爱好者通过结构化组队找到志同道合的徒步伙伴。

## 项目结构

```
gomate/
├── api/                  # 后端 API（Hono + Cloudflare Workers）
├── frontend/             # Web 前端（Astro 6 + React + Cloudflare Pages）
├── mobile/               # 移动端（Flutter iOS/Android）
├── packages/
│   ├── types/            # 共享类型定义
│   └── config/           # 共享配置（tsconfig 等）
├── .github/
│   └── workflows/        # CI/CD 工作流
├── package.json          # pnpm workspace 根配置
└── pnpm-workspace.yaml   # workspace 包路径定义
```

## 开发

### 前置要求

- Node.js >= 20
- pnpm >= 9
- Flutter >= 3.24（移动端开发）

### 安装依赖

```bash
pnpm install
```

### 启动开发服务器

后端 API：
```bash
pnpm --filter @gomate/api dev
```

Web 前端：
```bash
pnpm --filter @gomate/frontend dev
```

移动端：
```bash
cd mobile && flutter run
```

## 部署

- 后端：Cloudflare Workers（通过 wrangler）
- 前端：Cloudflare Pages
- 移动端：App Store / Google Play

## 共享包

### @gomate/types

共享类型定义，供 `api`、`frontend`、`mobile` 各子包共享使用：

- 枚举类型：`Difficulty`、`TeamStatus`、`TeamMemberStatus` 等
- 数据模型：`Location`、`Route`、`Team`、`TeamMember`、`UserPublicProfile` 等
- API 通用格式：`ApiResponse`、`PaginatedResponse`

### @gomate/config

共享 TypeScript 配置：
- `tsconfig/base.json` - 通用基础配置
- `tsconfig/cloudflare.json` - Cloudflare Workers 专用配置

## CI/CD

| 工作流 | 触发条件 | 说明 |
|--------|----------|------|
| `api-deploy.yml` | `api/**` 变更推送到 main | 部署后端到 Cloudflare Workers |
| `frontend-deploy.yml` | `frontend/**` 或 `packages/**` 变更推送到 main | 部署前端到 Cloudflare Pages |
| `mobile-build.yml` | `mobile/**` 变更推送到 main | 构建 Android APK 和 iOS IPA |

## 数据库表

| 表名 | 说明 |
|------|------|
| `users` | 用户账号（Better Auth 扩展：bio、level） |
| `sessions` / `accounts` / `verifications` | Better Auth 认证表 |
| `locations` | 徒步地点（含标签、坐标、难度等） |
| `routes` | 徒步路线（关联 location） |
| `teams` | 徒步队伍（状态：recruiting / full / ongoing / completed / cancelled） |
| `team_members` | 队伍成员（角色：leader / member，状态：pending / approved / rejected） |
| `tags` / `entityToTags` | 标签系统 |
| `cities` | 城市管理 |
| `pois` / `entityToPois` | 兴趣点系统 |
| `userFavorites` | 用户收藏 |
| `password_resets` | 密码重置令牌 |

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

## 许可证

MIT
