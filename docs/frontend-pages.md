# GoMate 前端页面

前端使用 Astro 6 SSR 壳与 React Islands，并与 Hono API 运行在同一个 Cloudflare Worker。浏览器请求统一使用同源 `/api/*`；Astro SSR 通过进程内 dispatcher 调用 API，不进行 HTTP self-fetch。

## 页面概览

除 `sitemap.xml.ts` 外，当前共有 34 个用户页面：

| 模块     | 页面数 | 认证要求       |
| -------- | -----: | -------------- |
| 认证     |      5 | 否             |
| 首页     |      1 | 否             |
| 地点     |      2 | 部分操作需登录 |
| 队伍     |      4 | 部分操作需登录 |
| Story    |      4 | 写入需登录     |
| 收藏     |      1 | 是             |
| 消息     |      2 | 是             |
| 用户     |      4 | 部分页面需登录 |
| 博客     |      2 | 否             |
| 地点管理 |      2 | Admin          |
| 信息页   |      6 | 否             |
| 创建入口 |      1 | 否             |

## 认证

| 路径               | 说明                                                                     |
| ------------------ | ------------------------------------------------------------------------ |
| `/login`           | 登录                                                                     |
| `/register`        | 注册                                                                     |
| `/verify-email`    | 从 fragment 读取 token；用户明确确认后以同源 body-only POST 完成邮箱验证 |
| `/forgot-password` | 请求密码重置邮件                                                         |
| `/reset-password`  | 从 fragment 读取邮件 token 并以 POST body 设置新密码                     |

Better Auth 固定挂载在 `/api/auth`，使用同源 Cookie；不再存在跨子域认证或 API Key 设置页。
验证与重置 token 不进入请求 URL、SSR、日志或 trace，页面读取后立即清除 fragment。

## 首页 `/`

- 访客 Hero、近期公开队伍、地点推荐与注册入口。
- 登录用户看到下一次行程、公开队伍推荐和 onboarding。
- 本地圈按 Region 展示公共活跃聚合；附近队伍按当前用户实时合并，不进入公共 KV。
- 全国地图使用 `/api/locations/stats` 的 Region DTO。

## 地点

### 列表 `/locations`

- 搜索、开放城市 Region、活动类型和排序筛选。
- 仅展示 `published` 地点。
- 卡片使用 `region`、`supportedActivityTypes`、`coverImageUrl` 和结构化 `extra`。

### 详情 `/locations/[id]`

- 展示完整 Region、路线资料、图片、标签和相关队伍。
- `[id]` 只接受 Location ID；slug 仅作为 Region 内业务字段，不参与前端路由。
- 活动回顾由 `/api/stories?locationId=<id>` 的 V2 cursor feed 提供；组件明确展示加载、空态和可重试错误，不存在独立 Activity Post 模型。
- 收藏读写使用 `/api/favorites/locations`。

## 队伍

### 列表 `/teams`

- 搜索、Region、活动类型、时间与派生 lifecycle 筛选。
- 卡片使用 `startAt/endAt`、`activeParticipantCount/maxParticipants`、`recruitmentStatus` 和派生 lifecycle。

### 详情 `/teams/[id]`

- 展示领队、有效成员、申请状态、行程与行动本。
- 用户通过 join request 申请；领队以申请 ID 审批。
- 成员离队直接结束 active membership，不存在退出申请/审批流程。
- 详情页通过 `/api/stories?teamId=<id>` 展示队伍回顾。已结束且成行的队伍中，当前 leader 或 active member 可见“发布回顾”入口；链接进入 `/discover/create?teamId=<id>`。

### 创建与编辑

| 路径               | 说明                                                                                                                                                         |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `/teams/create`    | 选择地点后，从该地点的 `supportedActivityTypes` 显式选择 `activityType`；切换地点会清空不再受支持的值。要求按行输入，提交前 trim 并过滤空行后发送 `string[]` |
| `/teams/[id]/edit` | 领队编辑仍允许变更的 V2 字段                                                                                                                                 |

