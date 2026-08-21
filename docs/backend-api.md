# GoMate V2 API

> Hono API 由统一 Cloudflare Worker 提供，外部路径均以 `/api` 开头。

## 运行合同

| 环境     | Origin                  | API base                    |
| -------- | ----------------------- | --------------------------- |
| 本地     | `http://localhost:5432` | `http://localhost:5432/api` |
| 生产目标 | `https://gomate.live`   | `https://gomate.live/api`   |

- 浏览器只调用同源 `/api`；Astro SSR 通过 `apiApp.fetch()` 进程内分发。
- Better Auth 固定在 `/api/auth/*`，使用同源 session cookie。
- 所有携带 Cookie 的非安全方法必须同时满足 `Origin === APP_URL.origin`；存在
  `Sec-Fetch-Site` 时必须为 `same-origin`，否则在读取业务 body 前返回 403。
- 未匹配的 `/api/*` 返回 JSON 404，不落入 Astro 页面路由。
- `WRITE_MODE=protected` 时所有非 GET/HEAD/OPTIONS 请求返回 503，并带
  `Retry-After: 60`。
- 时间字段是 ISO 8601；数据库内部使用 Unix 毫秒。
- JSON 成功响应以 `success: true` 或健康检查的 `status: "ok"` 标识；错误使用
  统一 `{ success: false, error: { code, message, details? } }`。

## 端点目录

下表省略统一 `/api` 前缀。

### 平台与认证

| 方法与路径                           | 认证                     | 说明                                                                                                                                                                                       |
| ------------------------------------ | ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------- |
| `GET /health`                        | 否                       | Worker/API 健康检查                                                                                                                                                                        |
| `POST /auth/forgot-password`         | 否                       | 发起 GoMate latest-only 密码重置；email 最长 254，挑战签发在同一写语句复核 active/non-deleted，且与邮件均在 `waitUntil`；固定响应不泄露账号/数据库/邮件状态；按规范化 email 与来源分别限流 |
| `POST /auth/sign-up/email`           | 否                       | Better Auth 注册；密码至少 8 字符，仅接受 JSON 账号字段；注册不建立 session，验证邮箱后才能登录                                                                                            |
| `POST /auth/sign-in/email`           | 否                       | 登录；无效凭据与未验证账号使用完全相同的 401；成功仅向浏览器返回 user 与 HttpOnly cookie，不在 JSON 暴露 session token                                                                     |
| `POST /auth/send-verification-email` | 否                       | 重新发送邮箱验证；与找回密码共用独立的 Cloudflare 邮件限流 binding                                                                                                                         |
| `POST /auth/confirm-email`           | 否                       | body-only 验证 token；邮件先打开 `/verify-email#token=...`，用户明确确认后调用，token 不进入 Worker URL/log/trace                                                                          |
| `POST /auth/reset-password`          | 否                       | body-only `v1.<userId>.<random>` token；每用户只保留最新哈希，D1 原子复核 active、claim、更新唯一 credential、撤销全部 session 并消费挑战；停用/软删除会同步撤销挑战                       |
| `POST /auth/sign-out`                | 是                       | 注销当前 session                                                                                                                                                                           |
| `GET                                 | POST /auth/get-session`  | 可选                                                                                                                                                                                       | 强制回源数据库；inactive/deleted 用户返回 null 并删除其全部旧 session |
| `POST /auth/update-user`             | -                        | 固定 404；资料与头像分别只能走 `/users/me` 和 `/upload/avatar`                                                                                                                             |
| `POST /auth/request-password-reset`  | -                        | 固定 404；防止绕过受保护的 `/auth/forgot-password`                                                                                                                                         |
| `GET                                 | POST /auth/verify-email` | -                                                                                                                                                                                          | 固定 404；禁止带 token 的状态变更 GET 与邮件安全扫描器自动确认        |
| `ALL /auth/*`                        | -                        | 除上表明确列出的产品端点外全部固定 404，不暴露 Better Auth 原生能力                                                                                                                        |
| `POST /contact`                      | 否                       | 联系表单，带频率限制                                                                                                                                                                       |
| `POST /feedback`                     | 否                       | 反馈表单，带频率限制                                                                                                                                                                       |

