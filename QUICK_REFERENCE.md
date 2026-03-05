# User 表优化 - 快速参考

## 新增字段速查

| 字段名 | 类型 | 说明 | 示例值 |
|--------|------|------|--------|
| `nickname` | text | 用户昵称（展示用） | "山峰探险者" |
| `gender` | text | 性别 | "male", "female", "other" |
| `birthday` | integer | 生日时间戳 | 631152000000 (1990-01-01) |
| `extra` | text | JSON 扩展字段 | `{"equipment":["登山鞋"],"experience":"3年经验"}` |
| `status` | text | 用户状态 | "active", "suspended", "banned", "deleted" |
| `deletedAt` | integer | 软删除时间戳 | null 或时间戳 |

## 工具函数速查

### lib/user-utils.ts

```typescript
// 获取展示名称（优先 nickname）
getUserDisplayName({ name: "张三", nickname: "山峰探险者" })
// => "山峰探险者"

// 计算年龄
calculateAge(631152000000) // 1990-01-01
// => 36

// 获取年龄段
getAgeGroup(631152000000)
// => "36-45岁"

// 获取性别文本
getGenderText("male")
// => "男"
```

### lib/user-extra.ts

```typescript
// 解析 extra 字段
const extra = parseUserExtra(user.extra);
console.log(extra.equipment); // ["登山鞋", "冲锋衣"]
console.log(extra.experience); // "3年徒步经验"

// 校验 extra 数据
validateUserExtra({ equipment: ["登山鞋"], experience: "3年" })
// => true

// 序列化 extra 对象
stringifyUserExtra({ equipment: ["登山鞋"], experience: "3年" })
// => '{"equipment":["登山鞋"],"experience":"3年"}'

// 合并更新
mergeUserExtra(
  currentExtra,
  { equipment: ["新装备"] }
)
```

## API 使用示例

### 更新用户资料

```typescript
const response = await fetch("/api/user/update", {
  method: "PATCH",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    userId: user.id,
    nickname: "山峰探险者",
    gender: "male",
    birthday: "1990-01-01",
    extra: {
      equipment: ["登山鞋", "冲锋衣", "登山杖"],
      experience: "有3年徒步经验,完成过梧桐山、七娘山等路线"
    }
  })
});
```

## 数据库查询示例

### 查询用户完整信息

```sql
SELECT
  id, name, nickname, email, gender, birthday,
  level, bio, wechat, extra, status,
  created_at, updated_at
FROM users
WHERE id = 'user-1';
```

### 更新用户资料

```sql
UPDATE users
SET
  nickname = '山峰探险者',
  gender = 'male',
  birthday = 631152000000,
  extra = '{"equipment":["登山鞋"],"experience":"3年"}',
  updated_at = strftime('%s', 'now') * 1000
WHERE id = 'user-1';
```

### 查询活跃用户（排除已删除）

```sql
SELECT * FROM users
WHERE status = 'active'
  AND deleted_at IS NULL;
```

## 前端组件使用

### 展示用户信息

```tsx
import { getUserDisplayName, getAgeGroup, getGenderText } from "@/lib/user-utils";
import { parseUserExtra } from "@/lib/user-extra";

function UserProfile({ user }) {
  const displayName = getUserDisplayName(user);
  const ageGroup = getAgeGroup(user.birthday);
  const genderText = getGenderText(user.gender);
  const extra = parseUserExtra(user.extra);

  return (
    <div>
      <h1>{displayName}</h1>
      <p>{genderText} · {ageGroup}</p>
      {extra.equipment && (
        <p>装备: {extra.equipment.join("、")}</p>
      )}
      {extra.experience && (
        <p>经验: {extra.experience}</p>
      )}
    </div>
  );
}
```

## 常见问题

### Q1: nickname 为空时如何显示？
A: 使用 `getUserDisplayName(user)` 会自动回退到 name。

### Q2: extra 字段可以存储什么？
A: 仅建议存储 equipment（装备列表）和 experience（经验描述）。

### Q3: 如何计算完成徒步次数？
A: 动态查询 team_members 表：
```typescript
const count = await db
  .select({ count: sql`count(*)` })
  .from(teamMembers)
  .innerJoin(teams, eq(teams.id, teamMembers.teamId))
  .where(
    and(
      eq(teamMembers.userId, userId),
      eq(teamMembers.status, "approved"),
      eq(teams.status, "completed")
    )
  );
```

### Q4: 如何实现软删除？
A: 设置 status 和 deletedAt：
```typescript
await db.update(users)
  .set({
    status: "deleted",
    deletedAt: new Date(),
    updatedAt: new Date()
  })
  .where(eq(users.id, userId));
```

### Q5: birthday 如何处理？
A: 存储为时间戳，前端使用 date input，API 自动转换：
```typescript
// 前端
<input type="date" value="1990-01-01" />

// API 自动处理
birthday: typeof birthday === "string" ? new Date(birthday) : birthday
```

## 迁移脚本（生产环境）

```sql
-- 添加新字段
ALTER TABLE users ADD COLUMN nickname TEXT;
ALTER TABLE users ADD COLUMN gender TEXT;
ALTER TABLE users ADD COLUMN birthday INTEGER;
ALTER TABLE users ADD COLUMN extra TEXT;
ALTER TABLE users ADD COLUMN status TEXT DEFAULT 'active' NOT NULL;
ALTER TABLE users ADD COLUMN deleted_at INTEGER;

-- 创建索引
CREATE INDEX IF NOT EXISTS users_name_idx ON users(name);

-- 初始化现有用户状态
UPDATE users SET status = 'active' WHERE status IS NULL;
```

## 相关文档

- [完整实施总结](./USER_TABLE_OPTIMIZATION.md)
- [实施清单](./IMPLEMENTATION_CHECKLIST.md)
- [数据库 Schema](./db/schema.ts)
- [工具函数文档](./lib/user-utils.ts, ./lib/user-extra.ts)
