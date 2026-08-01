# GoMate 前端页面功能文档

> 最后更新：2026-08-01
> 架构：Astro 6 SSR 壳 + React Islands（client:load）
> 注意：本版本修正了页面数量、组件路径与已删除/新增页面，POI/路线相关页面已移除，新增发现/收藏/消息/API 设置等功能模块。

## 概览

前端共 **33 个页面**（不含 `sitemap.xml.ts` 生成端点），按功能分为 13 个模块：

| 模块     | 页面数 | 是否需登录  |
| -------- | ------ | ----------- |
| 认证     | 4      | 否          |
| 首页     | 1      | 否          |
| 地点     | 2      | 否          |
| 队伍     | 4      | 部分        |
| 发现     | 4      | 部分        |
| 收藏     | 1      | 是          |
| 消息     | 2      | 是          |
| 用户     | 4      | 部分        |
| 博客     | 2      | 否          |
| 管理     | 1      | 是（Admin） |
| API 设置 | 1      | 是          |
| 信息页   | 6      | 否          |
| 快捷入口 | 1      | 否          |

---

## 认证模块

### 登录 `/login`

**组件：** `pages/login.astro`
**认证要求：** 否

### 注册 `/register`

**组件：** `pages/register.astro`
**认证要求：** 否

### 忘记密码 `/forgot-password`

**组件：** `pages/forgot-password.astro`
**认证要求：** 否

### 重置密码 `/reset-password`

**组件：** `pages/reset-password.astro`
**认证要求：** 否（通过邮件 token 访问）

---

## 首页 `/`

**组件：** `pages/index.astro`
**认证要求：** 否

**功能点：**

- Hero 区：大标题 + 城市选择下拉
- 搜索栏：关键词输入 + 清空按钮
- CTA 按钮组：「探索地点」「找队伍」
- 数字统计徽章：城市数、地点数、队伍数
- 精选地点卡片网格（3 列，含分页）
- 城市选择器 + 附近地点推荐
- 近期队伍卡片列表（双列，含倒计时提示）
- 队伍 Activity Recap 模块（已结束队伍动态汇总）
- 换一批推荐（城市个性化推荐位）

**关键交互：**

- 城市切换 → 刷新推荐内容（城市个性化）
- 换一批 → 推荐位刷新动效（Round 3 动效体系）
- 页面滚动入场动画

---

## 地点模块

### 地点列表 `/locations`

**组件：** `pages/locations/index.astro`
**认证要求：** 否

**功能点：**

- Hero 搜索区（深色渐变背景）
  - 搜索框（玻璃效果 + 清空按钮）
  - 城市下拉筛选（单选，外部点击关闭）
- 筛选栏：难度、季节、排序
- 地点卡片网格（3 列，含封面图、最佳季节、难度标签）
- 分页或无限滚动

### 地点详情 `/locations/[id]`

**组件：** `pages/locations/[id].astro`
**认证要求：** 否（部分操作需登录）

**功能点：**

- 封面图 + 基础信息（名称、城市、最佳季节、难度标签）
- 决策信息区块：停车/装备/交通（静态 CTA）
- 队伍 Activity Recap 模块
- 队伍列表（含倒计时）
- 评价/故事入口

---

## 队伍模块

### 队伍列表 `/teams`

**组件：** `pages/teams/index.astro`
**认证要求：** 否

**功能点：**

- 筛选栏：城市、难度、时间范围
- 队伍卡片网格（含招募状态、倒计时、人数）
- 已结束队伍灰化处理

### 队伍详情 `/teams/[id]`

**组件：** `pages/teams/[id].astro`
**认证要求：** 部分（申请需登录）

**功能点：**

- 封面图 + 基本信息
- 参与成员头像列表
- Activity Recap 模块（发布活动动态）
- 申请/退出队伍操作
- 已结束队伍状态展示
- 行动本（checklist）：队长/成员可编辑，访客只读隐藏

### 创建队伍 `/teams/create` 和 `/teams/[id]/edit`

**组件：** `pages/teams/create.astro`、`pages/teams/[id]/edit.astro`
**认证要求：** 是

**功能点：**

- 地点选择 + 基本信息录入
- 时间、人数、难度设置
- 提交发布（`CreateTeamClient`，`client:load`）

---

## 发现模块（故事）

### 发现首页 `/discover`

**组件：** `pages/discover/index.astro`
**认证要求：** 否

### 发现详情 `/discover/[id]`

**组件：** `pages/discover/[id].astro`
**认证要求：** 否

### 发布故事 `/discover/create`

**组件：** `pages/discover/create.astro`
**认证要求：** 是