邮箱验证与密码重置邮件只把 token 放在浏览器 fragment。fragment 不进入 HTTP 请求；页面立即
清除地址栏 secret。验证邮箱必须由用户点击确认后 POST `/auth/confirm-email`，密码重置则把
fragment token 放入 GoMate 自有 reset command 的 POST body。任何 bearer token 都不得进入
URL query/path；D1 只保存带域分隔的 SHA-256 token 摘要，不保存 raw token。

### Region 与地点

| 方法与路径                 | 认证  | 说明                                                                              |
| -------------------------- | ----- | --------------------------------------------------------------------------------- |
| `GET /regions`             | 否    | 过滤参数：`countryCode`、`level`、`serviceEnabled`、`parentId`                    |
| `GET /locations`           | 否    | 仅 published 且 Region 已启用；`limit/cursor/search/regionId/activityType/tagIds` |
| `GET /locations/stats`     | 否    | `regions[].region` 与 `points[].region` 都返回完整 Region DTO                     |
| `GET /locations/:id`       | 否    | 仅按全局唯一 ID 查询，返回公开 Location DTO                                       |
| `GET /locations/:id/tags`  | 否    | 仅为公开 Location 返回地点标签                                                    |
| `GET /locations/:id/admin` | admin | 返回任意状态 Location，供草稿/归档地点后台编辑                                    |
| `POST /locations`          | admin | 创建 Location                                                                     |
| `PUT /locations`           | admin | 更新 Location，body 必须含 `id`                                                   |
| `DELETE /locations/:id`    | admin | 被 Team 引用时拒绝删除                                                            |
| `PUT /locations/:id/tags`  | admin | 原子替换地点标签                                                                  |

Location DTO 使用 `regionId` 和嵌套 `region`，坐标为 `latitude/longitude`，图片为
`coverImageUrl/images`，活动为 `supportedActivityTypes[]`。HTTP `extra` 使用
camelCase（例如 `durationMin`、`bestSeasons`）；写入 D1 时规范化为 snake_case。
输入 schema 为 strict，不接收旧字段别名。由于 `locations.slug` 只在 Region 内唯一，
详情、标签、前端链接、sitemap 与分享二维码一律使用 Location ID，不提供 slug fallback。
详情、标签和收藏只暴露 `published` 且属于 `serviceEnabled=true` city Region 的地点。
地点列表按 `(createdAt DESC, id DESC)` 稳定分页，返回
`{ success, locations, total, nextCursor }`；不接受 `page/pageSize`。

### Team

| 方法与路径                                                    | 认证      | 说明                                                |
| ------------------------------------------------------------- | --------- | --------------------------------------------------- |
| `GET /teams`                                                  | 否        | `limit/cursor` 分页，Region 过滤使用 `regionId`     |
| `GET /teams/:id`                                              | 否        | Team、leader、location、region、tags 与权限可见字段 |
| `POST /teams`                                                 | 是        | 创建 Team                                           |
| `PUT /teams/:id`                                              | leader    | 修改未开始、未取消 Team                             |
| `DELETE /teams/:id`                                           | leader    | 删除符合约束的 Team                                 |
| `POST /teams/:id/form`                                        | leader    | 标记成团                                            |
| `POST /teams/:id/cancel`                                      | leader    | 取消 Team                                           |
| `POST /teams/:id/join`                                        | 是        | 创建 pending join request                           |
| `GET /teams/:id/join-requests`                                | leader    | 列出申请                                            |
| `POST /teams/:id/join-requests/:requestId/approve`            | leader    | 原子批准并占用名额                                  |
| `POST /teams/:id/join-requests/:requestId/reject`             | leader    | 拒绝申请                                            |
| `POST /teams/:id/join-requests/:requestId/cancel`             | applicant | 撤销申请                                            |
| `POST /teams/:id/leave`                                       | member    | 离队                                                |
| `POST /teams/:id/members/:userId/remove`                      | leader    | 移除 active 成员                                    |
| `GET /teams/:id/my-status`                                    | 可选      | 当前会话的 leader/member/pending 状态               |
| `PUT /teams/:id/checklist`                                    | leader    | 替换行动本                                          |
| `POST /teams/:id/checklist/assignments/:assignmentId/claim`   | member    | 认领分工                                            |
| `DELETE /teams/:id/checklist/assignments/:assignmentId/claim` | member    | 取消认领                                            |
| `GET /teams/recommend-onboarding`                             | 是        | 基于 Region 与活动类型推荐                          |