## Story

| 路径                           | 说明                                                        |
| ------------------------------ | ----------------------------------------------------------- |
| `/discover`                    | 已发布 Story cursor feed                                    |
| `/discover/[id]`               | Story 详情、点赞与收藏                                      |
| `/discover/create`             | 上传临时图片并以 `imageKeys` 创建普通 Story                 |
| `/discover/create?teamId=<id>` | 创建队伍回顾；payload 携带 `teamId`，地点由后端从 Team 推导 |
| `/discover/[id]/edit`          | 作者或 Admin 编辑内容并保留/删除既有最终图片                |

创建成功后图片从用户专属 `temp/stories/<userId>/...` 归档到 Story 最终 key。普通 Story 与队伍回顾共用 Story DTO、卡片和 feed envelope；队伍回顾同样只提交 `imageKeys[]`，不会恢复 Activity Post 图片合同。Story 收藏使用 `/api/favorites/stories`；原生分享不再上报分享埋点。
关联地点失去公开状态或所属 city Region 停止服务后，对应 Story 不再进入公开 feed、
详情、标签统计、点赞或收藏。Story 详情 GET 是纯读取，不在请求内累计浏览量。

## 收藏与消息

### 收藏 `/favorites`

页面分别读取地点收藏和 Story 收藏的 cursor feed，再在 UI 合并展示；写操作始终使用资源专用 endpoint。

### 消息 `/messages`、`/messages/[id]`

会话按 `teamId + memberUserId` 唯一。只有该成员或队伍当前领队可以查看、发送和标记消息。
聊天详情首屏读取最新 50 条并保存响应的 opaque `nextCursor`；“加载更早消息”按该
cursor 请求、按消息 ID 去重后 prepend，并以 `scrollHeight` 增量保持用户当前阅读位置。
5 秒轮询从无 cursor 的最新页开始；若该页与本地消息没有 ID 重叠，则临时沿响应 cursor
回溯到重叠点或历史末尾，再一次性 merge。轮询和这段 gap bridge 都不会覆盖用户加载历史时
保存的 cursor，否则首屏响应会把深层 cursor 重置，导致第 51 条以前的消息再次不可达。

## 用户

| 路径            | 说明                                      |
| --------------- | ----------------------------------------- |
| `/my-teams`     | 当前用户创建、加入和申请中的队伍          |
| `/profile`      | 当前用户资料与队伍摘要                    |
| `/profile/edit` | 编辑资料；城市值保存为开放 city Region ID |
| `/users/[id]`   | 公开用户资料                              |

## 地点管理

| 路径                         | 说明                                              |
| ---------------------------- | ------------------------------------------------- |
| `/admin/locations/new`       | 创建 V2 地点                                      |
| `/admin/locations/[id]/edit` | 编辑 Region、活动类型、图片、标签和结构化地点资料 |

两个页面均要求 Admin。Location API 边界使用 camelCase `extra`，服务层写入数据库时转换为 V2 的 snake_case JSON。

## 博客、信息页与创建入口

- 博客：`/blog`、`/blog/[slug]`。
- 信息页：`/about`、`/contact`、`/feedback`、`/help`、`/privacy`、`/terms`。
- `/create` 提供创建队伍与发布 Story 的统一入口。
- `sitemap.xml.ts` 是 SSR 生成端点，不计入用户页面数量。

## 前端运行时约束

- 浏览器 API helper 只接收资源路径，例如 `/teams`，由 helper 添加唯一 `/api` 前缀。
- SSR 页面使用 `frontend/src/lib/server-api.ts`，不得请求自身域名。
- 用户可见文案必须来自 i18n；修改后运行 `pnpm i18n:build` 与前端 i18n validation。
- Worker 的非 `/api` 请求全部委派给 Astro 官方 handler；`/api` 未命中路径必须返回 JSON 404。
