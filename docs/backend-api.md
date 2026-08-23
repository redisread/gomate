# GoMate API 合同

API 由统一 Cloudflare Worker 中的 Hono 应用提供，外部路径统一以 `/api` 开头。
路由实现以 [`src/server/app.ts`](../src/server/app.ts) 与
[`src/server/routes/`](../src/server/routes/) 为准；跨端 DTO 以
[`src/contracts/`](../src/contracts/) 为准。

## 运行边界

- 浏览器只访问同源 `/api/*`；Astro SSR 通过 `apiApp.fetch()` 进程内分发，不 self-fetch。
- Better Auth 只开放下表列出的产品端点，session 使用同源 HttpOnly Cookie。
- 携带 Cookie 的非安全方法必须来自正式 `APP_URL` 或已配置且通过校验的 Preview origin；不符合要求时在读取业务 body 前返回 403。
- 正常生产使用 `WRITE_MODE=open`；事故保护期间切换为 `protected` 后，非 GET/HEAD/OPTIONS 请求返回 503 和 `Retry-After: 60`；合法 Preview origin 仅额外允许 `POST /auth/sign-in/email` 和 `POST /auth/sign-out`。
- Preview 的 `GET /auth/get-session` 可读取当前登录 session；Preview 禁止注册、邮箱验证、密码重置、账户资料修改和所有业务写入。
- Preview 使用生产 D1/R2 读取真实授权数据；认证 session 写入生产 D1 是只读业务模式下唯一允许的写入例外。
- Preview host 必须匹配 `*-gomate.<account-subdomain>.workers.dev`，其中公开账号后缀通过 `wrangler.jsonc` 的 production `PREVIEW_HOST_SUFFIX` 固定；URL 本身不是访问控制。
- 未匹配的 `/api` 或 `/api/*` 返回 JSON 404，不进入 Astro 页面路由。
- 时间在 HTTP DTO 中使用 ISO 8601，在 D1 中存 Unix 毫秒。
- 业务错误统一为 `{ success: false, error: { code, message, details? } }`。
- 列表使用有界 `limit` 与 opaque `cursor`；具体排序和响应形状由对应路由 schema 定义。
- JSON、query、path 等 API 边界统一使用 `@hono/standard-validator` 对接现有 Zod
  Standard Schema；校验失败继续返回现有 API error envelope。认证 JSON 和 multipart 上传在
 读取前分别保留大小限制，因此会在有界读取后调用同一 Standard Schema 校验协议。

## 端点目录

下表省略 `/api` 前缀。

### 平台、认证与表单

| 方法      | 路径                            | 认证 | 用途                                   |
| --------- | ------------------------------- | ---- | -------------------------------------- |
| GET       | `/health`                       | 否   | 健康检查；返回 Worker version ID 与写入模式 |
| POST      | `/auth/sign-up/email`           | 否   | 注册；仅在用户与 credential 账户落库后返回固定响应，避免账号枚举 |
| POST      | `/auth/sign-in/email`           | 否   | 登录；成功响应不暴露 session token     |
| GET、POST | `/auth/get-session`             | 可选 | 强制回源 D1 获取当前 session           |
| POST      | `/auth/sign-out`                | 是   | 注销当前 session                       |
| POST      | `/auth/send-verification-email` | 否   | 发送验证邮件                           |
| POST      | `/auth/confirm-email`           | 否   | 以 POST body 提交验证 token            |
| POST      | `/auth/forgot-password`         | 否   | 发送密码重置邮件                       |
| POST      | `/auth/reset-password`          | 否   | 以 POST body 提交重置 token 与新密码   |
| POST      | `/contact`                      | 否   | 联系表单                               |
| POST      | `/feedback`                     | 否   | 反馈表单                               |

除上述认证端点外，`/auth/*` 固定返回 404。验证和重置 token 只放在邮件 URL fragment，
页面清除 fragment 后通过同源 POST body 提交；token 不得进入 path、query、日志或数据库明文。
登录、注册和邮件发送使用 Cloudflare Rate Limiting bindings；运行时不依赖 KV 缓存。
注册的固定成功响应还会在 Better Auth 返回后回查 D1：新用户必须同时存在 `users` 与
`local:credential` 账户；持久化不完整时返回 5xx，不伪装成注册成功。

### Region、地点与标签