创建 Team 的核心 body：

```json
{
  "locationId": "location-id",
  "activityType": "hiking",
  "title": "周末登山",
  "description": "...",
  "startAt": "2026-09-01T02:00:00.000Z",
  "endAt": "2026-09-01T10:00:00.000Z",
  "maxParticipants": 5,
  "requirements": [],
  "recruitmentStatus": "open",
  "tagIds": []
}
```

`maxParticipants` 只计算 `team_members` 中的 active participant，不包含 leader。审批使用 D1 `batch()` 和数据库容量 trigger，满员、
重试与最后席位竞争不会产生超员 active membership。
Team 列表按 `(startAt ASC, id ASC)` 稳定分页，返回
`{ success, teams, total, nextCursor }`；不接受 `page/pageSize`。

行动本合同：

- `PUT /teams/:id/checklist` 是 leader 的覆盖式写入；省略字段表示清空该字段。
  每个 assignment 的已有 `id` 会保留，新条目由服务端生成 ID，`assigneeIds` 去重。
- checklist 以 `JSON.stringify` 后的 UTF-8 字节数计量，上限为 2048 bytes；超限返回
  `400 VALIDATION_ERROR`。`assigneeIds` 只能包含 leader 或 `left_at is null` 的当前
  active member；否则同样返回 `400 VALIDATION_ERROR`，`details.invalidAssigneeIds`
  给出不合法 ID。
- PUT 的 assignee 资格与写入在同一 conditional DML 中复查。PUT、claim 与 unclaim
  的 compare-and-swap 直接比较 checklist JSON 内容，不依赖毫秒级 `updatedAt`。PUT
  发现内容冲突时直接返回 `409 CONFLICT`；claim/unclaim 会重读合并一次，仍冲突再返回
  `409 CONFLICT`。
- claim/unclaim 都是幂等操作，但即使目标状态已经满足，也会在 conditional UPDATE 的
  `WHERE/EXISTS` 中原子复查调用者仍是 leader 或 active member。预读后离队会返回
  `403 FORBIDDEN` 且不修改 checklist。claim 成功返回当前 assignment；unclaim 成功返回
  `204 No Content`。

### 用户

| 方法与路径                            | 认证 | 说明                                                |
| ------------------------------------- | ---- | --------------------------------------------------- |
| `GET /users/me`                       | 是   | 当前用户 canonical DTO                              |
| `PATCH /users/me`                     | 是   | 更新当前用户非头像资料；扩展字段放在 `extra` object |
| `DELETE /users/me`                    | 是   | 确认后匿名化账户并撤销全部凭证                      |
| `GET /users/me/created-teams`         | 是   | 当前用户创建的 Team                                 |
| `GET /users/me/joined-teams`          | 是   | 当前用户 active membership                          |
| `GET /users/me/join-requests`         | 是   | 当前用户全部申请                                    |
| `GET /users/me/pending-join-requests` | 是   | 当前用户待处理申请                                  |
| `GET /users/:id`                      | 否   | 公开用户资料                                        |

