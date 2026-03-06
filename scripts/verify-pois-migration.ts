/**
 * POI 迁移验证脚本
 * 验证 pois + entity_to_pois 的数据完整性和正确性
 */

import Database from "better-sqlite3";
import * as fs from "fs";
import * as path from "path";

// 查找数据库文件
const dbDir = ".wrangler/state/v3/d1/miniflare-D1DatabaseObject";
const files = fs.readdirSync(dbDir).filter((f) => f.endsWith(".sqlite"));
if (files.length === 0) {
  console.error("❌ 未找到数据库文件");
  process.exit(1);
}

const dbPath = path.join(dbDir, files[0]);
console.log(`📁 使用数据库: ${dbPath}\n`);

const db = new Database(dbPath);

console.log("🔍 POI 迁移验证报告\n");
console.log("=" .repeat(60) + "\n");

// 1. 基础统计
console.log("📊 1. 基础统计\n");

const poisCount = db.prepare("SELECT COUNT(*) as count FROM pois").get() as {
  count: number;
};
const entityToPoisCount = db
  .prepare("SELECT COUNT(*) as count FROM entity_to_pois")
  .get() as { count: number };

console.log(`   POI 总数: ${poisCount.count}`);
console.log(`   角色关联总数: ${entityToPoisCount.count}\n`);

// 2. 按类别统计 POI
console.log("📊 2. POI 按类别统计\n");

const categoryStats = db
  .prepare(
    `
  SELECT category, COUNT(*) as count
  FROM pois
  GROUP BY category
  ORDER BY count DESC
`
  )
  .all();

console.table(categoryStats);

// 3. 按角色类型统计
console.log("📊 3. 角色关联按类型统计\n");

const roleTypeStats = db
  .prepare(
    `
  SELECT role_type, COUNT(*) as count
  FROM entity_to_pois
  GROUP BY role_type
  ORDER BY count DESC
`
  )
  .all();

console.table(roleTypeStats);

// 4. 按实体类型统计
console.log("📊 4. 角色关联按实体类型统计\n");

const entityTypeStats = db
  .prepare(
    `
  SELECT entity_type, COUNT(*) as count
  FROM entity_to_pois
  GROUP BY entity_type
  ORDER BY count DESC
`
  )
  .all();

console.table(entityTypeStats);

// 5. 多角色 POI（同一物理位置的多个角色）
console.log("📊 5. 多角色 POI（数据去重效果）\n");

const multiRolePois = db
  .prepare(
    `
  SELECT p.id, p.name, p.category, COUNT(etp.id) as role_count
  FROM pois p
  JOIN entity_to_pois etp ON p.id = etp.poi_id
  GROUP BY p.id
  HAVING role_count > 1
  ORDER BY role_count DESC
  LIMIT 10
`
  )
  .all();

if (multiRolePois.length > 0) {
  console.log(`   发现 ${multiRolePois.length} 个多角色 POI:\n`);
  console.table(multiRolePois);

  // 显示第一个多角色 POI 的详细信息
  const firstMultiRole = multiRolePois[0] as any;
  console.log(`\n   示例：${firstMultiRole.name} 的所有角色:\n`);

  const roles = db
    .prepare(
      `
    SELECT etp.entity_type, etp.entity_id, etp.role_type, etp."order"
    FROM entity_to_pois etp
    WHERE etp.poi_id = ?
    ORDER BY etp.entity_type, etp.role_type
  `
    )
    .all(firstMultiRole.id);

  console.table(roles);
} else {
  console.log("   未发现多角色 POI（所有 POI 都只有一个角色）\n");
}

// 6. 数据完整性检查
console.log("🔍 6. 数据完整性检查\n");

let hasErrors = false;

// 6.1 检查孤立的角色关联（没有对应的 POI）
const orphanedEntityToPois = db
  .prepare(
    `
  SELECT etp.id, etp.poi_id
  FROM entity_to_pois etp
  LEFT JOIN pois p ON etp.poi_id = p.id
  WHERE p.id IS NULL
`
  )
  .all();

if (orphanedEntityToPois.length > 0) {
  console.log(`   ❌ 发现 ${orphanedEntityToPois.length} 个孤立的角色关联\n`);
  console.table(orphanedEntityToPois);
  hasErrors = true;
} else {
  console.log("   ✅ 无孤立的角色关联\n");
}

// 6.2 检查重复的坐标
const duplicateCoords = db
  .prepare(
    `
  SELECT coordinates, COUNT(*) as count
  FROM pois
  GROUP BY coordinates
  HAVING count > 1
`
  )
  .all();

