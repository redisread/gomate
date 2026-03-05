#!/bin/bash

# Teams 表数据验证脚本
# 用于验证数据修复后的数据完整性

set -e

DB_PATH=".wrangler/state/v3/d1/miniflare-D1DatabaseObject/*.sqlite"

echo "========================================="
echo "Teams 表数据验证"
echo "========================================="
echo ""

# 1. 检查 status 字段
echo "1. 检查 status 字段是否为有效枚举值..."
INVALID_STATUS=$(sqlite3 $DB_PATH "SELECT COUNT(*) FROM teams WHERE status NOT IN ('recruiting', 'full', 'ongoing', 'completed', 'cancelled', 'open');")
if [ "$INVALID_STATUS" -eq 0 ]; then
  echo "   ✅ 所有 status 值都有效"
else
  echo "   ❌ 发现 $INVALID_STATUS 条无效的 status 记录"
  sqlite3 -header -column $DB_PATH "SELECT id, status FROM teams WHERE status NOT IN ('recruiting', 'full', 'ongoing', 'completed', 'cancelled', 'open');"
fi
echo ""

# 2. 检查 requirements 字段
echo "2. 检查 requirements 字段是否为有效 JSON..."
INVALID_JSON=0
while IFS='|' read -r id requirements; do
  if [ -n "$requirements" ]; then
    if ! echo "$requirements" | jq . > /dev/null 2>&1; then
      echo "   ❌ team $id 的 requirements 不是有效 JSON: $requirements"
      INVALID_JSON=$((INVALID_JSON + 1))
    fi
  fi
done < <(sqlite3 $DB_PATH "SELECT id, requirements FROM teams WHERE requirements IS NOT NULL;")

if [ "$INVALID_JSON" -eq 0 ]; then
  echo "   ✅ 所有 requirements 都是有效 JSON"
else
  echo "   ❌ 发现 $INVALID_JSON 条无效的 JSON 记录"
fi
echo ""

# 3. 检查时间戳字段
echo "3. 检查时间戳字段是否合理（2020年后）..."
INVALID_TIMESTAMP=$(sqlite3 $DB_PATH "SELECT COUNT(*) FROM teams WHERE created_at < 1577836800 OR updated_at < 1577836800;")
if [ "$INVALID_TIMESTAMP" -eq 0 ]; then
  echo "   ✅ 所有时间戳都合理"
else
  echo "   ❌ 发现 $INVALID_TIMESTAMP 条无效的时间戳记录"
  sqlite3 -header -column $DB_PATH "SELECT id, created_at, updated_at FROM teams WHERE created_at < 1577836800 OR updated_at < 1577836800;"
fi
echo ""

# 4. 检查 route_id 外键
echo "4. 检查 route_id 外键约束..."
INVALID_ROUTE=$(sqlite3 $DB_PATH "SELECT COUNT(*) FROM teams t LEFT JOIN routes r ON t.route_id = r.id WHERE r.id IS NULL;")
if [ "$INVALID_ROUTE" -eq 0 ]; then
  echo "   ✅ 所有 route_id 都存在"
else
  echo "   ❌ 发现 $INVALID_ROUTE 条无效的 route_id"
  sqlite3 -header -column $DB_PATH "SELECT t.id, t.route_id FROM teams t LEFT JOIN routes r ON t.route_id = r.id WHERE r.id IS NULL;"
fi
echo ""

# 5. 检查 leader_id 外键
echo "5. 检查 leader_id 外键约束..."
INVALID_LEADER=$(sqlite3 $DB_PATH "SELECT COUNT(*) FROM teams t LEFT JOIN users u ON t.leader_id = u.id WHERE u.id IS NULL;")
if [ "$INVALID_LEADER" -eq 0 ]; then
  echo "   ✅ 所有 leader_id 都存在"
else
  echo "   ❌ 发现 $INVALID_LEADER 条无效的 leader_id"
  sqlite3 -header -column $DB_PATH "SELECT t.id, t.leader_id FROM teams t LEFT JOIN users u ON t.leader_id = u.id WHERE u.id IS NULL;"
fi
echo ""

# 6. 检查 location_id 外键
echo "6. 检查 location_id 外键约束..."
INVALID_LOCATION=$(sqlite3 $DB_PATH "SELECT COUNT(*) FROM teams t LEFT JOIN locations l ON t.location_id = l.id WHERE l.id IS NULL;")
if [ "$INVALID_LOCATION" -eq 0 ]; then
  echo "   ✅ 所有 location_id 都存在"
else
  echo "   ❌ 发现 $INVALID_LOCATION 条无效的 location_id"
  sqlite3 -header -column $DB_PATH "SELECT t.id, t.location_id FROM teams t LEFT JOIN locations l ON t.location_id = l.id WHERE l.id IS NULL;"
fi
echo ""

# 7. 统计信息
echo "7. 统计信息..."
TOTAL_TEAMS=$(sqlite3 $DB_PATH "SELECT COUNT(*) FROM teams;")
echo "   总队伍数: $TOTAL_TEAMS"

BY_STATUS=$(sqlite3 $DB_PATH "SELECT status, COUNT(*) FROM teams GROUP BY status;")
echo "   按状态分布:"
while IFS='|' read -r status count; do
  echo "     - $status: $count"
done <<< "$BY_STATUS"
echo ""

# 8. 示例数据
echo "8. 示例数据（前 3 条）..."
sqlite3 -header -column $DB_PATH "SELECT id, title, status, requirements FROM teams LIMIT 3;"
echo ""

echo "========================================="
echo "验证完成"
echo "========================================="
