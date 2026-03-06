/**
 * Points 表数据迁移脚本
 * 将 points 表数据迁移到 pois + entity_to_pois 的新设计
 *
 * 迁移策略：
 * 1. 分析现有 points 数据，通过坐标识别重复的物理位置
 * 2. 提取唯一物理位置 → 插入 pois 表
 * 3. 为每个 point 创建对应的 entity_to_poi 关联
 * 4. 验证数据完整性
 */

import Database from "better-sqlite3";
import { nanoid } from "nanoid";
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

// 类型定义
interface Point {
  id: string;
  entity_type: string;
  entity_id: string;
  type: string;
  name: string;
  description: string | null;
  coordinates: string;
  order: number | null;
  images: string | null;
  tags: string | null;
  extra: string | null;
  created_at: number;
  updated_at: number;
}

interface Poi {
  id: string;
  name: string;
  description: string | null;
  coordinates: string;
  category: string | null;
  images: string | null;
  extra: string | null;
  created_at: number;
  updated_at: number;
}

interface EntityToPoi {
  id: string;
  poi_id: string;
  entity_type: string;
  entity_id: string;
  role_type: string;
  order: number | null;
  role_specific_data: string | null;
  created_at: number;
}

console.log("🔍 Step 1: 检查数据库状态...\n");

// 检查 points 表是否存在
const pointsTableExists = db
  .prepare(
    "SELECT name FROM sqlite_master WHERE type='table' AND name='points'"
  )
  .get();

if (!pointsTableExists) {
  console.log("⚠️  points 表不存在，无需迁移");
  db.close();
  process.exit(0);
}

// 检查 points 表是否有数据
const pointsCount = db.prepare("SELECT COUNT(*) as count FROM points").get() as {
  count: number;
};

if (pointsCount.count === 0) {
  console.log("⚠️  points 表为空，无需迁移");
  db.close();
  process.exit(0);
}

console.log(`✅ 发现 ${pointsCount.count} 条 point 记录\n`);

// 检查新表是否已存在
const poisTableExists = db
  .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='pois'")
  .get();
const entityToPoisTableExists = db
  .prepare(
    "SELECT name FROM sqlite_master WHERE type='table' AND name='entity_to_pois'"
  )
  .get();

if (!poisTableExists || !entityToPoisTableExists) {
  console.error(
    "❌ 新表 pois 或 entity_to_pois 不存在，请先执行迁移文件 0006_pois_and_entity_to_pois.sql"
  );
  db.close();
  process.exit(1);
}

console.log("✅ 新表已创建\n");

console.log("🔍 Step 2: 分析数据，识别重复的物理位置...\n");

// 获取所有 points
const allPoints = db.prepare("SELECT * FROM points").all() as Point[];

// 按坐标分组，识别重复的物理位置
const coordinatesMap = new Map<string, Point[]>();

for (const point of allPoints) {
  if (!coordinatesMap.has(point.coordinates)) {
    coordinatesMap.set(point.coordinates, []);
  }
  coordinatesMap.get(point.coordinates)!.push(point);
}

console.log(`📊 统计信息:`);
console.log(`   - 总 point 数: ${allPoints.length}`);
console.log(`   - 唯一坐标数: ${coordinatesMap.size}`);
console.log(
  `   - 重复位置数: ${allPoints.length - coordinatesMap.size}\n`
);

// 显示重复位置的详情
const duplicates = Array.from(coordinatesMap.entries()).filter(
  ([_, points]) => points.length > 1
);

if (duplicates.length > 0) {
  console.log(`🔄 发现 ${duplicates.length} 个重复的物理位置:\n`);
  for (const [coords, points] of duplicates) {
    const coordsObj = JSON.parse(coords);
    console.log(
      `   📍 坐标 (${coordsObj.lat}, ${coordsObj.lng}) - ${points.length} 个角色:`
    );
    for (const point of points) {
      console.log(
        `      - ${point.name} (${point.entity_type}/${point.type})`
      );
    }
    console.log("");
  }
}

console.log("🚀 Step 3: 开始数据迁移...\n");

const now = Math.floor(Date.now() / 1000);
const poisToInsert: Poi[] = [];
const entityToPoisToInsert: EntityToPoi[] = [];

// 为每个唯一坐标创建一个 POI
for (const [coordinates, points] of coordinatesMap.entries()) {
  // 使用第一个 point 的信息作为 POI 的基础信息
  const firstPoint = points[0];
  const poiId = `poi_${nanoid()}`;

  // 推断 category（基于 type）
  const categoryMap: Record<string, string> = {
    waypoint: "trail_marker",
    checkpoint: "checkpoint",
    viewpoint: "viewpoint",
    facility: "other",
    poi: "other",
  };
  const category = categoryMap[firstPoint.type] || "other";

  // 创建 POI 记录
  const poi: Poi = {
    id: poiId,
    name: firstPoint.name,
    description: firstPoint.description,
    coordinates: coordinates,
    category: category,
    images: firstPoint.images,
    extra: firstPoint.extra,
    created_at: firstPoint.created_at,
    updated_at: now,
  };

  poisToInsert.push(poi);

  // 为每个 point 创建 entity_to_poi 关联
  for (const point of points) {
    const entityToPoiId = `etp_${nanoid()}`;

    // 提取角色特定数据（从 description 或 extra）
    let roleSpecificData: any = null;
    if (point.type === "waypoint" && point.description) {
      roleSpecificData = { instructions: point.description };
    } else if (point.type === "viewpoint" && point.extra) {
      try {
        const extra = JSON.parse(point.extra);
        roleSpecificData = {
          viewDescription: point.description,
          openHours: extra.openHours,
        };
      } catch (e) {
        // 忽略 JSON 解析错误
      }
    }

    const entityToPoi: EntityToPoi = {
      id: entityToPoiId,
      poi_id: poiId,
      entity_type: point.entity_type,
      entity_id: point.entity_id,
      role_type: point.type,
      order: point.order,
      role_specific_data: roleSpecificData
        ? JSON.stringify(roleSpecificData)
        : null,
      created_at: point.created_at,
    };

    entityToPoisToInsert.push(entityToPoi);
  }
}