客户端不能提交目标 user ID 来修改其他用户。`extra` 中的 `wechat` 仅在业务权限允许
时显示；用户 birthday 输入/输出均为 ISO 时间。`PATCH /users/me` 不接受 `image`
（包括 `null`）；头像只通过 `/upload/avatar` 的原子 R2/D1 command 变更。
四个 `/users/me/*` 列表均只接受 `limit/cursor`，按各自 `createdAt DESC, id DESC`
稳定分页并在顶层返回 `nextCursor`，不接受 `page/pageSize`。`extra` 的 partial patch
通过单条 SQL `json_set` 合并到数据库当前值，避免并发更新不同字段时 read-merge-write
覆盖彼此。

`DELETE /users/me` 只接受 `{ "confirmation": "DELETE" }`。命令先清理当前用户自有
头像，再通过一个 D1 `batch()` 将用户替换为匿名墓碑，并删除 `accounts`、`sessions`
及关联 `verifications`；历史 Team、Story、Conversation 和 Message 外键继续有效。

### Stories、点赞与收藏

| 方法与路径                             | 认证   | 说明                                                                                     |
| -------------------------------------- | ------ | ---------------------------------------------------------------------------------------- |
| `GET /stories`                         | 否     | cursor feed；支持 `locationId`/`teamId` 精确过滤，返回 `{ data: { items, nextCursor } }` |
| `GET /stories/stats`                   | 否     | 内容统计                                                                                 |
| `GET /stories/tags`                    | 否     | Story 标签                                                                               |
| `GET /stories/:id`                     | 否     | Story 详情与 author/location/team/tags                                                   |
| `POST /stories`                        | 是     | 创建普通 Story 或携带 `teamId` 的队伍回顾，并归档已上传临时图片                          |
| `PUT /stories/:id`                     | author | 更新内容与受控 final `images[]`                                                          |
| `DELETE /stories/:id`                  | author | 删除 Story                                                                               |
| `POST /stories/:id/like`               | 是     | 幂等切换点赞，计数由 trigger 维护                                                        |
| `GET/POST/DELETE /favorites/locations` | 是     | 专用地点收藏查询/写入/删除                                                               |
| `GET/POST/DELETE /favorites/stories`   | 是     | 专用 Story 收藏查询/写入/删除                                                            |

创建 Story 只接受 `imageKeys[]`，key 必须属于
`temp/stories/<currentUserId>/<id>.<ext>`。服务端复制到
`stories/<storyId>/...` 后才把公开 URL 写入 D1；R2 或 D1 失败会补偿删除生成物。
携带 `teamId` 时，Team 必须已成行、未取消且 `endAt <= now`；只有当前 leader
或未离队的 active member 可以创建。服务端从 Team 推导 `locationId`，并在最终
条件 INSERT 中原子复查 Team 生命周期、角色、地点公开状态和 Region 服务状态。
关联 Location 的 Story 只有在 Location 自身为 `published` 且属于已启用 city Region
时才可创建、更新、展示、点赞或收藏；写入以条件 DML 在同一语句中复查该条件。
Story DTO 的用户态字段固定为 `isLiked`，不返回 `liked`/`favorited` 别名。
`GET /stories/:id` 是纯读取，不同步修改 `viewCount`，因此在
`WRITE_MODE=protected` 下所有 GET 都不会写 D1。

### 消息

| 方法与路径                             | 认证        | 说明                                    |
| -------------------------------------- | ----------- | --------------------------------------- |
| `GET /messages`                        | 是          | 会话 inbox                              |
| `POST /messages`                       | 是          | 为允许联系的 Team/member 建立或复用会话 |
| `GET /messages/unread-count`           | 是          | 未读总数                                |
| `GET /messages/:conversationId`        | participant | 以稳定 cursor 读取消息                  |
| `POST /messages/:conversationId`       | participant | 发送消息并更新会话摘要                  |
| `PATCH /messages/:conversationId/read` | participant | 标记已读                                |