### 编辑故事 `/discover/[id]/edit`

**组件：** `pages/discover/[id]/edit.astro`
**认证要求：** 是（作者或管理员）

---

## 用户模块

### 我的队伍 `/my-teams`

**组件：** `pages/my-teams/index.astro`
**认证要求：** 是

**功能点：**

- 统一管理用户参与/创建的队伍
- `MyTeamsClient` React 组件（`client:visible`）

### 个人主页 `/profile`

**组件：** `pages/profile/index.astro`
**认证要求：** 是

### 编辑资料 `/profile/edit`

**组件：** `pages/profile/edit.astro`
**认证要求：** 是

### 用户页 `/users/[id]`

**组件：** `pages/users/[id].astro`
**认证要求：** 否

---

## 收藏与消息

### 收藏 `/favorites`

**组件：** `pages/favorites/index.astro`
**认证要求：** 是

### 消息 `/messages`

**组件：** `pages/messages/index.astro`、`pages/messages/[id].astro`
**认证要求：** 是

---

## API 设置

### API Key 管理 `/settings/api-keys`

**组件：** `pages/settings/api-keys.astro`（`ApiKeysClient`，`client:load`）
**认证要求：** 是

**功能点：**

- 创建 / 复制 / 删除 API Key（`POST /auth/api-key/create`，每位用户最多 10 个）
- 用于 `/v1/*` 公开 API 的 `x-api-key` 认证

---

## 博客模块

### 博客列表 `/blog`

**组件：** `pages/blog/index.astro`
**认证要求：** 否

### 博客详情 `/blog/[slug]`

**组件：** `pages/blog/[slug].astro`
**认证要求：** 否

---

## 管理模块

### 地点管理 `/admin/locations/[id]/edit`

**组件：** `pages/admin/locations/[id]/edit.astro`
**认证要求：** 是（Admin）

**功能点：**

- 地点基本信息编辑
- 决策信息录入（停车/装备，`LocationEditClient` 含本地草稿自动保存/恢复）
- 封面图 + 图片管理
- 预览面板（实时同步）

---

## 快捷入口

### 创建入口 `/create`

**组件：** `pages/create.astro`
**认证要求：** 否

**功能点：**

- 统一内容创建导航页（三卡片：发布活动 / 发布故事 / 敬请期待）
- 卡片跳转：发布活动 → `/teams/create`，发布故事 → `/discover/create`
- 即将推出占位卡片（灰色半透明）

---

## 信息页

以下为静态信息页：

| 路径        | 说明     |
| ----------- | -------- |
| `/about`    | 关于我们 |
| `/contact`  | 联系页   |
| `/feedback` | 反馈页   |
| `/help`     | 帮助页   |
| `/privacy`  | 隐私政策 |
| `/terms`    | 服务条款 |

---

## 其他

- `pages/sitemap.xml.ts`：生成 `sitemap.xml` 的端点，非用户可见页面。

---

## 功能矩阵总览

| 页面       | 搜索 | 筛选 | 收藏 | 消息 | 队伍申请 | 管理 |
| ---------- | ---- | ---- | ---- | ---- | -------- | ---- |
| 首页       | ✅   | 城市 | ❌   | ❌   | ❌       | ❌   |
| 地点列表   | ✅   | ✅   | ❌   | ❌   | ❌       | ❌   |
| 地点详情   | ❌   | ❌   | ✅   | ❌   | ❌       | ❌   |
| 队伍列表   | ✅   | ✅   | ❌   | ❌   | ❌       | ❌   |
| 队伍详情   | ❌   | ❌   | ❌   | ❌   | ✅       | ❌   |
| 创建入口   | ❌   | ❌   | ❌   | ❌   | ❌       | ❌   |
| 我的队伍   | ❌   | ✅   | ❌   | ❌   | ❌       | ❌   |
| 收藏       | ❌   | ❌   | —    | ❌   | ❌       | ❌   |
| 消息       | ❌   | ❌   | ❌   | —    | ❌       | ❌   |
| API 设置   | ❌   | ❌   | ❌   | ❌   | ❌       | ❌   |
| 地点管理   | ❌   | ❌   | ❌   | ❌   | ❌       | ✅   |

---

## 设计系统摘要

- **暗色模式**：全站支持，通过 Tailwind CSS `dark:` 变体实现
- **颜色系统**：amber（主色）、stone（背景）、green（成功）、red（错误）
- **图标库**：Lucide React
- **动画**：入场动画（Intersection Observer）、换一批动效（Round 3 动效体系）
- **响应式**：移动优先，支持 lg 断点双栏布局
