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
- 普通路由使用 `@hono/zod-openapi` 的 `createRoute` / `app.openapi`，同一份 Zod 4 schema
  负责输入校验、响应类型和 OpenAPI 3.1 输出；跨端 DTO 从 `src/contracts/` schema 推导。
  校验失败保留既有 error envelope、details 和消息；权限检查仍在读取 body 之前。
- 认证 JSON 和 multipart 上传保留有界读取后校验，第三方认证透传保持供应商行为；这些
  特殊入口在同一 registry 注册契约并标记 `x-validation-mode`，不安装提前读取 body 的 validator。
- 纯管理员 API 共用一个访问解析器：先验证同源 session，再从当前 D1 `users` 行复核账号为
  active 且 `role=admin`。无 session、停用或已删除账号使用统一 401 envelope，
  活跃普通用户使用统一 403 envelope；不信任客户端 UI 或 session 中缓存的旧角色。
- 管理员写入的可操作冲突或校验失败在 `error.details.reason` 提供语言无关分类；服务端
  `message` 只用于诊断，管理员 UI 不直接展示。当前稳定 reason 为
  `admin_self_role_change`、`admin_last_active_revoke`、`tag_already_exists`、
  `tag_update_conflict`、`location_changed_concurrently`、`location_has_references`、
  `location_invalid_region`、`location_image_host_disallowed`。客户端只翻译已知 reason；未知、
  畸形、授权、网络和服务端错误使用对应操作的本地化通用失败文案。

## 自动生成的 API 文档

| 入口 | 可见内容 | 权限 |
| --- | --- | --- |
| `/api/openapi.json` | 公开及需登录的产品 API、健康检查 | 可匿名读取 |
| `/api/docs` | 上述规范的 Scalar 页面 | 可匿名读取 |
| `/api/admin/openapi.json` | 全量产品及管理员 API | 当前 active admin |
| `/api/admin/docs` | 全量规范的 Scalar 页面 | 当前 active admin |

`API_DOCS_ENABLED=true` 开启四个入口；其他值均返回 404，不影响业务接口。
管理员入口每次请求重新授权并返回 `Cache-Control: private, no-store`。
公开规范按操作的 `x-audience` 过滤，再递归裁剪不可达 schema/security components，
不会因为共享 registry 泄露管理员 DTO。文档生成不读取 D1、R2 或外部服务。

Scalar 浏览器资源由锁定的 `@scalar/api-reference` 版本在构建时复制到
`/generated/scalar-<version>/`，运行时从同源加载；不使用远程 CDN、字体或请求代理。
只有 localhost 页面显示请求执行按钮；生产及 Preview 页面隐藏执行入口，
不持久化认证信息。接口权限、同源 Cookie 写保护和 `WRITE_MODE` 仍由实际 API 强制执行。

新增普通 API 必须声明唯一 `operationId`、受众、请求及具体响应 schema；
文档覆盖测试对实际路由与 registry 进行核对。内部资源代理、文档自身和关闭的认证兜底入口
通过带原因的明确排除清单管理。不要手工维护另一份 OpenAPI JSON。

升级 Scalar 时同时更新精确依赖版本、资源复制版本校验及文档脚本 URL，运行构建和浏览器测试。

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
| GET    | `/locations/admin`     | admin | 搜索并分页读取任意状态地点              |
| GET    | `/locations/stats`     | 否    | Region 与地图点统计                     |
| GET    | `/locations/:id`       | 否    | 公开地点详情                            |
| GET    | `/locations/:id/tags`  | 否    | 公开地点标签                            |
| GET    | `/locations/:id/admin` | admin | 任意状态地点详情                        |
| POST   | `/locations`           | admin | 创建地点                                |
| PUT    | `/locations`           | admin | 更新地点；body 必须包含 `id`            |
| DELETE | `/locations/:id`       | admin | 默认归档；显式确认后尝试永久删除         |
| PUT    | `/locations/:id/tags`  | admin | 原子替换地点标签                        |
| GET    | `/tags`                | 否    | 标签目录                                |
| POST   | `/tags`                | admin | 创建标签                                |
| PATCH  | `/tags/:id`            | admin | 重命名标签并保留稳定 slug               |
| DELETE | `/tags/:id`            | admin | 确认后解除引用并删除标签                 |

