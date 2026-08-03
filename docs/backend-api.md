# GoMate 后端 API 文档

> 最后更新：2026-08-01
> 框架：Hono 4 + Cloudflare Workers + Drizzle ORM

## 基础信息

| 环境       | 地址                              |
| ---------- | --------------------------------- |
| 本地开发   | `http://localhost:8799`           |
| 生产环境   | `https://api.gomate.live`         |
| 预发布环境 | `https://api-staging.gomate.live` |

**认证方式：** Better Auth（基于 Session Cookie）；`/v1/*` 公开 API 另支持 API Key（`x-api-key` 请求头，格式 `gm_live_<key>`，通过 `POST /auth/api-key/create` 创建）。

## 认证与权限

绝大多数受保护端点都是逐路由调用 `getSession()` 校验会话，未登录返回 401。集中封装：

| 工具                  | 位置                                | 作用                                   | 未通过时返回 |
| --------------------- | ----------------------------------- | -------------------------------------- | ------------ |
| `requireAdmin`        | `api/src/routes/locations/utils.ts` | 管理员专属操作（地点/城市/标签写入等） | 401 / 403    |
| `requireTeamLeader()` | `api/src/lib/team-permissions.ts`   | 仅队长（审批、修改、组建/取消、移除）  | 401 / 403    |
| `requireTeamMember()` | `api/src/lib/team-permissions.ts`   | 仅已批准成员（行动本认领等）           | 401 / 403    |

---

## 1. 认证 `/auth`

### POST `/auth/forgot-password`

发送密码重置邮件

- **认证：** 否
- **Body：** `{ "email": "user@example.com" }`
- **响应：** `{ "success": true, "message": "如果该邮箱已注册，重置密码邮件已发送" }`（不暴露邮箱是否注册）

### POST `/auth/api-key/create`

创建 API Key（放行到 Better Auth `apiKey.create`）

- **认证：** 是（登录用户）
- **限制：** 每位用户最多 10 个 key，超出返回 403 `MAX_API_KEYS_EXCEEDED`

### ALL `/auth/*`

Better Auth 代理，处理注册、登录、登出、会话刷新等所有认证操作。

---

## 2. 队伍管理 `/teams`

### GET `/teams`

获取队伍列表

- **认证：** 否
- **Query 参数：**

| 参数            | 类型    | 说明                                                             |
| --------------- | ------- | ---------------------------------------------------------------- |
| `page`          | int     | 页码，默认 1                                                     |
| `pageSize`      | int     | 每页数量，默认 12，最大 100                                      |
| `search`        | string  | 搜索队伍标题                                                     |
| `status`        | string  | 逗号分隔的状态（recruiting\|full\|formed\|completed\|cancelled） |
| `difficulty`    | string  | 逗号分隔的难度（easy\|moderate\|hard\|expert，按地点难度过滤）   |
| `locationId`    | string  | 地点 ID，返回该地点下的所有队伍                                  |
| `userId`        | string  | 配合 `includeJoined=true` 获取用户加入的队伍                     |
| `includeJoined` | boolean | true 时仅返回已加入的队伍                                        |
| `activeOnly`    | boolean | true 时排除已完成/已取消的队伍                                   |
| `cityId`        | string  | 城市 ID（经地点 join 过滤）                                      |
| `startDateFrom` | string  | 起始日期范围（YYYY-MM-DD）                                       |
| `startDateTo`   | string  | 结束日期范围（YYYY-MM-DD）                                       |
| `timeFilter`    | string  | 时间快捷筛选：`today` \| `tomorrow` \| `weekend` \| `7days`      |
| `tagIds`        | string  | 逗号分隔的标签 ID（`entityType=activity`）                       |

- **响应：**

```json
{
  "success": true,
  "teams": [
    {
      "id": "team-xxx",
      "locationId": "loc-xxx",
      "title": "周六徒步清水湾",
      "description": "体验南山海边风景",
      "date": "2026-03-28",
      "time": "09:00",
      "duration": "3小时",
      "durationMin": 180,
      "maxMembers": 6,
      "currentMembers": 3,
      "icon": "⛰️",
      "status": "recruiting",
      "requirements": ["防晒", "登山鞋"],
      "location": {
        "name": "清水湾",
        "coverImage": "url",
        "difficulty": "moderate"
      },
      "leader": {
        "id": "user-xxx",
        "name": "张三",
        "nickname": "登山达人",
        "avatar": "url",
        "level": "advanced",
        "completedHikes": 0,
        "bio": ""
      },
      "createdAt": "2026-03-20T10:00:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "pageSize": 12,
    "total": 45,
    "totalPages": 4,
    "hasMore": true
  }
}
```

