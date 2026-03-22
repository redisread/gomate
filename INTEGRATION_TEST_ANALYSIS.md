# 「个人资料」和「个人资料编辑」页面 — 集成测试问题分析

## 测试场景 1：完整编辑保存流程

### 问题1：Session 缓存延迟导致旧数据显示

**严重程度**: 🔴 高

**触发场景**:
1. 用户修改昵称、简介、等级等字段
2. 点击「保存」按钮
3. 后端 `/api/user/update` 更新数据库成功
4. 前端 `setTimeout(..., 1000)` 后跳转回 `/profile`
5. `/profile` 调用 `/auth/get-session` 获取用户数据

**问题根源**:
- `profile-client.tsx:129` 中，数据来自 `/auth/get-session`（Better Auth session）
- `/api/user/update:107-114` 虽然清除了 KV 缓存（`GOMATE_KV.delete('user:xxx')`），但没有清除 Better Auth 内部的 session 缓存
- Better Auth session 缓存有效期是 `updateAge: 60 * 60 * 24`（24小时）
- 1秒跳转时间不足以让 session 缓存失效

**影响用户场景**:
- 用户编辑个人资料后，跳转回 /profile 页面看到的仍是编辑前的数据
- 刷新页面后数据才会更新
- 用户体验受损，怀疑"保存失败"

**修复建议**:
```
选项 A（快速修复 - 推荐）:
- 在 profile-edit-client.tsx 的 handleSubmit 中，保存成功后直接更新本地 user state
- 然后跳转到 /profile 时，React 端已有最新数据
- 或者延长 setTimeout 时间到 2-3 秒，给 Better Auth 时间同步

选项 B（深层修复）:
- 在 /api/user/update 返回时，直接返回更新后的完整 user 对象
- profile-edit-client 获取返回值，用返回值中的 user 更新 session（如果 Better Auth 提供接口）
- 或者存储到 localStorage，让 /profile 优先读取最新本地数据

选项 C（高级修复）:
- 在后端清除 session 缓存（调用 Better Auth API 重新生成 session token）
- 强制前端在 profile 页加载时刷新 session
```

---

## 测试场景 2：头像上传流程

### 问题2：头像上传成功 + 用户更新失败 → R2 孤儿文件

**严重程度**: 🔴 高

**触发场景**:
1. 用户选择头像文件（如 `avatar.jpg`）
2. 点击「保存」按钮
3. `uploadAvatar()` 成功上传到 R2，返回公开 URL：`https://gomate.cos.jiahongw.com/avatars/user123-1711000000.jpg`
4. 后续 `/api/user/update` 请求因网络超时、服务器错误、或数据库故障失败
5. R2 中已存在孤儿文件，但数据库 `users.image` 未更新

**问题根源**:
- `profile-edit-client.tsx:145-167` 和 `profile-edit-client.tsx:169-207` 是两个独立异步操作
- 上传和更新之间没有事务保证
- 如果第一步成功、第二步失败，R2 文件无人认领

**影响用户场景**:
- 保存失败，但头像已无法撤销（孤儿文件占用存储空间和成本）
- 累积 N 次失败，就会产生 N 个孤儿文件
- 长期可能导致 R2 存储成本飙升

**修复建议**:
```
选项 A（前端重试补救）:
- /api/user/update 返回失败时，记录上传的 R2 key
- 提示用户"保存失败，已上传的头像文件将在 24h 后自动清理"
- 在 R2 中对孤儿文件设置生命周期规则（Lifecycle Rule），24-48小时自动删除

选项 B（后端事务保护 - 推荐）:
- 修改 /api/user/update 流程：先删除旧头像（如果有），再保存新头像 URL
- 如果用户更新字段失败，则回滚：DELETE 新上传的头像文件
- 原子操作：要么都成功，要么都回滚

选项 C（上传后验证）:
- /api/user/update 成功后，在返回前验证 user.image 确实已保存
- 如果保存失败但 R2 文件存在，主动调用 DELETE /upload/avatar 清理该文件
```

### 问题3：两个独立请求没有事务保证

**严重程度**: 🟡 中

**触发场景**:
- 参考问题2的场景