会话 inbox 只接受 `limit/cursor`，按
`(coalesce(lastMessageAt, createdAt) DESC, id DESC)` 稳定分页，返回顶层
`nextCursor`；消息历史按 `(createdAt DESC, id DESC)` 稳定分页。两者均拒绝旧的
`page/pageSize/since` 分页别名。Conversation 与 Message DTO 的所有时间字段均为
ISO 8601 string（nullable 字段仍可为 `null`），不返回 Unix number 别名。

### 上传、分享图片与首页本地圈子

| 方法与路径                            | 认证  | 说明                                                                                                 |
| ------------------------------------- | ----- | ---------------------------------------------------------------------------------------------------- |
| `POST /upload/avatar`                 | 是    | 临时写入、归档到当前用户 namespace，并以条件 DML 更新当前头像                                        |
| `DELETE /upload/avatar?key=...`       | 是    | 只删除当前用户正在使用的头像 key                                                                     |
| `POST /upload/location`               | admin | 写入 `temp/locations/<adminId>/...`，由 Location mutation 归档                                       |
| `POST /upload/story`                  | 是    | 写入当前用户临时 Story key                                                                           |
| `GET /share-image/:kind/:id`          | 否    | 生成 Team/Location 分享 SVG                                                                          |
| `GET /share-image/locales`            | 否    | 支持的海报 locale                                                                                    |
| `GET /local-circle/home?regionId=...` | 可选  | 公共 Region 信号 + 每请求用户 neighborTeams                                                          |
| `GET /r2/*`                           | 否    | 本地开发对象读取                                                                                     |
| `GET /proxy-image?url=...`            | 否    | 仅 HTTPS allowlist 的 jpeg/png/gif/webp/avif raster 代理，不跟随 redirect；拒绝 SVG 并设置 `nosniff` |

Local-circle KV 只缓存不含用户身份的公共部分；个性化 neighborTeams 每次从 D1
计算后合并，避免跨用户缓存泄漏。
登录、注册与邮件发送的主要滥用保护使用三个 Cloudflare Rate Limiting binding：
`AUTH_SIGN_IN_RATE_LIMITER`、`AUTH_SIGN_UP_RATE_LIMITER`、
`AUTH_EMAIL_RATE_LIMITER`。输入按用途、email 与来源分别 SHA-256 后传入 binding，
不记录原始 PII；binding 是按 Cloudflare location 的最终一致滥用抑制，不承担权限、
计费或精确全局计数真相。Better Auth 自带限流继续作为纵深防御，状态使用
`auth:better-auth-rate-limit:v1:<sha256>` KV key，value 仅含 count/lastRequest 且 15
分钟 TTL；原始 IP 与 path 不落 KV。该安全状态不会进入
`local-circle:v2:public:*` payload，后者仍禁止任何用户字段。
Better Auth 扩展 user 字段全部为 server-owned (`input: false`)；session 创建 hook 与
`sessions_active_user_insert_guard` 双重限制 active 且未软删除用户，后者在落库语句内
关闭状态检查竞态。用户停用/软删除时数据库同步删除全部 session 与未消费的自有 reset
challenge。注册、登录、验证与找回密码 JSON body 上限为 16 KiB。

所有图片上传先检查 `Content-Length`，并在缺失或伪造长度时仍以固定上限读取
multipart；扩展名、声明 MIME 与文件魔数必须完全一致。`R2_PUBLIC_URL` 必须在写入
前通过 HTTPS canonical URL 校验。Avatar 与 Location 使用临时对象、最终对象和 D1
条件写入的补偿流程；失败会幂等重试清理或恢复引用。Story 的 `waitUntil` 清理同样
执行有界幂等重试；由于 V2 固定 19 张表，不新增第二十张媒体清理 ledger。
