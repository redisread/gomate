# GoMate 后端 API 文档

> 最后更新：2026-03-26
> 框架：Hono 4 + Cloudflare Workers + Drizzle ORM

## 基础信息

| 环境     | 地址                                                      |
| -------- | --------------------------------------------------------- |
| 本地开发 | `http://localhost:8799`                                   |
| 生产环境 | `https://gomate-api-production.wujiahong2013.workers.dev` |

**认证方式：** Better Auth（基于 Session Cookie）

## 认证中间件

| 中间件         | 作用                           | 未通过时返回 |
| -------------- | ------------------------------ | ------------ |
| `requireAuth`  | 要求登录                       | 401          |
| `optionalAuth` | 可选登录，已登录则注入 session | —            |
| `requireAdmin` | 要求管理员权限                 | 401 / 403    |

---

## 1. 认证 `/auth`

### POST `/auth/forgot-password`

发送密码重置邮件

- **认证：** 否
- **Body：** `{ "email": "user@example.com" }`
- **响应：** `{ "success": true, "message": "重置密码邮件已发送" }`

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
| `difficulty`    | string  | 逗号分隔的难度（easy\|moderate\|hard\|expert）                   |
| `locationId`    | string  | 地点 ID，返回该地点下的所有队伍                                  |
| `userId`        | string  | 配合 `includeJoined=true` 获取用户加入的队伍                     |
| `includeJoined` | boolean | true 时仅返回已加入的队伍                                        |
| `activeOnly`    | boolean | true 时排除已完成/已取消的队伍                                   |

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
      "durationMin": 180,
      "maxMembers": 6,
      "currentMembers": 3,
      "icon": "⛰️",
      "status": "recruiting",
      "requirements": ["防晒", "登山鞋"],
      "location": { "name": "清水湾", "coverImage": "url" },
      "leader": {
        "id": "user-xxx",
        "name": "张三",
        "nickname": "登山达人",
        "avatar": "url",
        "level": "advanced"
      },
      "createdAt": "2026-03-20T10:00:00Z"
    }
  ],
  "pagination": { "page": 1, "pageSize": 12, "total": 45, "totalPages": 4 }
}
```

### POST `/teams`

创建队伍

- **认证：** 是（需填写微信号）
- **Body：**

```json
{
  "locationId": "loc-xxx",
  "routeId": "route-xxx",
  "title": "周末徒步",
  "description": "一起体验自然",
  "date": "2026-03-28",
  "time": "09:00",
  "durationMin": 180,
  "maxMembers": 6,
  "requirements": ["防晒", "登山鞋"]
}
```

- **响应：** `{ "success": true, "team": { "id": "team-xxx", ... } }`

### GET `/teams/:id`

获取队伍详情

- **认证：** 否（已登录则返回用户权限信息）
- **响应：** 完整队伍数据 + 成员列表 + 路线详情

### PUT `/teams/:id`

更新队伍信息

- **认证：** 是（仅队长）
- **Body：** `{ "title", "description", "maxMembers", "requirements", "time", "durationMin" }`
- **响应：** `{ "success": true, "message": "队伍信息已更新" }`

### POST `/teams/:id/join`

申请加入队伍

- **认证：** 是（需填写微信号）
- **响应：** `{ "success": true, "message": "申请已提交，等待队长审核" }`

### GET `/teams/:id/applications`

获取待审核申请列表

- **认证：** 是（仅队长）
- **响应：** `{ "success": true, "applications": [{ "id", "userId", "user": {...}, "createdAt" }] }`

### POST `/teams/:id/members/:userId/approve`

批准成员申请

- **认证：** 是（仅队长）
- **响应：** `{ "success": true, "message": "已通过申请" }`
- **说明：** 人满时自动更新队伍状态为 `full`

### POST `/teams/:id/members/:userId/reject`

拒绝成员申请

- **认证：** 是（仅队长）
- **响应：** `{ "success": true, "message": "已拒绝申请" }`

### POST `/teams/:id/leave`

成员退出队伍

- **认证：** 是
- **响应：** `{ "success": true, "message": "已成功退出队伍" }`
- **说明：** 已组建的队伍需通过退出申请流程

### POST `/teams/:id/cancel-application`

取消入队申请

- **认证：** 是
- **响应：** `{ "success": true, "message": "申请已取消" }`

### POST `/teams/:id/members/:userId/remove`

移除成员（队长操作）

- **认证：** 是（仅队长）
- **响应：** `{ "success": true, "message": "已移除成员" }`

### POST `/teams/:id/leave-request`

申请退出已组建队伍

- **认证：** 是
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

- **认证：** 否（未登录返回 null）
- **响应：** `{ "success": true, "status": "pending|approved|rejected|leave_pending|null" }`

### POST `/teams/:id/form`

组建队伍（状态从 recruiting/full 转为 formed）

- **认证：** 是（仅队长）
- **Body：** `{ "isUnderfilled": boolean }`
- **响应：** `{ "success": true, "message": "队伍已组建", "isUnderfilled": boolean }`

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

---

## 3. 地点管理 `/locations`

### GET `/locations`

获取地点列表

- **认证：** 否
- **Query 参数：**

| 参数           | 类型   | 说明                                             |
| -------------- | ------ | ------------------------------------------------ |
| `page`         | int    | 页码，默认 1                                     |
| `pageSize`     | int    | 每页数量，默认 12，最大 200                      |
| `search`       | string | 搜索地点名称                                     |
| `cityId`       | string | 城市 ID                                          |
| `tagIds`       | string | 逗号分隔的标签 ID                                |
| `type`         | string | 地点类型筛选（hiking\|explore\|leisure\|travel） |
| `tags=true`    | —      | 返回热门标签（15 条）                            |
| `allTags=true` | —      | 返回所有标签（按类型分组）                       |

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
      "routes": [{ "id", "name", "difficulty", "distance" }],
      "tags": [{ "id", "name", "type" }],
      "difficulty": "moderate"
    }
  ],
  "pagination": { "page": 1, "pageSize": 12, "total": 50, "totalPages": 5 }
}
```