**问题根源**:
- 前端分两步操作：1) POST /upload/avatar  2) PATCH /api/user/update
- 后端没有封装一个原子性的"上传并保存头像"接口
- 如果中间出现任何故障（网络、服务器、数据库），就会产生数据不一致

**影响用户场景**:
- 数据库和 R2 存储不同步
- 长期累积孤儿文件

**修复建议**:
```
选项 A（推荐）:
- 后端新增 POST /api/user/update-with-avatar 接口
- 该接口接收 file (FormData) 和其他用户字段
- 内部原子地处理：上传 R2 → 获取 URL → 更新用户表 → 删除旧头像
- 任意一步失败则回滚全部操作

选项 B（简化版）:
- 保持现状，但在 /api/user/update 中增加：
  1. 验证 user.image 是否存在于 R2（防止孤儿文件被记录）
  2. 如果保存失败但新 image URL 已传入，则主动删除该文件

选项 C（前端重新上传）:
- 检测 /api/user/update 失败
- 用户确认"要重新保存吗？"后，直接删除已上传的头像（DELETE /upload/avatar）
- 用户重新选择文件并上传
```

---

## 测试场景 3：数据一致性

### 问题4：Session user 与 API user 字段名不一致

**严重程度**: 🟡 中

**触发场景**:
1. `/auth/get-session` 返回 `user.image`（Better Auth 字段名）
2. `/api/users?id=xxx` 返回 `user.avatar`（后端自定义字段名）
3. `/api/users/:id` (公开资料) 返回 `user.avatar`
4. 组件混用这两个字段，导致字段名不统一

**问题根源**:
- `api/src/routes/users.ts:40-41` 返回 `avatar: user.image`（字段名转换）
- `api/src/lib/auth.ts:84` 注册了 Better Auth 自定义字段 `image`
- 前端 `profile-client.tsx:249` 使用 `user.image`（来自 session）
- 如果将来混用 `/api/users?id=xxx` 的数据，会发现找不到 `.image`，取而代之是 `.avatar`

**影响用户场景**:
- 当前代码正常工作，因为 profile-client 只用 session 数据
- 但新代码如果混用两个 API 的返回值，就会出现 undefined 错误
- 如果将来切换到 `/api/users/:id` 数据源，头像会无法显示

**修复建议**:
```
选项 A（统一到 image - 推荐）:
- 修改 /api/users?id=xxx 和 /api/users/:id 的返回值
- 统一使用 image 而不是 avatar
- 前端所有地方都用 user.image

选项 B（统一到 avatar）:
- 修改 SessionUser 类型定义，用 avatar 替代 image
- 修改 Better Auth 字段注册为 avatar
- 影响广泛，不推荐

选项 C（类型保护）:
- 不改代码，但在 TypeScript 类型层面加强检查
- 为返回 avatar 的 API 定义专用类型（ApiUser），返回 image 的定义为 SessionUser
- 编译时就能检测字段不匹配

推荐选项 A：
统一所有 API 返回值，在 users.ts 中改为：
{
  user: {
    ...
    image: user.image,  // 改为这个
    ...
  }
}
```

### 问题5：createdAt 字段格式不一致且可能为 null

**严重程度**: 🟡 中

**触发场景**:
1. `profile-client.tsx:343` 执行 `new Date(user.createdAt)`
2. 如果 `user.createdAt` 是 Date 对象：`new Date(Date 对象)` → 正常工作
3. 如果 `user.createdAt` 是时间戳（数字）：`new Date(时间戳)` → 正常工作
4. 如果 `user.createdAt` 是 ISO 字符串：`new Date(ISO 字符串)` → 正常工作
5. 如果 `user.createdAt` 是 null 或 undefined：`new Date(null)` → 返回 `Invalid Date` → 显示为"—"

**问题根源**:
- `frontend/src/lib/types.ts:121` 定义 `createdAt?: string | number | null`
- Better Auth 返回 session 时，`createdAt` 的格式不明确
- DB schema `api/src/db/schema.ts:32` 使用 `{ mode: "timestamp" }`，Drizzle 返回 Date 对象
- 但序列化到 JSON 时会变成数字或字符串，取决于中间件处理

**影响用户场景**:
- `/profile` 页面"加入时间"显示为"—"（因为 createdAt 为 null）
- 代码能运行但显示不完整