### GET `/teams/recommend-onboarding`

获取新手引导推荐队伍（task #187）

- **认证：** 是
- **Query：** `type`（hiking\|explore\|leisure\|travel，可选，偏好过滤）
- **响应：** `{ "hasAnyMembership": boolean, "candidates": [...], "fallbackNoType": boolean, "cityId": string|null }`（cityId 缺省时服务端 fallback 深圳）

### POST `/teams`

创建队伍

- **认证：** 是（需填写微信号，否则 400）
- **Body：**

```json
{
  "locationId": "loc-xxx",
  "title": "周末徒步",
  "description": "一起体验自然",
  "date": "2026-03-28",
  "time": "09:00",
  "duration": "3小时",
  "durationMin": 180,
  "maxMembers": 6,
  "requirements": ["防晒", "登山鞋"]
}
```

- **说明：** `duration` / `durationMin` 至少提供一个（都缺省时默认 240 分钟）；队长自动成为 approved 成员
- **响应：** `{ "success": true, "team": { "id": "team-xxx", "startTime": "ISO", "endTime": "ISO", ... } }`

### GET `/teams/:id`

获取队伍详情

- **认证：** 否（已登录则返回与当前用户相关的字段）
- **响应：** 队伍完整数据 + `leader` + `members`（approved/leave_pending）+ `location`；`checklist`（行动本）仅队长/成员可见，访客为 `null`（隐私红线，不泄漏到 SSR 响应）
- **说明：** 访问时先执行过期状态更新（recruiting→cancelled、formed→completed）

### PUT `/teams/:id`

更新队伍信息

- **认证：** 是（仅队长）
- **Body：** `{ "title", "description", "maxMembers", "requirements", "icon", "time", "durationMin" }`（均可选）
- **响应：** `{ "success": true, "message": "队伍信息已更新" }`

### POST `/teams/:id/join`

申请加入队伍

- **认证：** 是（需填写微信号，否则 400）
- **条件：** 仅 `recruiting` 状态可申请；已满返回 400；被拒后可重新申请
- **响应：** `{ "success": true, "message": "申请已提交，等待队长审核" }`

### GET `/teams/:id/applications`

获取成员/申请列表

- **认证：** 是（仅队长）
- **Query：** `status`（可选，如 `pending`；不传返回该队伍全部成员）
- **响应：** `{ "success": true, "applications": [{ "id", "userId", "status", "createdAt", "userName", "wechat", "user": {...} }] }`

### POST `/teams/:id/members/:userId/approve`

批准成员申请

- **认证：** 是（仅队长）
- **响应：** `{ "success": true, "message": "已通过申请" }`
- **说明：** 人满时队伍状态自动置为 `full`（反之保持 `recruiting`）；已满拒绝批准返回 400

### POST `/teams/:id/members/:userId/reject`

拒绝成员申请

- **认证：** 是（仅队长）
- **响应：** `{ "success": true, "message": "已拒绝申请" }`

### POST `/teams/:id/members/:userId/remove`

移除成员（队长操作）

- **认证：** 是（仅队长，不能移除自己）
- **响应：** `{ "success": true, "message": "已移除成员" }`
- **说明：** 移除后人数低于上限时队伍状态自动回 `recruiting`

### POST `/teams/:id/leave`

成员退出队伍

- **认证：** 是（队长不能退出）
- **说明：** `recruiting`/`full` 状态直接退出；已组建（`formed`）的队伍需走退出申请流程
- **响应：** `{ "success": true, "message": "已成功退出队伍" }`

### POST `/teams/:id/cancel-application`

取消入队申请

- **认证：** 是
- **说明：** 仅 `pending` 状态可取消，取消后状态记为 `cancelled`（保留历史）
- **响应：** `{ "success": true, "message": "申请已取消" }`

### POST `/teams/:id/leave-request`

申请退出已组建队伍

- **认证：** 是（仅 `formed` 状态；队长不能退出）
- **响应：** `{ "success": true, "message": "退出申请已提交，等待队长审批" }`

### POST `/teams/:id/members/:userId/approve-leave`

批准退出申请