### POST `/locations`

创建地点

- **认证：** 是（仅管理员）
- **Body：** `{ "name", "slug", "subtitle", "description", "address", "cityId", "type", "coverImage", "images", "bestSeason", "coordinates" }`
- **响应：** `{ "success": true, "location": { "id", "slug" } }`

### PUT `/locations`

更新地点

- **认证：** 是（仅管理员）
- **Body：** 与创建相同，需包含 `id` 字段（`type` 可选，nullable）

### GET `/locations/:id`

获取地点详情

- **认证：** 否
- **响应：** 单个地点完整信息

### DELETE `/locations/:id`

删除地点

- **认证：** 是（仅管理员）

---

## 4. 用户管理 `/users`

### GET `/users?id={userId}` 或 `/user?id={userId}`

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
    "role": "user",
    "status": "active"
  }
}
```

### PATCH `/users/update`

更新用户信息

- **认证：** 是（普通用户只能改自己，管理员可改他人）
- **Body：** `{ "userId", "name", "nickname", "bio", "level", "image", "wechat", "gender", "birthday", "extra" }`
- **响应：** `{ "success": true, "user": {...} }`

### GET `/users/pending-approvals`

获取待审批申请列表（队长视角）

- **认证：** 是
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
  "total": 3
}
```

### GET `/users/applications`

获取当前用户的申请记录

- **认证：** 是
- **响应：** `{ "success": true, "applications": [...], "stats": { "pending": 1, "approved": 5, "rejected": 0 } }`

### GET `/users/teams/joined`

获取用户加入的队伍（不含自己创建的）

- **认证：** 是

### GET `/users/created-teams`

获取用户创建的所有队伍

- **认证：** 是

### GET `/users/:id` 或 `/user/:id`

获取用户公开资料

- **认证：** 否（已登录可见更多信息）
- **响应：** 用户公开信息 + 统计数据（创建/加入/完成队伍数）

---

## 5. 登山路线 `/routes`（别名 `/hiking-routes`）

### GET `/routes`

获取路线列表

- **认证：** 否
- **Query 参数：** `locationId`、`cityId`、`difficulty`、`limit`、`offset`
- **响应：**

