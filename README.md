# GoMate

一个极简的「地点组队」平台，支持多城市徒步场景，帮助户外爱好者通过结构化组队找到志同道合的徒步伙伴。

## 项目简介

GoMate 旨在用结构化的方式解决小红书找搭子信息混乱的问题，帮助户外爱好者快速找到志同道合的徒步伙伴。

目前已支持城市：深圳、香港、昆明、成都、长沙。

## 技术栈

- **框架**: Next.js 15.5 + App Router
- **React**: 18.3.1
- **语言**: TypeScript 5 (严格模式)
- **样式**: Tailwind CSS v4 + shadcn/ui
- **数据库**: CloudFlare D1 (SQLite) + Drizzle ORM
- **认证**: Better Auth （邮箱/密码）
- **部署**: CloudFlare Workers/Pages（通过 OpenNext）
- **存储**: CloudFlare R2（图片上传）
- **国际化**: next-intl 3.25
- **动画**: Framer Motion 12
- **表单验证**: Zod 3.23
- **邮件**: Resend

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

**初始化数据库并导入测试数据：**
```bash
npm run db:reset
```

### 5. 生产环境部署

```bash
# 设置 Cloudflare 密钥
wrangler secret put BETTER_AUTH_SECRET

# 部署
npm run deploy
```

## 常用命令

```bash
# 开发（支持热更新，自动注入 Cloudflare D1/R2 绑定）
npm run dev
npm run lint             # ESLint 代码检查

# 数据库
npm run db:generate      # 生成 Drizzle 迁移文件
npm run db:migrate       # 应用迁移
npm run db:push          # 推送 schema 到数据库
npm run db:studio        # 打开 Drizzle Studio
npm run db:seed          # 执行 seed 数据
npm run db:seed:clear    # 清除 + 重新 seed
npm run db:reset         # db:push + db:seed:clear

# Cloudflare
npm run cf:build         # 构建 Cloudflare Workers 版本
npm run cf:deploy        # 部署到 Cloudflare（wrangler deploy）
npm run cf:dev           # 本地 Cloudflare 环境（不带热更新）
npm run cf:typegen       # 生成 Cloudflare 环境类型

# 部署快捷方式
npm run deploy           # 构建 + 部署
npm run preview          # 构建 + 预览
```

> **注意**: `npm run dev` 通过 `initOpenNextCloudflareForDev()` 自动注入 Cloudflare 绑定（D1、R2），支持热更新，无需使用 `wrangler dev`。

## 项目结构

```
app/
├── api/
│   ├── auth/           # Better Auth 认证路由
│   ├── cities/         # 城市 API
│   ├── contact/        # 联系表单
│   ├── favorites/      # 收藏功能
│   ├── locations/      # 地点 API
│   ├── pois/           # POI API
│   ├── r2/             # R2 存储操作
│   ├── routes/         # 路线 API
│   ├── tags/           # 标签 API
│   ├── teams/          # 队伍 API
│   ├── upload/         # 文件上传
│   └── user/           # 用户 API
├── locations/          # 地点页面
├── routes/[id]/        # 路线详情
├── teams/              # 队伍页面
├── users/[id]/         # 用户资料
├── favorites/          # 收藏页面
├── admin/              # 管理后台
├── login/              # 登录
├── register/           # 注册
├── forgot-password/    # 忘记密码
├── profile/            # 个人资料
└── page.tsx            # 首页

components/
├── ui/                 # 基础 UI 组件（shadcn/ui）
├── features/           # 业务功能组件
├── layout/             # 布局组件（Navbar、Footer）
└── mdx/                # MDX 文档组件

lib/
├── auth.ts             # Better Auth 服务端配置
├── auth-client.ts      # Better Auth 客户端配置
├── auth-context.tsx    # React 认证上下文
├── actions/            # 数据操作模块
├── data/               # 数据获取层
├── email/              # 邮件服务（Resend）
├── hooks/              # React Hooks
└── utils.ts            # 通用工具函数

db/
├── schema.ts           # 数据库表定义
├── index.ts            # 数据库连接
├── seed/               # Seed 数据（locations、routes、pois、cities、tags）
└── migrations/         # 迁移文件
```

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