- **认证：** 是（仅队长）
- **响应：** `{ "success": true, "message": "已批准退出申请" }`

### POST `/teams/:id/members/:userId/reject-leave`

拒绝退出申请

- **认证：** 是（仅队长）
- **响应：** `{ "success": true, "message": "已拒绝退出申请" }`

### GET `/teams/:id/my-status`

获取当前用户在队伍中的状态

- **认证：** 否（未登录返回 `null`）
- **响应：** `{ "success": true, "status": "pending|approved|rejected|leave_pending|cancelled|null" }`

### POST `/teams/:id/form`

组建队伍（状态从 recruiting/full 转为 formed）

- **认证：** 是（仅队长）
- **Body：** `{ "isUnderfilled": boolean }`
- **响应：** `{ "success": true, "message": "队伍已组建", "isUnderfilled": boolean }`

### POST `/teams/:id/cancel`

取消队伍（队长操作）

- **认证：** 是（仅队长）
- **条件：** 仅 `recruiting` / `full` 状态可取消
- **响应：** `{ "success": true, "message": "队伍已取消" }`

### DELETE `/teams/:id`

删除队伍

- **认证：** 是（仅队长）
- **条件：** 仅 `recruiting` 或 `cancelled` 状态可删除
- **响应：** `{ "success": true, "message": "队伍已删除" }`
- **错误响应：**
  - 401：未登录
  - 403：非队长
  - 400：状态不允许删除（已组建/已完成的队伍）
  - 404：队伍不存在
- **说明：** 删除操作会先清除所有成员记录，再删除队伍记录，不可恢复

### 行动本 Checklist（task #163）

| 端点                                                          | 认证         | 说明                                       |
| ------------------------------------------------------------- | ------------ | ------------------------------------------ |
| `PUT /teams/:id/checklist`                                    | 是（仅队长） | 覆盖式保存行动本（集合点/装备/分工，≤2KB） |
| `POST /teams/:id/checklist/assignments/:assignmentId/claim`   | 是（成员）   | 认领分工                                   |
| `DELETE /teams/:id/checklist/assignments/:assignmentId/claim` | 是（成员）   | 取消认领（幂等，未认领返回 204）           |

---

## 3. 地点管理 `/locations`

### GET `/locations`

获取地点列表

- **认证：** 否
- **Query 参数：**

| 参数           | 类型   | 说明                                                      |
| -------------- | ------ | --------------------------------------------------------- |
| `page`         | int    | 页码，默认 1                                              |
| `pageSize`     | int    | 每页数量，默认 12，最大 100                               |
| `search`       | string | 搜索地点名称                                              |
| `cityId`       | string | 城市 ID                                                   |
| `tagIds`       | string | 逗号分隔的标签 ID                                         |
| `type`         | string | 地点类型筛选（hiking\|explore\|leisure\|travel）          |
| `view`         | string | `card` 轻量卡片模式（不 join 城市，徒步参数直读地点字段） |
| `tags=true`    | —      | 返回热门标签（15 条）                                     |
| `allTags=true` | —      | 返回所有标签（按类型分组）                                |

- **响应：**

```json
{
  "success": true,
  "locations": [
    {
      "id": "loc-xxx",
      "name": "清水湾",
      "slug": "qingshuiwan",
      "subtitle": "深圳南山的海边秘境",
      "description": "...",
      "address": "...",
      "cityId": "city-xxx",
      "cityName": "深圳",
      "type": "hiking",
      "coverImage": "url",
      "images": ["url1", "url2"],
      "bestSeason": ["春", "秋"],
      "coordinates": { "lat": 22.5, "lng": 113.9 },
      "tags": [{ "id", "name", "type" }],
      "difficulty": "moderate",
      "durationMin": 120,
      "durationMax": 180,
      "distance": 5.5,
      "elevation": 700,
      "extra": { "hiking": { "overview": "...", "tips": ["..."], "equipmentNeeded": ["..."], "warnings": ["..."] } }
    }
  ],
  "pagination": { "page": 1, "pageSize": 12, "total": 50, "totalPages": 5 }
}
```

### GET `/locations/:id`

获取地点详情（支持 id 或 slug）

- **认证：** 否
- **响应：** 地点完整信息 + `tags` + `gearEssential` / `gearOptional`（数组）+ `extra`

### POST `/locations`

创建地点

