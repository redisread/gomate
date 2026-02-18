# GoMate

一个极简的「地点组队」平台，专注于深圳徒步场景。

## 项目简介

GoMate 旨在用结构化的方式解决小红书找搭子信息混乱的问题，帮助户外爱好者快速找到志同道合的徒步伙伴。

## 技术栈

- **框架**: Next.js 16 + App Router
- **React**: 19
- **语言**: TypeScript 5 (严格模式)
- **样式**: Tailwind CSS v4
- **UI 组件**: shadcn/ui
- **数据库**: CloudFlare D1 (SQLite) + Drizzle ORM
- **认证**: Better Auth
- **国际化**: next-intl

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

### 3. 数据库配置

项目支持三种数据模式，通过 `.env.local` 配置：

#### 模式一：Mock 数据（推荐开发使用）
无需数据库，使用本地 mock 数据。

```bash
# .env.local
USE_MOCK_DATA=true
USE_LOCAL_DB=false
```

#### 模式二：本地 SQLite（本地开发）
使用本地 SQLite 数据库，模拟 CloudFlare D1 环境。

```bash
# .env.local
USE_MOCK_DATA=false
USE_LOCAL_DB=true
LOCAL_DB_PATH=./local.db
```

**初始化本地数据库：**

```bash
# 生成迁移文件
npm run db:generate

# 执行迁移（创建表结构）
npx tsx db/migrate.ts

# 填充测试数据
npx tsx db/seed.ts
```

#### 模式三：CloudFlare D1（生产环境）

```bash
# .env.local
USE_MOCK_DATA=false
USE_LOCAL_DB=false
CLOUDFLARE_ACCOUNT_ID=your-account-id
CLOUDFLARE_DATABASE_ID=your-database-id
CLOUDFLARE_D1_TOKEN=your-api-token
```

**部署到 CloudFlare D1：**

```bash
# 1. 安装 Wrangler
npm install -g wrangler

# 2. 登录 CloudFlare
wrangler login

# 3. 创建数据库
wrangler d1 create gomate-db

# 4. 获取数据库 ID
wrangler d1 list

# 5. 配置环境变量后，推送数据库结构
wrangler d1 migrations apply gomate-db
```

### 4. 启动开发服务器

```bash
npm run dev
```

访问 http://localhost:3000

## 项目结构

```
app/
├── (marketing)/          # 营销页面组
│   ├── page.tsx          # 首页
│   └── layout.tsx        # 营销布局
├── (dashboard)/          # 应用页面组
│   ├── locations/        # 地点页面
│   │   ├── page.tsx
│   │   └── [slug]/
│   ├── teams/            # 队伍页面
│   │   ├── page.tsx
│   │   └── [id]/
│   └── layout.tsx        # 应用布局
├── api/                  # API 路由
├── globals.css
└── layout.tsx            # 根布局

components/
├── ui/                   # shadcn/ui 组件
├── layout/               # 布局组件
└── sections/             # 页面区块

lib/
├── actions/              # Server Actions
├── data/                 # 数据获取函数
└── utils/                # 工具函数

db/
├── schema.ts             # 数据库表定义 (SQLite/D1)
├── index.ts              # 数据库连接
├── migrate.ts            # 本地 SQLite 迁移脚本
├── seed.ts               # 测试数据填充脚本
└── migrations/           # 迁移文件

types/
└── index.ts              # TypeScript 类型

i18n/                     # 国际化配置
messages/                 # 翻译文件
```

## V1 功能范围

### 核心页面 (3个)

1. **首页** `/` - 营销页面，展示平台价值
2. **地点列表** `/locations` - 深圳徒步地点浏览
3. **地点详情** `/locations/[slug]` - 地点详情和队伍
4. **队伍列表** `/teams` - 浏览活跃队伍
5. **队伍详情** `/teams/[id]` - 队伍详情和加入

### 不开发的功能

- 私聊系统
- 动态流
- 支付功能
- 用户个人中心完整版

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

## 常用命令

```bash
# 开发服务器
npm run dev

# 构建生产版本
npm run build

# 代码检查
npm run lint

# 数据库操作
npm run db:generate          # 生成迁移文件
npm run db:studio            # 打开 Drizzle Studio 可视化工具

# 本地 SQLite 操作
npx tsx db/migrate.ts        # 执行本地数据库迁移
npx tsx db/seed.ts           # 填充本地测试数据

# CloudFlare D1 操作
wrangler d1 list             # 列出所有 D1 数据库
wrangler d1 migrations apply gomate-db  # 应用迁移到 D1
wrangler d1 execute gomate-db --command="SELECT * FROM locations"  # 执行 SQL
```

## 部署

### 部署到 Vercel (推荐)

```bash
vercel --prod
```

### 部署到 CloudFlare Workers (使用 D1 数据库)

```bash
# 1. 配置 wrangler.toml
# 2. 部署
wrangler deploy
```

**wrangler.toml 配置示例：**

```toml
name = "gomate"
main = "src/index.ts"
compatibility_date = "2024-01-01"

[[d1_databases]]
binding = "DB"
database_name = "gomate-db"
database_id = "your-database-id"
```

## 贡献

1. Fork 仓库
2. 创建功能分支
3. 提交更改
4. 发起 Pull Request

## 许可证

MIT