**实际测试**:
```javascript
// profile-client.tsx:343
user.createdAt ? new Date(user.createdAt).toLocaleDateString(...) : "—"
// 有三元守卫，所以不会崩溃，但如果 createdAt 为 "Invalid Date" 仍会显示 "Invalid Date"
```

**修复建议**:
```
选项 A（加强守卫 - 推荐）:
在 profile-client.tsx:343 改为：
value={
  user.createdAt && !isNaN(new Date(user.createdAt).getTime())
    ? new Date(user.createdAt).toLocaleDateString("zh-CN", {...})
    : "—"
}

选项 B（后端统一格式）:
- Better Auth 返回 session 时，统一序列化 createdAt 为时间戳（毫秒）
- 或者统一为 ISO 字符串（但这会增加传输体积）
- 在 auth.ts 的 getSession 中处理

选项 C（类型检查）:
- 在 SessionUser 类型中明确标注 createdAt 必须是数字（时间戳）
- 不允许 string 或 null
- 在序列化层确保总是返回有效的时间戳
```

---

## 测试场景 4：边界 Case

### 问题6：昵称为空时的显示逻辑

**严重程度**: 🟢 低

**触发场景**:
1. 用户注册时只填了真名（name），没有填昵称（nickname）
2. 后端存储 `nickname = null`
3. `profile-client.tsx:199` 执行 `displayName = user.nickname || user.name`
4. 如果 `user.name` 为空（虽然注册时必填），则 `displayName = undefined`
5. `profile-client.tsx:253` 中 `displayName?.[0]?.toUpperCase()` 返回 undefined

**问题根源**:
- 注册时 `name` 字段是必填的（Better Auth 注册流程），所以 `user.name` 不应为空
- 但代码没有添加防御，如果数据库被人工修改，就会触发此 bug

**影响用户场景**:
- 用户头像上显示的字符会变成 undefined，显示为空
- 概率极低，因为注册时 name 必填

**修复建议**:
```
选项 A（加强防御）:
displayName = user.nickname || user.name || "User"
// 或
displayName = user.nickname || user.name || user.email?.split("@")[0] || "?"

选项 B（类型保证）:
在 SessionUser 类型中，把 name 标记为 non-optional：
name: string; // 不允许 null/undefined
// 这样 TypeScript 会检查所有使用 user.name 的地方
```

### 问题7：用户等级 (level) 可能为未知值

**严重程度**: 🟢 低

**触发场景**:
1. 数据库中有旧数据，level 字段为某个弃用的值（如 `"novice"`）
2. 或者数据库被直接修改为无效值
3. `profile-client.tsx:198` 执行 `LEVEL_CONFIG[user.level]`
4. 查不到对应的配置，返回 undefined
5. 后续使用 `levelConfig.badge` 时崩溃

**问题根源**:
- `profile-client.tsx:198` 有兜底逻辑：`LEVEL_CONFIG[user.level] || LEVEL_CONFIG.beginner`
- 所以实际上已经有防护了，不会崩溃
- 但如果旧代码没有这个兜底，就会出问题

**影响用户场景**:
- 低风险，因为代码已有兜底逻辑
- 但等级显示可能不准确

**修复建议**:
```
现有代码已经处理了这个问题：
const levelConfig = LEVEL_CONFIG[user.level] || LEVEL_CONFIG.beginner;

无需额外修复。但可以加日志做监控：
if (!LEVEL_CONFIG[user.level]) {
  console.warn(`Unknown user level: ${user.level}, defaulting to beginner`);
}
```

### 问题8：生日时区偏移 — 关键 BUG

**严重程度**: 🔴 高

**触发场景**:
1. 用户在编辑页选择生日：`2000-01-01`（用 `<input type="date">`）
2. 浏览器转换为本地 ISO 字符串：`"2000-01-01"`（字符串）
3. 前端发送给后端：`birthday: "2000-01-01"`
4. 后端 `/api/user/update:80-82` 处理：
   ```typescript
   updateData.birthday = typeof birthday === "string"
     ? new Date(birthday)  // ← 关键：使用 UTC 时区解析
     : new Date(birthday as number);
   ```
