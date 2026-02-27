# GoMate 项目架构文档

## 项目概述

GoMate 是一个基于 Next.js 全栈技术栈的极简「地点组队」平台，V1 版本专注于深圳徒步场景。

## 技术栈

- **框架**: Next.js 15+ (App Router)
- **React**: 19+
- **语言**: TypeScript 5 (严格模式)
- **样式**: Tailwind CSS v4
- **UI 组件**: shadcn/ui
- **数据库**: Cloudclare D1 + Drizzle ORM
- **认证**: Better Auth
- **国际化**: next-intl
- **表单验证**: Zod

## 目录结构

```
/Users/victor/Desktop/project/github/gomate/
├── app/                          # Next.js App Router
│   ├── (marketing)/              # 营销页面组 (无导航栏)
│   │   └── page.tsx              # 首页
│   ├── (dashboard)/              # 应用页面组 (有导航栏)
│   │   ├── locations/            # 地点相关页面
│   │   │   └── [id]/             # 地点详情页
│   │   └── teams/                # 队伍相关页面
│   │       └── [id]/             # 队伍详情页
│   ├── api/                      # API 路由
│   │   └── auth/                 # Better Auth 路由
│   ├── globals.css               # 全局样式
│   ├── layout.tsx                # 根布局
│   └── page.tsx                  # 默认首页
├── components/                   # React 组件
│   ├── ui/                       # shadcn/ui 组件
│   ├── layout/                   # 布局组件 (Header, Footer)
│   └── sections/                 # 页面区块组件
├── lib/                          # 工具函数和业务逻辑
│   ├── actions/                  # Server Actions
│   ├── data/                     # 数据获取函数
│   └── utils/                    # 工具函数
├── db/                           # 数据库相关
│   ├── schema/                   # Drizzle 表定义
│   └── migrations/               # 数据库迁移文件
├── types/                        # TypeScript 类型定义
├── docs/                         # 项目文档
├── i18n/                         # 国际化配置
├── messages/                     # 翻译文件
│   ├── zh.json                   # 中文
│   └── en.json                   # 英文
└── public/                       # 静态资源
```

## 路由设计

### V1 核心页面 (仅3个)

1. **首页** `/`
   - 深圳徒步地点列表
   - 搜索和筛选
   - 热门队伍展示

2. **地点页** `/locations/[id]`
   - 地点详情
   - 相关队伍列表
   - 创建队伍入口

3. **队伍页** `/teams/[id]`
   - 队伍详情
   - 成员列表
   - 加入/退出队伍

### 路由组说明

- `(marketing)`: 无导航栏的营销页面
- `(dashboard)`: 带导航栏的应用页面

## 数据流设计

### Server Actions 组织

```
lib/actions/
├── locations.ts      # 地点相关操作
├── teams.ts          # 队伍相关操作
├── members.ts        # 成员相关操作
└── auth.ts           # 认证相关操作
```

### 数据获取模式

1. **页面级数据**: 使用 `async/await` 在 Server Component 中直接获取
2. **交互数据**: 使用 Server Actions 处理 mutations
3. **实时数据**: 使用 `revalidatePath` 或 `revalidateTag` 刷新

## 数据库设计 (V1 简化版)

### 核心表

1. **users** - 用户表 (Better Auth 管理)
2. **locations** - 地点表
3. **teams** - 队伍表
4. **team_members** - 队伍成员关联表

### 关系图

```
users (1) ───< (N) team_members (N) >─── (1) teams (N) >─── (1) locations
```

## 状态管理

### 服务端状态
- 使用 Server Actions 直接操作数据库
- 使用 `cache` 函数缓存数据获取

### 客户端状态
- 使用 React `useState` 管理表单状态
- 使用 `useTransition` 处理 pending 状态
- 避免使用全局状态管理库 (V1 保持简单)

## 认证方案

使用 Better Auth:
- 支持微信登录 (主要)
- 支持手机号登录
- Session 管理

## 国际化方案

使用 next-intl:
- 默认语言: 中文 (zh)
- 支持英文 (en)
- 路由前缀: `/en` 为英文版本

## 性能优化

1. **图片**: 使用 Next.js Image 组件
2. **字体**: 使用 next/font
3. **代码分割**: 使用动态导入
4. **数据缓存**: 使用 React `cache` 和 Next.js `unstable_cache`

## 开发规范

### 文件命名
- 组件: PascalCase (e.g., `TeamCard.tsx`)
- 工具函数: camelCase (e.g., `formatDate.ts`)
- 页面: page.tsx, layout.tsx (Next.js 约定)

### 导入顺序
1. React/Next.js 内置
2. 第三方库
3. 内部模块 (@/components, @/lib)
4. 相对路径导入
5. 样式文件

### 类型定义
- 优先使用 interface 定义对象类型
- 使用 type 定义联合类型和工具类型
- 所有函数参数和返回值必须标注类型

## 环境变量

```bash
# 数据库
DATABASE_URL=""

# Better Auth
BETTER_AUTH_SECRET="..."
BETTER_AUTH_URL="http://localhost:3000"

# 微信登录
WECHAT_APP_ID="..."
WECHAT_APP_SECRET="..."

# 可选: R2 存储 (图片上传)
R2_ACCOUNT_ID="..."
R2_ACCESS_KEY_ID="..."
R2_SECRET_ACCESS_KEY="..."
R2_BUCKET_NAME="..."
```

## 后续扩展点

V2 可扩展功能:
- 私聊系统 (使用 Socket.io 或 Server-Sent Events)
- 动态流 (使用 ISR 或流式传输)
- 更多城市和活动类型
- 支付集成