| 方法   | 路径                   | 认证  | 用途                                    |
| ------ | ---------------------- | ----- | --------------------------------------- |
| GET    | `/regions`             | 否    | 按国家、层级、父级与服务状态筛选 Region |
| GET    | `/locations`           | 否    | published 地点 cursor feed              |
| GET    | `/locations/stats`     | 否    | Region 与地图点统计                     |
| GET    | `/locations/:id`       | 否    | 公开地点详情                            |
| GET    | `/locations/:id/tags`  | 否    | 公开地点标签                            |
| GET    | `/locations/:id/admin` | admin | 任意状态地点详情                        |
| POST   | `/locations`           | admin | 创建地点                                |
| PUT    | `/locations`           | admin | 更新地点；body 必须包含 `id`            |
| DELETE | `/locations/:id`       | admin | 删除未被 Team 引用的地点                |
| PUT    | `/locations/:id/tags`  | admin | 原子替换地点标签                        |
| GET    | `/tags`                | 否    | 标签目录                                |
| POST   | `/tags`                | admin | 创建标签                                |

Location 使用全局 ID 路由，不提供 slug fallback。公开读取只返回 `published` 且属于
`serviceEnabled=true` city Region 的地点。HTTP `extra` 使用 camelCase，服务层负责与
D1 JSON 的 snake_case 结构转换。公开和管理员 Location DTO 都不包含内部
`createdByUserId`；该字段只保留在数据库和服务端写入链路。

### Team

| 方法   | 路径                                                   | 认证      | 用途                                  |
| ------ | ------------------------------------------------------ | --------- | ------------------------------------- |
| GET    | `/teams`                                               | 可选      | Team cursor feed                      |
| GET    | `/teams/recommend-onboarding`                          | 是        | 基于 Region 与活动类型推荐            |
| GET    | `/teams/:id`                                           | 可选      | Team、地点、Region、标签与可见权限    |
| POST   | `/teams`                                               | 是        | 创建 Team                             |
| PUT    | `/teams/:id`                                           | leader    | 编辑未开始、未取消 Team               |
| DELETE | `/teams/:id`                                           | leader    | 删除符合约束的 Team                   |
| POST   | `/teams/:id/form`                                      | leader    | 标记成团                              |
| POST   | `/teams/:id/cancel`                                    | leader    | 取消 Team                             |
| POST   | `/teams/:id/join`                                      | 是        | 创建加入申请                          |
| GET    | `/teams/:id/join-requests`                             | leader    | 列出加入申请                          |
| POST   | `/teams/:id/join-requests/:requestId/approve`          | leader    | 批准申请并占用名额                    |
| POST   | `/teams/:id/join-requests/:requestId/reject`           | leader    | 拒绝申请                              |
| POST   | `/teams/:id/join-requests/:requestId/cancel`           | applicant | 撤销申请                              |
| POST   | `/teams/:id/leave`                                     | member    | 离队                                  |
| POST   | `/teams/:id/members/:userId/remove`                    | leader    | 移除 active 成员                      |
| GET    | `/teams/:id/my-status`                                 | 可选      | 当前用户的 leader/member/pending 状态 |
| PUT    | `/teams/:id/checklist`                                 | leader    | 覆盖式更新行动本                      |
| POST   | `/teams/:id/checklist/assignments/:assignmentId/claim` | member    | 认领分工                              |
| DELETE | `/teams/:id/checklist/assignments/:assignmentId/claim` | member    | 取消认领                              |

`maxParticipants` 只计算 active `team_members`，不包含 leader。申请批准通过 D1 `batch()`、
条件 DML 与容量 trigger 保证最终写入时权限、状态和名额仍有效。行动本上限为 2048 UTF-8
bytes；覆盖、认领和取消认领使用内容 CAS，冲突返回 409。

### 用户

| 方法   | 路径                              | 认证 | 用途                           |
| ------ | --------------------------------- | ---- | ------------------------------ |
| GET    | `/users/me`                       | 是   | 当前用户 canonical DTO         |
| PATCH  | `/users/me`                       | 是   | 更新当前用户非头像资料         |
| DELETE | `/users/me`                       | 是   | 确认后匿名化账户并撤销全部凭证 |
| GET    | `/users/me/created-teams`         | 是   | 当前用户创建的 Team            |
| GET    | `/users/me/joined-teams`          | 是   | 当前用户 active membership     |
| GET    | `/users/me/join-requests`         | 是   | 当前用户全部加入申请           |
| GET    | `/users/me/pending-join-requests` | 是   | 当前用户待处理申请             |
| GET    | `/users/:id`                      | 否   | 公开用户资料                   |