- **认证：** 是（仅管理员）
- **Body：** `{ "name", "slug", "subtitle", "description", "address", "cityId", "cityName", "type", "coverImage", "images", "bestSeason", "coordinates", "extra", "parkingAvailable", "parkingInfo", "gearEssential", "gearOptional" }`
- **响应：** `{ "success": true, "location": { "id", "slug" } }`

### PUT `/locations`

更新地点

- **认证：** 是（仅管理员）
- **Body：** 与创建相同，需包含 `id` 字段（`type` 可选，nullable）

### DELETE `/locations/:id`

删除地点

- **认证：** 是（仅管理员）

### GET `/locations/:id/tags`

获取地点当前关联的标签

- **认证：** 否
- **响应：** `{ "success": true, "tags": [...] }`

### PUT `/locations/:id/tags`

全量替换地点标签

- **认证：** 是（仅管理员）
- **Body：** `{ "tagIds": ["tag-1", "tag-2"] }`

---

## 4. 用户管理 `/users`

### GET `/users?id={userId}`

获取用户信息

- **认证：** 否
- **响应：**

```json
{
  "user": {
    "id": "user-xxx",
    "name": "张三",
    "nickname": "登山达人",
    "email": "user@example.com",
    "avatar": "url",
    "bio": "我喜欢徒步",
    "gender": "M",
    "birthday": "1990-01-01",
    "level": "advanced",
    "completedHikes": 15,
    "wechat": "user_wechat",
    "extra": { "equipment": [], "experience": "..." },
    "city": "city-xxx",
    "role": "user",
    "status": "active",
    "createdAt": "...",
    "updatedAt": "..."
  }
}
```

### PATCH `/users/update`

更新用户信息

- **认证：** 是（普通用户只能改自己；`userId` 必填，支持 id 或邮箱；管理员可改他人）
- **Body：** `{ "userId", "name", "nickname", "bio", "level", "image", "wechat", "gender", "birthday", "extra", "city" }`（`city` 为 cityId）
- **响应：** `{ "success": true, "user": {...} }`

### GET `/users/pending-approvals`

获取待审批申请列表（队长视角，支持分页）

- **认证：** 是
- **Query：** `page`（默认 1）、`pageSize`（默认 10，最大 100）
- **响应：**

```json
{
  "success": true,
  "approvals": [
    {
      "id": "tm-xxx",
      "teamId": "team-xxx",
      "userId": "user-xxx",
      "createdAt": "...",
      "team": { "id", "title", "date", "time", "maxMembers", "location": {...} },
      "applicant": { "id", "name", "nickname", "avatar", "bio", "level" }
    }
  ],
  "pagination": { "page": 1, "pageSize": 10, "total": 3, "totalPages": 1, "hasMore": false }
}
```

### GET `/users/applications`

获取当前用户的申请记录（不含自己创建的队伍）

- **认证：** 是
- **Query：** `page`、`pageSize`（默认 10，最大 100）
- **响应：** `{ "success": true, "applications": [{ "id", "status", "createdAt", "joinedAt", "team": {...} }], "stats": { "pending": 1, "approved": 5, "rejected": 0 }, "pagination": {...} }`

### GET `/users/teams/joined`

获取用户加入的队伍（已审批通过，不含自己创建的）

- **认证：** 是

### GET `/users/created-teams`

获取用户创建的所有队伍

- **认证：** 是

### GET `/users/:id`

获取用户公开资料

- **认证：** 否（`email`/`wechat`/`role`/`status` 仅本人可见）
- **响应：** 用户公开信息 + `stats`（创建/加入/完成队伍数）+ `ongoingTeams`

---

## 5. 文件上传 `/upload`

所有上传端点统一走 R2（`https://gomate.cos.jiahongw.com/...`）。

### POST `/upload/avatar`

上传用户头像

- **认证：** 是（只能上传自己的头像，管理员除外）
- **Form-Data：** `file`（JPEG/PNG/GIF/WebP，最大 5MB）、`userId`
- **响应：** `{ "success": true, "key": "avatars/...", "url": "https://gomate.cos.jiahongw.com/...", "size": 123456, "type": "image/jpeg" }`

### DELETE `/upload/avatar?key={key}`

删除用户头像

- **认证：** 是（仅能删除自己的头像）

### POST `/upload/location`

上传地点图片

- **认证：** 是（仅管理员）

### POST `/upload/story`

上传故事封面图

- **认证：** 是（登录用户）

### POST `/upload/activity-post`