console.log(`📝 准备插入:`);
console.log(`   - ${poisToInsert.length} 条 POI 记录`);
console.log(`   - ${entityToPoisToInsert.length} 条角色关联记录\n`);

// 执行插入（使用事务）
const transaction = db.transaction(() => {
  // 插入 POIs
  const insertPoiStmt = db.prepare(`
    INSERT INTO pois (id, name, description, coordinates, category, images, extra, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  for (const poi of poisToInsert) {
    insertPoiStmt.run(
      poi.id,
      poi.name,
      poi.description,
      poi.coordinates,
      poi.category,
      poi.images,
      poi.extra,
      poi.created_at,
      poi.updated_at
    );
  }

  // 插入 EntityToPois
  const insertEntityToPoiStmt = db.prepare(`
    INSERT INTO entity_to_pois (id, poi_id, entity_type, entity_id, role_type, "order", role_specific_data, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  for (const entityToPoi of entityToPoisToInsert) {
    insertEntityToPoiStmt.run(
      entityToPoi.id,
      entityToPoi.poi_id,
      entityToPoi.entity_type,
      entityToPoi.entity_id,
      entityToPoi.role_type,
      entityToPoi.order,
      entityToPoi.role_specific_data,
      entityToPoi.created_at
    );
  }
});

try {
  transaction();
  console.log("✅ 数据迁移成功！\n");
} catch (error) {
  console.error("❌ 迁移失败:", error);
  db.close();
  process.exit(1);
}

console.log("🔍 Step 4: 验证数据完整性...\n");

// 验证记录数量
const poisCount = db.prepare("SELECT COUNT(*) as count FROM pois").get() as {
  count: number;
};
const entityToPoisCount = db
  .prepare("SELECT COUNT(*) as count FROM entity_to_pois")
  .get() as { count: number };

console.log("📊 迁移后统计:");
console.log(`   - POI 记录数: ${poisCount.count} (预期: ${poisToInsert.length})`);
console.log(
  `   - 角色关联记录数: ${entityToPoisCount.count} (预期: ${entityToPoisToInsert.length})`
);
console.log(
  `   - 原 point 记录数: ${pointsCount.count} (应等于角色关联数)\n`
);

// 验证数量一致性
if (
  poisCount.count !== poisToInsert.length ||
  entityToPoisCount.count !== entityToPoisToInsert.length ||
  entityToPoisCount.count !== pointsCount.count
) {
  console.error("❌ 数据数量不一致，迁移可能有问题");
  db.close();
  process.exit(1);
}

// 验证坐标唯一性（不应有重复坐标）
const duplicateCoords = db
  .prepare(
    `
  SELECT coordinates, COUNT(*) as count
  FROM pois
  GROUP BY coordinates
  HAVING count > 1
`
  )
  .all() as { coordinates: string; count: number }[];

if (duplicateCoords.length > 0) {
  console.error("❌ 发现重复坐标的 POI:");
  console.table(duplicateCoords);
  db.close();
  process.exit(1);
}

console.log("✅ 坐标唯一性验证通过\n");

// 验证关联完整性（每个 entity_to_poi 都应该有对应的 POI）
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
  console.error("❌ 发现孤立的角色关联（没有对应的 POI）:");
  console.table(orphanedEntityToPois);
  db.close();
  process.exit(1);
}

console.log("✅ 关联完整性验证通过\n");

// 显示迁移结果示例
console.log("📋 迁移结果示例:\n");

// 查询一个有多个角色的 POI
const multiRolePoi = db
  .prepare(
    `
  SELECT p.id, p.name, p.coordinates, COUNT(etp.id) as role_count
  FROM pois p
  JOIN entity_to_pois etp ON p.id = etp.poi_id
  GROUP BY p.id
  HAVING role_count > 1
  LIMIT 1
`
  )
  .get() as { id: string; name: string; coordinates: string; role_count: number } | undefined;

if (multiRolePoi) {
  console.log(`POI: ${multiRolePoi.name}`);
  console.log(`坐标: ${multiRolePoi.coordinates}`);
  console.log(`角色数量: ${multiRolePoi.role_count}\n`);

  const roles = db
    .prepare(
      `
    SELECT entity_type, entity_id, role_type, "order", role_specific_data
    FROM entity_to_pois
    WHERE poi_id = ?
  `
    )
    .all(multiRolePoi.id);

  console.log("角色列表:");
  console.table(roles);
}

console.log("\n✅ 迁移完成！");
console.log("\n⚠️  注意事项:");
console.log("   1. 请测试应用功能是否正常");
console.log("   2. 确认无误后，可以运行 scripts/cleanup-old-points-table.ts 删除旧的 points 表");
console.log("   3. 更新应用代码以使用新的 POI 表结构\n");

db.close();
