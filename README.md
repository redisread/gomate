# 🏔️ GoMate

> 发现有趣地点，找到同行伙伴

[![Live](https://img.shields.io/badge/Live-gomate.live-blue)](https://gomate.live)
[![License](https://img.shields.io/badge/License-MIT-green)](LICENSE)

---

## 📖 项目简介

GoMate 是一个专注于户外徒步场景的**地点组队平台**，解决「想出门但找不到伙伴」的问题。

**核心流程：**
```
浏览地点 → 查看详情 → 加入/创建队伍 → 等待确认 → 一起出发
```

---

## ✨ 功能特性

| 功能 | 描述 |
|------|------|
| 🗺️ **发现地点** | 城市及周边户外地点推荐，含难度评级、标签分类、POI 地标标记 |
| 👥 **组建队伍** | 一键发布组队信息，设定人数上限、出发时间、参与要求 |
| ✅ **便捷参与** | 申请加入队伍，队长审核确认，组队后出发 |
| 🔔 **智能通知** | 组队状态变更邮件通知，不错过任何重要信息 |

---

## 🚀 在线体验

**访问地址：** https://gomate.live

**测试账号：**
| 角色 | 邮箱 | 密码 |
|------|------|------|
| 管理员 | `1427298682@qq.com` | `11111111` |
| 普通用户 | `1427298683@qq.com` | `11111111` |

---

## 🛠️ 技术架构

### 技术栈

```
前端：Astro 4 + React 18 + Tailwind CSS 4 + shadcn/ui
后端：Hono 4 + Cloudflare Workers + Drizzle ORM
数据库：Cloudflare D1 (SQLite)
存储：Cloudflare R2
邮件：Resend
认证：Better Auth
```

### 项目结构（pnpm Monorepo）

```
gomate/
├── api/                    # 后端 API（Hono + Cloudflare Workers）
│   ├── src/routes/         # API 路由
│   ├── src/db/             # 数据库 Schema 和迁移
│   └── src/lib/            # 工具函数
├── frontend/               # 前端应用（Astro + React）
│   ├── src/pages/          # Astro 页面
│   ├── src/components/     # React 组件
│   └── src/lib/            # 工具函数和文案
├── packages/
│   ├── types/              # 共享 TypeScript 类型
│   └── config/             # 共享配置
└── docs/                   # 项目文档
```

---

## 🔧 快速开始

### 环境要求

- Node.js >= 20.0.0
- pnpm >= 9.0.0

### 安装依赖

```bash
pnpm install
```

### 本地开发

```bash
# 同时启动 API 和前端（推荐）
pnpm dev

# 单独启动 API
pnpm api:dev        # http://localhost:8799

# 单独启动前端
pnpm web:dev        # http://localhost:5432
```

### 数据库初始化

```bash
cd api
npx drizzle-kit migrate   # 执行数据库迁移
node db/seed.ts           # 导入种子数据（可选）
```

### 构建部署

```bash
# 部署后端到 Cloudflare Workers
pnpm api:deploy

# 构建前端
pnpm web:build
```

---

## 📚 项目文档

| 文档 | 路径 | 说明 |
|------|------|------|
| 开发规范 | `CLAUDE.md` | 项目架构、开发规范、代码约定 |
| 前端功能 | `docs/frontend-pages.md` | 前端页面功能说明 |
| 后端 API | `docs/backend-api.md` | API 接口文档 |

---

## 📝 开发规范

### Git 提交规范

```
feat: 新功能
fix: 修复问题
docs: 文档更新
style: 代码格式调整
refactor: 重构
test: 测试相关
chore: 构建/工具配置
```

### 代码约定

- 组件命名：PascalCase
- 函数/变量：camelCase
- 中文字符串：统一放在 `frontend/src/lib/copy.ts`，禁止硬编码

---

## 🌐 部署架构

```
生产环境（Cloudflare）：
├── API Worker    → https://api.gomate.live
├── Frontend      → https://gomate.live
└── R2 存储       → https://gomate.cos.jiahongw.com

本地开发：
├── API           → http://localhost:8799
└── Frontend      → http://localhost:5432
```

### CI/CD

- `api/**` 推送至 `main` → 自动部署 API
- `frontend/**` 或 `packages/**` 推送至 `main` → 自动部署前端

---

## 📱 移动端

原 Flutter 移动端已归档至 [gomate-mobile](https://github.com/redisread/gomate-mobile)，当前专注于 Web 端开发。

---

## 🤝 贡献指南

欢迎提交 Issue 和 Pull Request。

---

## 📄 许可证

[MIT](LICENSE)

---

<p align="center">Made with ❤️ for outdoor enthusiasts</p>