上传活动动态图片

- **认证：** 是（登录用户）

### GET `/r2/*`

R2 文件代理（本地开发专用，顶层挂载）

---

## 6. 发现故事 `/stories`

### GET `/stories`

获取已发布故事列表

- **认证：** 否
- **Query：** `page`（默认 1）、`limit`（默认 10，最大 20）、`status`（默认 `published`）、`tag`
- **status 可见性（task #156）：** 仅 `published` / `draft` 有效（其他值按 `published` 处理）；`draft` 需登录且只返回本人草稿，未登录返回空列表
- **响应：** `{ "success": true, "data": [{ "id", "title", "summary", "content", "coverImage", "locationId", "viewCount", "likeCount", "author": {...} }], "pagination": { "page", "limit", "total", "hasMore" } }`

### POST `/stories`

发布故事

- **认证：** 是（登录用户）
- **Body：** `{ "title", "summary", "content", "coverImage", "locationId", "tags": ["徒步", "露营"] }`（`coverImage` 可选；`tags` ≤ 10）
- **行为：** 使用当前登录用户作为作者，故事状态直接写入 `published`；`tags` 会 trim、去空、去重并限制最多 10 个，不存在的标签自动创建为 `type="activity"`，同时写入 `entity_to_tags(entityType="story")`。
- **响应：** `{ "success": true, "message": "发布成功", "data": { "id": "story-xxx" } }`

### GET `/stories/tags`

获取有故事关联的热门标签

- **认证：** 否
- **响应：** `{ "success": true, "tags": [{ "id", "name", "type", "count" }] }`

### GET `/stories/stats`

获取故事统计数据

- **认证：** 否
- **响应：** `{ "success": true, "data": { "weeklyNewStories", "popularLocation" } }`

### GET `/stories/:id`

获取故事详情，并增加浏览数

- **认证：** 否
- **响应：** `data` 含故事字段 + `author` + `location` + `isLiked` + `tags: [{ id, name }]`（标签关联，编辑表单回显依赖此字段；无标签时为 `[]`）
- **可见性（task #156）：** `published` 公开可读；`draft` 仅作者本人或管理员可读（其余 404，不泄露存在性），且 draft 访问不计浏览数；`hidden` 一律 404

### PUT `/stories/:id`

更新故事

- **认证：** 是（作者或管理员）
- **Body：** 同创建（可选字段）+ `status`（draft\|published\|hidden）

### DELETE `/stories/:id`

软删除故事，状态改为 `hidden`

- **认证：** 是（作者或管理员）

### POST `/stories/:id/like`

点赞/取消点赞故事（toggle）

- **认证：** 是（登录用户）
- **行为：** 已点赞 → 取消点赞；未点赞 → 点赞
- **响应：** `{ "success": true, "liked": boolean, "likeCount": number, "message": string }`
- **错误：** 401 未登录 / 404 故事不存在 / 500 服务器错误

### GET `/stories/:id/share-stats`

获取故事分享统计

- **认证：** 否
- **响应：** `{ "success": true, "total": number, "byChannel": { "wechat": 3, ... } }`

---

## 7. 收藏管理 `/favorites`

### GET `/favorites`

获取收藏列表

- **认证：** 是
- **Query：** `entityType`（location\|story，可选）
- **响应：** `{ "success": true, "favorites": [{ "id", "entityType", "entityId", "createdAt", "location": {...} }] }`

### POST `/favorites`

添加收藏

- **认证：** 是
- **Body：** `{ "entityType": "location", "entityId": "loc-xxx" }`

### DELETE `/favorites?entityType={type}&entityId={id}`

取消收藏

- **认证：** 是

---

## 8. 城市管理 `/cities`

### GET `/cities`

获取城市列表

- **认证：** 否
- **Query：** `hot`（boolean）、`province`、`level`、`page`（默认 1）、`pageSize`（默认 20，最大 100）
- **响应：** `{ "success": true, "cities": [{ "id", "adcode", "name", "level", "province", "isHot" }] }`

### POST `/cities`

创建城市

- **认证：** 是（仅管理员）
- **Body：** `{ "adcode", "name", "level", "province", "isHot" }`

---

## 9. 标签管理 `/tags`

### GET `/tags`

获取标签列表

- **认证：** 否
- **Query：** `type`（location\|activity）、`page`（默认 1）、`pageSize`（默认 50，最大 100）
- **响应：** `{ "success": true, "tags": [{ "id", "name", "type" }] }`