```json
{
  "success": true,
  "routes": [
    {
      "id": "route-xxx",
      "locationId": "loc-xxx",
      "name": "东冲西冲穿越",
      "difficulty": "moderate",
      "durationMin": 180,
      "durationMax": 240,
      "distance": 12.5,
      "elevation": 450,
      "equipmentNeeded": ["登山鞋", "防晒"],
      "warnings": ["陡峭路段", "无信号"],
      "tags": [...],
      "pois": [{ "id", "name", "category", "roleType", "order", "coordinates" }]
    }
  ]
}
```

### POST `/routes`

创建路线

- **认证：** 是（仅管理员）
- **Body：** `{ "locationId", "cityId", "name", "description", "difficulty", "durationMin", "durationMax", "distance", "elevation", "routeGuide", "equipmentNeeded", "warnings", "tagIds" }`

### GET `/routes/:id`

获取路线详情（含 POI 列表 + 标签）

- **认证：** 否

### PUT `/routes/:id`

更新路线

- **认证：** 是（仅管理员）

### DELETE `/routes/:id`

删除路线

- **认证：** 是（仅管理员）

---

## 6. 文件上传 `/upload`

### POST `/upload/avatar`

上传用户头像

- **认证：** 否
- **Form-Data：** `file`（JPEG/PNG/GIF/WebP，最大 5MB）、`userId`
- **响应：** `{ "success": true, "key": "avatars/...", "url": "https://gomate.cos.jiahongw.com/...", "size": 123456, "type": "image/jpeg" }`

### DELETE `/upload/avatar?key={key}`

删除用户头像

- **认证：** 是（仅能删除自己的头像）

### POST `/upload/location`

上传地点图片

- **认证：** 是（仅管理员）
- **Form-Data：** `file`（同上）

### POST `/upload/story`

上传故事封面图

- **认证：** 是（登录用户）
- **Form-Data：** `file`（JPEG/PNG/GIF/WebP，最大 5MB）
- **响应：** `{ "success": true, "key": "stories/...", "url": "https://gomate.cos.jiahongw.com/...", "size": 123456, "type": "image/jpeg" }`

### GET `/r2/*`

R2 文件代理（本地开发专用）

---

## 7. 发现故事 `/stories`

### GET `/stories`

获取已发布故事列表

- **认证：** 否
- **Query：** `page`（默认 1）、`limit`（默认 10，最大 20）、`status`（默认 `published`）、`tag`
- **响应：** `{ "success": true, "data": [{ "id", "title", "summary", "content", "coverImage", "locationId", "viewCount", "likeCount", "author": {...} }], "pagination": { "page", "limit", "total", "hasMore" } }`

### POST `/stories`

发布故事

- **认证：** 是（登录用户）
- **Body：** `{ "title", "summary", "content", "coverImage", "locationId", "tags": ["徒步", "露营"] }`
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

### PUT `/stories/:id`

更新故事

- **认证：** 是（作者或管理员）

### DELETE `/stories/:id`

软删除故事，状态改为 `hidden`

- **认证：** 是（作者或管理员）

### POST `/stories/:id/like`

点赞/取消点赞故事（toggle）

- **认证：** 是（登录用户）
- **行为：** 已点赞 → 取消点赞；未点赞 → 点赞
- **响应：** `{ "success": true, "liked": boolean, "likeCount": number, "message": string }`
- **错误：** 401 未登录 / 404 故事不存在 / 500 服务器错误

---

## 8. 收藏管理 `/favorites`

### GET `/favorites`

获取收藏列表

- **认证：** 是
- **Query：** `entityType`（location\|route，可选）
- **响应：** `{ "success": true, "favorites": [{ "id", "entityType", "entityId", "createdAt", "location": {...} }] }`

### POST `/favorites`

添加收藏

- **认证：** 是
- **Body：** `{ "entityType": "location", "entityId": "loc-xxx" }`

### DELETE `/favorites?entityType={type}&entityId={id}`

取消收藏

- **认证：** 是

---

## 9. 城市管理 `/cities`

### GET `/cities`

获取城市列表

