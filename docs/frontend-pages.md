# GoMate 前端页面与运行时

前端使用 Astro SSR 与 React islands，并和 Hono API 运行在同一个 Cloudflare Worker。
页面入口以 [`src/pages/`](../src/pages/) 为准，交互组件位于
[`src/components/`](../src/components/)。

## 页面目录

| 领域     | 路径                                                                          | 说明                                                |
| -------- | ----------------------------------------------------------------------------- | --------------------------------------------------- |
| 首页     | `/`                                                                           | 访客发现入口；登录用户的行程、推荐和 onboarding     |
| 认证     | `/login`, `/register`, `/verify-email`, `/forgot-password`, `/reset-password` | 同源 Cookie 认证；验证与重置 token 从 fragment 提交 |
| 地点     | `/locations`, `/locations/[id]`                                               | 地点列表、详情、标签、队伍和 Story 回顾             |
| Team     | `/teams`, `/teams/[id]`, `/teams/create`, `/teams/[id]/edit`                  | 筛选、详情、创建、编辑、申请、成员和行动本          |
| Story    | `/discover`, `/discover/[id]`, `/discover/create`, `/discover/[id]/edit`      | Story feed、详情、创建、编辑、点赞和收藏            |
| 收藏     | `/favorites`                                                                  | 地点与 Story 收藏                                   |
| 消息     | `/messages`, `/messages/[id]`                                                 | 会话 inbox 与 cursor 消息历史                       |
| 用户     | `/my-teams`, `/profile`, `/profile/edit`, `/users/[id]`                       | 当前用户队伍、资料和公开主页                        |
| 地点管理 | `/admin/locations/new`, `/admin/locations/[id]/edit`                          | Admin 创建与编辑地点                                |
| 博客     | `/blog`, `/blog/[slug]`                                                       | 内容集合与详情                                      |
| 信息页   | `/about`, `/contact`, `/feedback`, `/help`, `/privacy`, `/terms`              | 产品与法律信息                                      |
| 创建入口 | `/create`                                                                     | 创建 Team 或 Story 的统一入口                       |

`sitemap.xml.ts` 是 SSR 端点，不是用户页面。

## 核心页面合同

### 首页

- 访客看到 Hero、公开 Team、地点推荐与注册入口。
- 登录用户看到下一次行程、推荐和 onboarding。
- 本地圈公共部分直接从 D1 读取并按请求合并当前用户数据，不把用户相关结果写入共享缓存。
- 全国地图读取 `/api/locations/stats` 的 Region DTO。

### 地点

- 列表只展示 `published` 且所属 city Region 已启用服务的地点。
- 详情路由只使用全局 Location ID，slug 不参与路由解析。
- 页面消费共享 Location DTO：`region`、`supportedActivityTypes`、`coverImageUrl`、`images` 与结构化 `extra`。
- 地点 Story 使用 `/api/stories?locationId=<id>`；收藏使用 `/api/favorites/locations`。

### Team

- 列表按 Region、活动类型、时间和派生 lifecycle 筛选。
- 创建 Team 时，`activityType` 必须来自所选地点的 `supportedActivityTypes`；切换地点要清理失效值。
- 详情展示 leader、active members、申请、行程和行动本；member 离队直接结束 active membership。
- 已结束且成行的 Team 中，leader 或 active member 可通过 `/discover/create?teamId=<id>` 发布回顾。

### Story

- 普通 Story 与 Team 回顾共用 DTO、卡片和 cursor feed。
- 新图片先通过 `/api/upload/story` 上传临时 key，提交 Story 时只发送当前用户的 `imageKeys[]`。
- Team 回顾只提交 `teamId`，Location 由服务端推导。
- 关联地点失去公开资格后，对应 Story 不再进入公开读取、点赞或收藏路径。

### 消息

- 会话由 `teamId + memberUserId` 唯一确定，只有该 member 或 Team 当前 leader 可访问。
- 首屏读取最新消息；加载历史和轮询都使用服务端 opaque cursor，并按消息 ID 去重。
- 轮询不能覆盖用户当前的历史 cursor；遇到无重叠的最新页时沿 cursor 回溯并合并缺口。

## 运行时约束

- 浏览器 API helper 只接受资源路径，例如 `/teams`，并统一添加 `/api` 前缀。
- SSR 使用 [`src/lib/server-api.ts`](../src/lib/server-api.ts) 进程内调用 API，不请求自身域名。
- [`src/worker.ts`](../src/worker.ts) 将 `/api/*` 交给 Hono，其余请求交给 Astro 官方 Cloudflare handler。
- 用户可见文案全部来自 i18n；locale 变化后运行 build、validate、lint、type-check、test 和 build 门禁。
- React island 的 i18n 首次渲染必须在 SSR 与浏览器端保持同一加载态；浏览器在 hydration 后再消费页面注入的 namespace 缓存。
- 只有需要客户端状态的交互使用 React island；纯展示保持 Astro SSR。
- UI 规则与验证清单见 [`design-system.md`](design-system.md)。