### POST `/tags`

创建标签（同名标签返回已有标签）

- **认证：** 是（仅管理员）
- **Body：** `{ "name", "type", "description" }`
- **响应：** `{ "success": true, "tagId": "tag-xxx", "existing": false }`

---

## 10. 联系表单 `/contact`

### POST `/contact`

提交联系表单

- **认证：** 否
- **Body：** `{ "name", "email", "subject", "message" }`
- **校验：** 所有字段必填；name ≤ 100 字；subject ≤ 200 字；message ≤ 5000 字
- **响应：** `{ "success": true, "message": "您的建议已成功提交" }`

---

## 11. 反馈 `/feedback`

### POST `/feedback`

提交用户反馈（发送邮件）

- **认证：** 否
- **Body：** `{ "type": "suggestion"|"bug", "name", "email", "content", "device"?, "browser"?, "steps"?, "pageUrl"? }`（content ≤ 5000 字，steps ≤ 2000，pageUrl ≤ 500）

---

## 12. 消息 `/messages`

队伍内一对一私信（仅队长与 approved 成员可互发）。

| 端点                         | 认证 | 说明                                                                           |
| ---------------------------- | ---- | ------------------------------------------------------------------------------ |
| `GET /messages`              | 是   | 会话列表（`limit`，默认 20，最大 50）                                          |
| `POST /messages`             | 是   | 创建会话，Body `{ "teamId", "userId"? }`（队长可指定目标成员；成员只能找队长） |
| `GET /messages/unread-count` | 是   | 未读数                                                                         |
| `GET /messages/:id`          | 是   | 会话消息（`cursor` / `since` / `limit` 分页）                                  |
| `POST /messages/:id`         | 是   | 发送消息，Body `{ "content" }`（≤1000 字）                                     |

---

## 13. 分享事件 `/shares`

### POST `/shares/track`

记录分享事件

- **认证：** 否（有 session 则记录 userId）
- **Body：** `{ "entity_type": "story", "entity_id": "story-xxx", "share_channel": "wechat" }`

---

## 14. 分享图 `/share-image`

服务端 Satori + resvg 生成分享图（PNG），R2 缓存（`Cache-Control: public, max-age=86400`）。

| 端点                         | 说明                                                                                                                               |
| ---------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| `GET /share-image/:kind/:id` | 统一端点：`kind` ∈ `location \| team \| story`。`id` 是对应 ID（location/team）或故事 ID（story）；location 支持 `slug` 作为后备。 |
| `GET /share-image/locales`   | 服务端支持的海报 locale 列表（`["zh-CN", "en", "ja"]`）。                                                                          |

- **Path params:** `:kind` 限定三种 kind；`:id` 自由但已校验存在（不存在 → 404）。
- **Query:**
  - `locale=zh-CN | en | ja`（仅在前端调用，未匹配则按 Accept-Language header 回退；默认 `zh-CN`）—— **所有 kinds 现在都按 locale 渲染**（之前只有 location 支持 team/story 忽略）
  - `refresh=1` —— 清 R2 缓存后强制重新生成

**原多端点已合并为 `GET /share-image/:kind/:id` 一个端点。** 客户端 `useShareImage({ type, id })` 现在支持 `kind: "location" | "team" | "story"`，重定向分发到此单一端点。早期 `GET /share-image/preview`（仅 Phase 1 验证用）已删除。

---

## 15. 首页推荐 `/recommendations/home`

### GET `/recommendations/home`

首页个性化推荐（task #172）

- **认证：** 否（登录用户附加 `users.city` 作 fallback）
- **Query：** `seed`（可选，不传服务端生成并返回 `nextSeed`）、`locale`（保留字段）
- **响应：** `{ "recommendations": [{ "kind", "locationId", "reason": { "key", "params" } }], "candidatePoolSize": number, "nextSeed": string }`

---

## 16. 附近圈 `/local-circle/home`

### GET `/local-circle/home`

本地（同城）动态汇总（task #184）

- **认证：** 否
- **Query：** `cityId`（可选，缺省 fallback 深圳）
- **响应：** `{ "success": true, ... }`（同城推荐数据，KV SWR 缓存）

---

## 17. 活动动态 `/activity-posts`

挂在根路由（`api/src/index.ts` 的 `app.route("/", activityPostsRoute)`）。