- **认证：** 否
- **Query：** `hot`（boolean）、`province`、`level`、`limit`、`offset`
- **响应：** `{ "success": true, "cities": [{ "id", "adcode", "name", "level", "province", "isHot" }] }`

### POST `/cities`

创建城市

- **认证：** 是（仅管理员）
- **Body：** `{ "adcode", "name", "level", "province", "isHot" }`

---

## 10. 标签管理 `/tags`

### GET `/tags`

获取标签列表

- **认证：** 否
- **Query：** `type`（location\|route\|activity）、`limit`、`offset`
- **响应：** `{ "success": true, "tags": [{ "id", "name", "type" }] }`

### POST `/tags`

创建标签（同名标签返回已有标签）

- **认证：** 是（仅管理员）
- **Body：** `{ "name", "type", "description" }`
- **响应：** `{ "success": true, "tagId": "tag-xxx", "existing": false }`

---

## 11. 打卡点管理 `/pois`

### GET `/pois`

获取打卡点列表（支持搜索）

- **认证：** 否
- **Query：** `search`（关键词，模糊匹配名称和分类）、`limit`（默认 50，最大 200）
- **响应：**

```json
{
  "success": true,
  "pois": [
    {
      "id": "poi-xxx",
      "name": "山顶观景台",
      "description": "可俯瞰整个海湾",
      "category": "观景点",
      "coordinates": { "lat": 22.5431, "lng": 114.0579 }
    }
  ]
}
```

### GET `/pois/:id`

获取单个打卡点详情

- **认证：** 否
- **响应：**

```json
{
  "success": true,
  "poi": {
    "id": "poi-xxx",
    "name": "山顶观景台",
    "description": "可俯瞰整个海湾",
    "category": "观景点",
    "coordinates": { "lat": 22.5431, "lng": 114.0579 },
    "images": [],
    "extra": null,
    "createdAt": "2026-03-28T10:00:00Z",
    "updatedAt": "2026-03-28T10:00:00Z"
  }
}
```

### POST `/pois`

创建打卡点

- **认证：** 是（仅管理员）
- **Body：**

```json
{
  "name": "山顶观景台",
  "coordinates": { "lat": 22.5431, "lng": 114.0579 },
  "description": "可俯瞰整个海湾",
  "category": "观景点",
  "images": []
}
```

- **验证：**
  - `name`: 必填，最大 50 字符
  - `coordinates`: 必填，格式 `{ lat: number, lng: number }`，纬度 -90~90，经度 -180~180
  - `description`: 可选，最大 500 字符
  - `category`: 可选，最大 30 字符
- **响应：** `{ "success": true, "poiId": "poi-xxx" }`

### PUT `/pois/:id`

更新打卡点

- **认证：** 是（仅管理员）
- **Body：** `{ "name", "coordinates", "description", "category", "images" }`（所有字段可选）
- **响应：** `{ "success": true }`

### DELETE `/pois/:id`

删除打卡点

- **认证：** 是（仅管理员）
- **行为：** 级联删除 `entityToPois` 表中所有关联记录
- **响应：** `{ "success": true, "removedAssociations": 3 }`

---

## 12. 联系表单 `/contact`

### POST `/contact`

提交联系表单

- **认证：** 否
- **Body：** `{ "name", "email", "subject", "message" }`
- **校验：** 所有字段必填；name ≤ 100 字；subject ≤ 200 字；message ≤ 5000 字
- **响应：** `{ "success": true, "message": "您的建议已成功提交" }`

---

## 13. 管理工具 `/admin`

### POST `/admin/clear-rate-limit`

清除速率限制

- **认证：** 是（仅管理员）
- **Body：** `{ "identifier": "user@example.com" }`

---

## 14. 健康检查

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
     └───────────┘ (成员退出，空位释放)

recruiting / full / formed ──→ cancelled (队长取消)
```

## 成员状态枚举

| 值              | 说明                   |
| --------------- | ---------------------- |
| `pending`       | 待审核                 |
| `approved`      | 已批准                 |
| `rejected`      | 已拒绝                 |
| `leave_pending` | 申请退出（已组建队伍） |