if (duplicateCoords.length > 0) {
  console.log(`   ❌ 发现 ${duplicateCoords.length} 个重复的坐标\n`);
  console.table(duplicateCoords);
  hasErrors = true;
} else {
  console.log("   ✅ 无重复坐标\n");
}

// 6.3 检查必填字段是否为空
const nullNamePois = db
  .prepare("SELECT id FROM pois WHERE name IS NULL OR name = ''")
  .all();
const nullCoordsPois = db
  .prepare(
    "SELECT id FROM pois WHERE coordinates IS NULL OR coordinates = ''"
  )
  .all();

if (nullNamePois.length > 0) {
  console.log(`   ❌ 发现 ${nullNamePois.length} 个 POI 的 name 为空\n`);
  hasErrors = true;
} else {
  console.log("   ✅ 所有 POI 的 name 字段非空\n");
}

if (nullCoordsPois.length > 0) {
  console.log(`   ❌ 发现 ${nullCoordsPois.length} 个 POI 的 coordinates 为空\n`);
  hasErrors = true;
} else {
  console.log("   ✅ 所有 POI 的 coordinates 字段非空\n");
}

// 6.4 检查唯一性约束
const duplicatePoiEntityRole = db
  .prepare(
    `
  SELECT poi_id, entity_type, entity_id, role_type, COUNT(*) as count
  FROM entity_to_pois
  GROUP BY poi_id, entity_type, entity_id, role_type
  HAVING count > 1
`
  )
  .all();

if (duplicatePoiEntityRole.length > 0) {
  console.log(
    `   ❌ 发现 ${duplicatePoiEntityRole.length} 个违反唯一性约束的记录\n`
  );
  console.table(duplicatePoiEntityRole);
  hasErrors = true;
} else {
  console.log("   ✅ 唯一性约束验证通过\n");
}

// 7. 查询示例
console.log("📋 7. 查询示例\n");

// 7.1 查询路线的所有途径点（按顺序）
console.log("   示例 1: 查询路线的途径点（有序）\n");

const routeWaypoints = db
  .prepare(
    `
  SELECT p.name, p.coordinates, etp."order", etp.role_specific_data
  FROM entity_to_pois etp
  JOIN pois p ON etp.poi_id = p.id
  WHERE etp.entity_type = 'route'
    AND etp.role_type = 'waypoint'
  ORDER BY etp.entity_id, etp."order" ASC
  LIMIT 5
`
  )
  .all();

if (routeWaypoints.length > 0) {
  console.table(routeWaypoints);
} else {
  console.log("   （无路线途径点数据）\n");
}

// 7.2 查询地点的所有兴趣点
console.log("   示例 2: 查询地点的兴趣点\n");

const locationPoints = db
  .prepare(
    `
  SELECT p.name, p.category, etp.role_type
  FROM entity_to_pois etp
  JOIN pois p ON etp.poi_id = p.id
  WHERE etp.entity_type = 'location'
  LIMIT 5
`
  )
  .all();

if (locationPoints.length > 0) {
  console.table(locationPoints);
} else {
  console.log("   （无地点兴趣点数据）\n");
}

// 7.3 查询同一物理位置的所有角色
console.log("   示例 3: 查询同一物理位置的所有角色\n");

const sameLocationRoles = db
  .prepare(
    `
  SELECT p.name, etp.entity_type, etp.role_type, etp.entity_id
  FROM pois p
  JOIN entity_to_pois etp ON p.id = etp.poi_id
  WHERE p.id IN (
    SELECT poi_id
    FROM entity_to_pois
    GROUP BY poi_id
    HAVING COUNT(*) > 1
  )
  ORDER BY p.id
  LIMIT 10
`
  )
  .all();

if (sameLocationRoles.length > 0) {
  console.table(sameLocationRoles);
} else {
  console.log("   （无多角色 POI 数据）\n");
}

// 8. 总结
console.log("=" .repeat(60) + "\n");

if (hasErrors) {
  console.log("❌ 验证失败：发现数据完整性问题\n");
  db.close();
  process.exit(1);
} else {
  console.log("✅ 验证通过：数据完整性良好\n");
  console.log("💡 建议：");
  console.log("   1. 测试应用功能是否正常");
  console.log("   2. 确认无误后，可以删除旧的 points 表");
  console.log("   3. 更新应用代码以使用新的 POI 表结构\n");
}

db.close();