| 端点                                | 认证                        | 说明                                            |
| ----------------------------------- | --------------------------- | ----------------------------------------------- |
| `GET /teams/:id/activity-posts`     | 否                          | 队伍活动后分享列表（`limit`，默认 10，最大 50） |
| `POST /teams/:id/activity-posts`    | 是（队伍成员 + 队伍已完成） | Body `{ "content", "images"? }`（≤3 张）        |
| `DELETE /activity-posts/:id`        | 是（作者）                  | 删除动态                                        |
| `GET /locations/:id/activity-posts` | 否                          | 地点活动动态列表                                |

---

## 18. 管理工具 `/admin`

| 端点                                    | 认证           | 说明                                                               |
| --------------------------------------- | -------------- | ------------------------------------------------------------------ |
| `POST /admin/cron/update-expired-teams` | 是（仅管理员） | 手动触发过期队伍状态更新（recruiting→cancelled、formed→completed） |
| `GET /admin/share-analytics`            | 是（仅管理员） | 分享分析（渠道分布、7 日趋势、Top 10 被分享故事）                  |

---

## 19. 公开 API `/v1/*`（API Key / Session）

面向外部工具与移动端的稳定公开 API。认证二选一：`x-api-key` 请求头（`gm_live_<key>`）或 Session Cookie。OpenAPI 契约：`GET /v1/openapi.json`。

写端点需 `Idempotency-Key` 请求头（UUID v4），重复 key + 相同 body 幂等重放。

### 读端点

| 端点                          | 说明                                                              |
| ----------------------------- | ----------------------------------------------------------------- |
| `GET /v1/teams`               | 队伍列表（`page`/`pageSize`/`cityId`/`tagId`/`status`/`keyword`） |
| `GET /v1/teams/:id`           | 队伍详情                                                          |
| `GET /v1/teams/:id/my-status` | 我的队伍状态                                                      |
| `GET /v1/locations`           | 地点列表（`page`/`pageSize`/`cityId`/`keyword`）                  |
| `GET /v1/locations/:id`       | 地点详情                                                          |
| `GET /v1/locations/stats`     | 首页地图聚合（省份数量 + 点位及其城市/省份归属）                  |
| `GET /v1/stories`             | 故事列表                                                          |
| `GET /v1/stories/:id`         | 故事详情                                                          |
| `GET /v1/enums`               | 枚举数据（队伍状态、难度等）                                      |

### 写端点

| 端点                             | 认证要求         | 说明         |
| -------------------------------- | ---------------- | ------------ |
| `POST /v1/teams`                 | 登录（需微信号） | 创建队伍     |
| `POST /v1/teams/:teamId/members` | 登录（需微信号） | 申请加入队伍 |
| `POST /v1/locations`             | 登录 + admin     | 创建地点     |
| `POST /v1/stories`               | 登录             | 发布故事     |

---

## 20. 图片代理与健康检查

### GET `/proxy-image?url={url}`

图片代理（供前端 Canvas 绘图绕过跨域，域名白名单：gomate.cos.jiahongw.com、\*.githubusercontent.com、\*.googleusercontent.com、cdn.discordapp.com）

- **认证：** 否
- **错误：** 403 域名不在白名单 / 502 抓取失败

### GET `/health`

- **认证：** 否
- **响应：** `{ "status": "ok", "timestamp": "2026-03-22T10:00:00Z" }`

---

## 错误格式

```json
{ "error": "错误描述", "success": false }
```

| 状态码 | 含义                     |
| ------ | ------------------------ |
| 400    | 请求参数错误             |
| 401    | 未登录或认证失败         |
| 403    | 无权限访问               |
| 404    | 资源不存在               |
| 409    | 冲突（如已收藏、已申请） |
| 500    | 服务器内部错误           |

---

## 队伍状态流转

```
recruiting ──→ full ──→ formed ──→ completed
     ↑           │
     └───────────┘ (成员退出/移除，空位释放)

recruiting / full ──→ cancelled (队长取消)
recruiting ──────────→ cancelled (过期自动，cron/GET 详情时触发)
formed ──────────────→ completed (过期自动)
```

## 成员状态枚举

| 值              | 说明                   |
| --------------- | ---------------------- |
| `pending`       | 待审核                 |
| `approved`      | 已批准                 |
| `rejected`      | 已拒绝                 |
| `cancelled`     | 申请已取消             |
| `leave_pending` | 申请退出（已组建队伍） |