地图统计的成功响应使用共享 `LocationStatsResponse`：`total`、按 Region 统计的 `regions` 和含 Region 的 `points`，由服务端返回值与首页地图共同消费。

Location 使用全局 ID 路由，不提供 slug fallback。公开读取只返回 `published` 且属于
`serviceEnabled=true` city Region 的地点。HTTP `extra` 使用 camelCase，服务层负责与
D1 JSON 的 snake_case 结构转换。公开和管理员 Location DTO 都不包含内部
`createdByUserId`；该字段只保留在数据库和服务端写入链路。

Location 的 `extra.hiking` 仅保留 `bestSeasons`。难度、时长、距离、爬升、路线概述、提示、
警告与地点装备字段均拒绝写入；Location 与 Team 内嵌 Location 响应也不输出这些退役字段。
其他未知字段仍按 strict schema 拒绝。

快速创建 Location 默认保存 `draft`，只要求 `name`、`description` 与启用的 city
`regionId`；坐标、封面、标签和推荐活动类型可后补。发布边界要求封面；坐标可以同时为空，
但纬度和经度如果填写则必须成对出现。推荐活动类型始终可空。`supportedActivityTypes` 是可选的地点推荐信息，写入时必须全部来自共享代码枚举；
名称由客户端 i18n 根据枚举值展示。
普通 `DELETE /locations/:id` 只归档；永久删除必须同时提交
`permanent=true&confirm=<locationId>`，且最终删除语句复核没有 Team、Story 或收藏引用。

### Team

后台只读 API：`GET /admin/teams` 和 `GET /admin/teams/:id` 均先验证当前 active admin。
列表参数为 `q`（最多 100 字，名称/队伍 ID/队长姓名、昵称、ID 的字面子串）、
`recruitmentStatus`（open/closed）、`lifecycle`（现行六种生命周期）、`limit`（1–50，默认 20）
与 opaque `cursor`；筛选取 AND，排序为 `createdAt DESC, id DESC`，响应
`{ success, teams: AdminTeamSummary[], nextCursor }`。所有状态及任意状态地点的队伍均可查到。
详情响应 `{ success, team: Team }`，包含当前成员、标签及只读行动本；用户联系方式继续隐藏。
详情不存在返回 404；无登录/非管理员分别返回 401/403。非法筛选、limit 或 cursor 返回 400。
这两个端点不提供写方法，不改变公开队伍接口或数据库结构。

首页使用列表接口的 `startDateFrom` / `startDateTo` ISO 时间戳筛选滚动未来 7 天，
上下界均包含，结合 `lifecycle=pending` 排除已经出发的队伍；筛选先于 limit/cursor 分页。
Worker 每小时自动关闭结束满 24 小时、仍开放招募、未成团且未取消的队伍；已完成或
已关闭的队伍不变。自动关闭不删除详情、成员或申请，也不修改现有报名截止规则。

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

`maxParticipants` 表示包含 leader 在内的队伍总人数上限；`activeParticipantCount` 为 leader 加
active `team_members`。申请批准通过 D1 `batch()`、条件 DML 与容量 trigger 保证最终写入时权限、
状态和名额仍有效。行动本上限为 2048 UTF-8
bytes；覆盖、认领和取消认领使用内容 CAS，冲突返回 409。

Team 的 `activityType` 必填并来自共享代码枚举。Location 的推荐活动类型只用于客户端优先排序，
不限制创建或编辑选择；创建及修改活动类型的最终条件 DML 会再次验证枚举成员。Team DTO 只返回
稳定的 `activityType` 值，客户端通过 i18n 显示名称。

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
| GET    | `/admin/users`                    | admin | 搜索并分页读取用户角色与状态   |
| PATCH  | `/admin/users/:id/role`           | admin | 在 user/admin 之间变更角色     |

