# Teams 表数据错位修复总结

## 问题描述

在访问 `/api/teams` 时遇到 JSON 解析错误：

```
SyntaxError: Unexpected token 'r', "recruiting" is not valid JSON
    at JSON.parse (<anonymous>)
    at app/api/teams/route.ts:228:47
```

## 根本原因

在 `migrations/0010_cleanup_locations_table.sql` 中，使用了 `INSERT INTO teams_new SELECT * FROM teams` 来复制数据。

**问题：**
1. 旧 `teams` 表的 `route_id` 列是通过 `ALTER TABLE` 添加的，位于表的最后
2. 新 `teams_new` 表的 `route_id` 列在 `location_id` 之后（第 3 列）
3. SQLite 的 `SELECT *` 按照列的物理顺序返回数据，而不是按列名匹配
4. `INSERT INTO ... SELECT *` 按位置对应，导致所有列从 `route_id` 开始向后错位

**错位映射：**
```
旧表列顺序（实际）：
id, location_id, leader_id, title, description, start_time, end_time,
duration, max_members, current_members, requirements, status,
created_at, updated_at, route_id (在最后)

新表列顺序（期望）：
id, location_id, route_id, leader_id, title, description, start_time,
end_time, duration, max_members, current_members, requirements, status,
created_at, updated_at

错位结果：
- 新表.route_id ← 旧表.leader_id
- 新表.leader_id ← 旧表.title
- 新表.requirements ← 旧表.status
- 新表.status ← 旧表.created_at
- 新表.created_at ← 旧表.updated_at
- 新表.updated_at ← 旧表.route_id
```

## 修复方案

### 1. 数据修复（已完成）

创建了 `migrations/0011_fix_teams_data_misalignment.sql`：

- 创建临时表 `teams_fixed`
- 使用明确的列名映射，从错位的列读取数据并写入正确的列
- 删除旧表，重命名新表
- 重建索引

**执行结果：**
- ✅ 所有 7 条 teams 记录已修复
- ✅ `requirements` 字段现在包含正确的 JSON 数组
- ✅ `status` 字段现在包含正确的状态值（recruiting/full）
- ✅ 时间戳字段恢复正常
- ✅ `route_id` 字段恢复正确的关联

### 2. API 容错处理（已完成）

在 `app/api/teams/route.ts:228` 添加了容错逻辑：

```typescript
requirements: (() => {
  try {
    if (row.requirements && typeof row.requirements === 'string') {
      // 检测数据错位：如果 requirements 包含状态值，返回空数组
      if (['recruiting', 'full', 'ongoing', 'completed', 'cancelled', 'open'].includes(row.requirements)) {
        console.warn(`Data misalignment detected for team ${row.id}`);
        return [];
      }
      return JSON.parse(row.requirements);
    }
    return [];
  } catch (error) {
    console.error(`Failed to parse requirements for team ${row.id}:`, error);
    return [];
  }
})(),
```

### 3. 预防措施（已完成）

修复了 `migrations/0010_cleanup_locations_table.sql`，将：

```sql
INSERT INTO teams_new
SELECT * FROM teams;
```

改为明确指定列名：

```sql
INSERT INTO teams_new (
  id, location_id, route_id, leader_id, title, description,
  start_time, end_time, duration, max_members, current_members,
  requirements, status, created_at, updated_at
)
SELECT
  id, location_id, route_id, leader_id, title, description,
  start_time, end_time, duration, max_members, current_members,
  requirements, status, created_at, updated_at
FROM teams;
```

## 验证结果

### 数据库验证

```bash
# 检查 status 字段
sqlite3 db.sqlite "SELECT id, status FROM teams WHERE status NOT IN ('recruiting', 'full', 'ongoing', 'completed', 'cancelled');"
# 结果：无记录（✓）

# 检查时间戳
sqlite3 db.sqlite "SELECT id, created_at FROM teams WHERE created_at < 1577836800;"
# 结果：无记录（✓）

# 检查 route_id 外键
sqlite3 db.sqlite "SELECT t.id FROM teams t LEFT JOIN routes r ON t.route_id = r.id WHERE r.id IS NULL;"
# 结果：无记录（✓）
```

### API 验证

```bash
# 测试获取所有队伍
curl http://localhost:3000/api/teams
# 结果：成功返回 7 条记录，requirements 为 JSON 数组，status 为有效枚举值（✓）

# 测试按地点查询
curl "http://localhost:3000/api/teams?locationId=qiniangshan"
# 结果：成功返回 2 条记录（✓）
```

## 经验教训

### 1. 避免使用 `SELECT *`

在数据迁移中，**永远不要使用 `SELECT *`**，尤其是在：
- 表结构发生变化后
- 使用 `ALTER TABLE ADD COLUMN` 添加过列
- 需要在新旧表之间复制数据时

**正确做法：**
```sql
INSERT INTO new_table (col1, col2, col3)
SELECT col1, col2, col3 FROM old_table;
```

### 2. SQLite 的 ALTER TABLE 限制

SQLite 的 `ALTER TABLE ADD COLUMN` 总是将新列添加到表的最后，即使在 schema 定义中它不是最后一列。这会导致列的逻辑顺序和物理顺序不一致。

**解决方案：**
- 如果需要在中间插入列，必须重建整个表
- 在数据迁移时明确指定列名

### 3. 迁移脚本测试

在执行迁移前，应该：
1. 备份数据库
2. 在测试环境验证迁移脚本
3. 检查 `PRAGMA table_info(table_name)` 确认列顺序
4. 验证关键字段的数据类型和值

### 4. 数据验证

迁移后应该运行验证查询：
- 检查枚举字段是否包含有效值
- 检查外键约束是否满足
- 检查 JSON 字段是否可解析
- 检查时间戳是否在合理范围内

## 相关文件

- `migrations/0009_refactor_locations_to_routes.sql` - 添加 route_id 列
- `migrations/0010_cleanup_locations_table.sql` - 导致问题的迁移（已修复）
- `migrations/0011_fix_teams_data_misalignment.sql` - 数据修复脚本
- `app/api/teams/route.ts` - 添加容错处理
- `db/schema.ts` - teams 表定义

## 修复时间线

- **2026-03-05 23:00** - 发现问题（API 返回 JSON 解析错误）
- **2026-03-05 23:15** - 定位根本原因（数据列错位）
- **2026-03-05 23:30** - 创建修复脚本并执行
- **2026-03-05 23:35** - 验证修复成功
- **2026-03-05 23:40** - 添加 API 容错处理
- **2026-03-05 23:45** - 修复原始迁移脚本

## 状态

✅ **已完全修复**

- 数据库数据已恢复正确
- API 正常工作
- 添加了容错处理
- 修复了根本原因
- 添加了预防措施