5. `new Date("2000-01-01")` 在 UTC 时区下被解析为 `2000-01-01T00:00:00Z`
6. 但用户所在时区（如北京 UTC+8）的本地午夜是 `1999-12-31T16:00:00Z`
7. Drizzle ORM 存储为时间戳（Unix 毫秒数）
8. 前端读取时，显示为 `1999-12-31`（晚了一天）

**问题根源**:
- JavaScript `new Date("2000-01-01")` 被解析为 UTC 午夜
- 但用户输入的是本地日期
- 时区转换导致日期错位

**实际演现**:
```javascript
// 用户输入："2000-01-01"（北京时间 2000-01-01）
// 前端发送："2000-01-01"
// 后端解析：new Date("2000-01-01") → 2000-01-01T00:00:00Z
// 存储时间戳：946684800000（UTC）
// 用户北京时间对应：1999-12-31 20:00:00（因为 UTC+8）
// 前端取出显示：1999-12-31（错了一天！）
```

**影响用户场景**:
- 用户设置生日为 2000-01-01，查看时显示 1999-12-31
- 特别是靠近月初、年初的日期，最容易暴露
- 虽然不影响功能，但数据不准确

**修复建议**:
```
选项 A（前端修复 - 推荐短期方案）:
在 profile-edit-client.tsx 中，构造本地午夜时间戳：
function dateStringToLocalMidnight(dateStr: string): Date {
  const [year, month, day] = dateStr.split("-").map(Number);
  return new Date(year, month - 1, day, 0, 0, 0, 0);  // 本地午夜
}
// 然后发送时间戳而不是字符串

选项 B（后端修复 - 推荐长期方案）:
修改 /api/user/update:80-82 为：
if (birthday !== undefined) {
  if (typeof birthday === "string") {
    // 将 YYYY-MM-DD 转为本地午夜时间戳
    const [year, month, day] = birthday.split("-").map(Number);
    const localDate = new Date(year, month - 1, day, 0, 0, 0, 0);
    updateData.birthday = localDate;
  } else {
    updateData.birthday = new Date(birthday);
  }
}

选项 C（数据库层修复）:
存储时使用 DATE 类型而不是 TIMESTAMP
但这改动大，不推荐

选项 D（协议改进）:
前端始终发送时间戳（数字）而不是字符串
```

---

## 总体问题汇总表

| ID | 问题 | 严重程度 | 影响场景 | 推荐修复优先级 |
|---|---|---|---|---|
| 1 | Session 缓存延迟 | 🔴 高 | 编辑保存后看不到新数据 | P0 (立即修复) |
| 2 | 头像上传成功 + 更新失败 → 孤儿文件 | 🔴 高 | 积累浪费 R2 存储 | P0 (立即修复) |
| 3 | 两个请求无事务保证 | 🟡 中 | 数据库和存储不同步 | P1 (本周修复) |
| 4 | 字段名 image/avatar 不一致 | 🟡 中 | 混用 API 时出现 bug | P2 (本月修复) |
| 5 | createdAt 为 null 显示"—" | 🟡 中 | 信息显示不完整 | P2 (本月修复) |
| 6 | nickname + name 都为空 | 🟢 低 | 头像显示空字符 | P3 (优化) |
| 7 | level 为未知值 | 🟢 低 | 已有兜底，无需修复 | — |
| 8 | 生日时区偏移 | 🔴 高 | 用户看到错误日期 | P0 (立即修复) |

---

## 修复时间估计（基于代码复杂度）

| 优先级 | 任务数 | 单个耗时 | 总耗时 | 备注 |
|---|---|---|---|---|
| P0 | 3 (问题1/2/8) | 1-2小时 | 3-6小时 | 关键流程 |
| P1 | 1 (问题3) | 2-3小时 | 2-3小时 | 后端重构 |
| P2 | 2 (问题4/5) | 0.5-1小时 | 1-2小时 | 字段名统一 + 数据验证 |
| P3 | 1 (问题6) | 0.5小时 | 0.5小时 | 防御性编程 |

**总体耗时**: 6.5-11.5 小时（包含测试）

---

## 后续行动建议

1. **立即**：创建 3 个 P0 bug 工单（session、头像、生日）
2. **本周**：修复 P0，集成测试流程
3. **本月**：修复 P1/P2，统一 API 字段名、完善数据验证
4. **长期**：建立前后端数据一致性检测、孤儿文件清理机制