资料修改不能指定目标 user ID。`PATCH /users/me` 不接受头像字段；头像只能通过上传 command
修改。`extra` 的 partial patch 在单条 SQL 中合并，避免并发 read-merge-write 覆盖。
`GET /users/me` 的 canonical DTO 包含当前 `role`；Navbar 只用它控制管理员入口可见性，最终
页面和 API 授权仍分别由 SSR guard 与上述管理员访问解析器执行。
管理员不能修改自己的角色，也不能撤销最后一个 active admin；这些条件在最终更新语句中复核。

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

上传先限制请求体和文件大小，再通过 Cloudflare Images binding 的 `info()` 从实际字节识别
图片；客户端 MIME 与扩展名仅作为选择提示，不作为拒绝合法图片的依据。只接受 JPEG、PNG、
GIF、WebP 与 HEIC/HEIF 栅格图片，SVG 和 AVIF 即使可以解码也会拒绝。`BAD_REQUEST` 的
`error.details.reason` 提供稳定的失败分类供客户端本地化展示，包括无法解码、格式不支持和
HEIC 转换失败。JPEG、PNG、GIF 与 WebP 按识别结果生成扩展名和 Content-Type 并保留原始
字节，HEIC/HEIF 通过 Images binding 转为 WebP 后再写入 R2。媒体写入继续以临时对象、
最终对象、条件 DML 和补偿清理维护 R2/D1 一致性。Local-circle 当前通过 D1 查询公共与
个性化数据，没有运行时 KV 缓存；未来缓存与异步选型遵循[可靠性与性能设计](../CODING_STANDARDS.md#可靠性与性能设计)。
海报接口不接受公开 `refresh` 参数；海报缓存只包含地点、行程和故事的公开内容，不渲染
用户姓名、头像或用户 ID。`location` 与 `team` 支持 `preset=dusk|ridge|journal`，省略时使用
`dusk`，其他值在读取业务数据前返回 400；预设 ID 和渲染版本属于缓存身份的一部分。
`story` 不提供预设选择 UI。海报封面在传给 Satori 前只保留其原生支持的 PNG、JPEG、GIF、
APNG 与 SVG；WebP、AVIF 等其他可解码格式通过 Workers Images binding 转为 JPEG，转换失败时
降级为无封面海报，不让单张媒体阻断整张海报生成。

## 变更检查

API 行为、DTO、认证或错误格式变化时同步更新本文，并至少运行：

```bash
pnpm lint
pnpm type-check
pnpm test:server
pnpm build
```

### Google 登录

- `GET /api/auth/providers` 返回 `{ google: boolean }`，不返回凭据，并使用 `Cache-Control: no-store`。
- `POST /api/auth/sign-in/social` 仅接受 `{ provider: "google", callbackURL?: string }`。同源 POST、16 KiB body 上限和登录限频均适用；返回地址只接受本站页面，禁止任意 scopes、ID token 和其它 provider。
- `GET /api/auth/callback/google` 由 Better Auth 验证 OAuth state/cookie 和交换 code。错误返回登录页的通用提示，不回显 Google 错误详情或记录 code/token。
- Google 首次登录要求已验证邮箱；同邮箱本地账号也必须已完成邮箱验证才能自动关联。关联保留原用户 ID、资料、权限和业务数据，禁用或删除用户不能创建 session。Google OAuth token 加密存储，不申请离线访问，不导入 Google 头像。
- Google 回调会创建 user/account/session，因此仅在正式 APP_URL 和 `WRITE_MODE=open` 下开放。本地配置使用本地 APP_URL；共享生产数据的远程 Preview 隐藏 Google 按钮并拒绝回调。Preview 保持原有邮箱登录边界。