资料修改不能指定目标 user ID。`PATCH /users/me` 不接受头像字段；头像只能通过上传 command
修改。`extra` 的 partial patch 在单条 SQL 中合并，避免并发 read-merge-write 覆盖。

`DELETE /users/me` 只接受 `{ "confirmation": "DELETE" }`。命令先清理当前用户自有
头像，再通过一个 D1 `batch()` 将用户替换为匿名墓碑，并删除 `accounts`、`sessions`
及关联 `verifications`；历史 Team、Story、Conversation 和 Message 外键继续有效。

### Story、点赞与收藏

| 方法              | 路径                   | 认证         | 用途                                                  |
| ----------------- | ---------------------- | ------------ | ----------------------------------------------------- |
| GET               | `/stories`             | 可选         | Story cursor feed；可按 `locationId` 或 `teamId` 过滤 |
| GET               | `/stories/stats`       | 否           | 内容统计                                              |
| GET               | `/stories/tags`        | 否           | Story 标签统计                                        |
| GET               | `/stories/:id`         | 可选         | Story 详情                                            |
| POST              | `/stories`             | 是           | 创建普通 Story 或队伍回顾                             |
| PUT               | `/stories/:id`         | author/admin | 更新 Story                                            |
| DELETE            | `/stories/:id`         | author/admin | 删除 Story                                            |
| POST              | `/stories/:id/like`    | 是           | 幂等切换点赞                                          |
| GET、POST、DELETE | `/favorites/locations` | 是           | 地点收藏                                              |
| GET、POST、DELETE | `/favorites/stories`   | 是           | Story 收藏                                            |

Story 图片先上传到当前用户的临时 namespace，创建或更新时再归档。队伍回顾的地点由服务端
从 Team 推导，并在最终写语句复核 Team 生命周期、用户角色和地点公开状态。详情 GET 是纯读取。

### 消息

| 方法  | 路径                             | 认证        | 用途                        |
| ----- | -------------------------------- | ----------- | --------------------------- |
| GET   | `/messages`                      | 是          | 会话 inbox                  |
| POST  | `/messages`                      | 是          | 创建或复用 Team/member 会话 |
| GET   | `/messages/unread-count`         | 是          | 未读总数                    |
| GET   | `/messages/:conversationId`      | participant | cursor 读取消息             |
| POST  | `/messages/:conversationId`      | participant | 发送消息并更新会话摘要      |
| PATCH | `/messages/:conversationId/read` | participant | 标记已读                    |

会话按 `teamId + memberUserId` 唯一，只有该成员或 Team 当前 leader 可以访问。

### 媒体、海报与首页聚合

| 方法         | 路径                     | 认证  | 用途                                        |
| ------------ | ------------------------ | ----- | ------------------------------------------- |
| POST、DELETE | `/upload/avatar`         | 是    | 原子更新或删除当前头像                      |
| POST         | `/upload/location`       | admin | 上传地点临时图片                            |
| POST         | `/upload/story`          | 是    | 上传 Story 临时图片                         |
| GET          | `/share-image/:kind/:id` | 否    | 生成 `location`、`team` 或 `story` SVG 海报 |
| GET          | `/share-image/locales`   | 否    | 海报 locale 列表                            |
| GET          | `/local-circle/home`     | 可选  | 公共 Region 聚合与当前用户附近 Team         |
| GET          | `/proxy-image`           | 否    | 代理 allowlist 内的 HTTPS raster 图片       |
| GET          | `/r2/*`                  | 否    | 仅 localhost 可用的本地 R2 读取             |

上传会同时校验大小、MIME、扩展名和文件魔数，并以临时对象、最终对象、条件 DML 和补偿清理
维护 R2/D1 一致性。Local-circle KV 只缓存无用户身份的公共部分，个性化数据每次从 D1 合并。
海报接口不接受公开 `refresh` 参数；海报缓存只包含地点、行程和故事的公开内容，不渲染
用户姓名、头像或用户 ID。

## 变更检查

API 行为、DTO、认证或错误格式变化时同步更新本文，并至少运行：

```bash
pnpm lint
pnpm type-check
pnpm test:server
pnpm build
```
