/**
 * Points 表示例数据种子脚本
 */

import Database from "better-sqlite3";
import { nanoid } from "nanoid";
import * as fs from "fs";
import * as path from "path";

// 查找数据库文件
const dbDir = ".wrangler/state/v3/d1/miniflare-D1DatabaseObject";
const files = fs.readdirSync(dbDir).filter((f) => f.endsWith(".sqlite"));
if (files.length === 0) {
  console.error("未找到数据库文件");
  process.exit(1);
}

const dbPath = path.join(dbDir, files[0]);
console.log(`使用数据库: ${dbPath}\n`);

const db = new Database(dbPath);

// 示例数据
const samplePoints = [
  // 1. 梧桐山路线的途径点（有序）
  {
    id: `point_${nanoid()}`,
    entity_type: "route",
    entity_id: "route_wutongshan",
    type: "waypoint",
    name: "梧桐山村",
    description: "起点，有停车场和商店",
    coordinates: JSON.stringify({ lat: 22.5836, lng: 114.2165 }),
    order: 0,
    images: null,
    tags: null,
    extra: null,
  },
  {
    id: `point_${nanoid()}`,
    entity_type: "route",
    entity_id: "route_wutongshan",
    type: "waypoint",
    name: "好汉坡",
    description: "较陡的上坡路段，注意体力分配",
    coordinates: JSON.stringify({ lat: 22.5840, lng: 114.2170 }),
    order: 1,
    images: null,
    tags: null,
    extra: null,
  },
  {
    id: `point_${nanoid()}`,
    entity_type: "route",
    entity_id: "route_wutongshan",
    type: "waypoint",
    name: "大梧桐顶",
    description: "深圳最高峰，海拔943.7米",
    coordinates: JSON.stringify({ lat: 22.5850, lng: 114.2180 }),
    order: 2,
    images: null,
    tags: null,
    extra: null,
  },

  // 2. 梧桐山地点的打卡点（无序）
  {
    id: `point_${nanoid()}`,
    entity_type: "location",
    entity_id: "wutongshan",
    type: "checkpoint",
    name: "好汉坡打卡点",
    description: "好汉坡标志性打卡点",
    coordinates: JSON.stringify({ lat: 22.5840, lng: 114.2170 }),
    order: null,
    images: JSON.stringify([
      "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800",
    ]),
    tags: JSON.stringify(["热门", "必打卡"]),
    extra: null,
  },
  {
    id: `point_${nanoid()}`,
    entity_type: "location",
    entity_id: "wutongshan",
    type: "viewpoint",
    name: "山顶观景台",
    description: "可以俯瞰整个深圳市区",
    coordinates: JSON.stringify({ lat: 22.5850, lng: 114.2180 }),
    order: null,
    images: null,
    tags: JSON.stringify(["观景", "日出"]),
    extra: JSON.stringify({
      openHours: "全天开放",
      facilities: ["座椅", "拍照点"],
    }),
  },
  {
    id: `point_${nanoid()}`,
    entity_type: "location",
    entity_id: "wutongshan",
    type: "facility",
    name: "梧桐山村停车场",
    description: "收费停车场，车位充足",
    coordinates: JSON.stringify({ lat: 22.5836, lng: 114.2165 }),
    order: null,
    images: null,
    tags: JSON.stringify(["停车"]),
    extra: JSON.stringify({
      openHours: "24小时",
      fee: "10元/小时",
      facilities: ["洗手间", "小卖部"],
    }),
  },

  // 3. 七娘山路线的途径点（有序）
  {
    id: `point_${nanoid()}`,
    entity_type: "route",
    entity_id: "route_qiniangshan",
    type: "waypoint",
    name: "鹿嘴山庄",
    description: "起点，可以停车",
    coordinates: JSON.stringify({ lat: 22.5520, lng: 114.5500 }),
    order: 0,
    images: null,
    tags: null,
    extra: null,
  },
  {
    id: `point_${nanoid()}`,
    entity_type: "route",
    entity_id: "route_qiniangshan",
    type: "waypoint",
    name: "七娘山主峰",
    description: "深圳第二高峰，海拔869米",
    coordinates: JSON.stringify({ lat: 22.5530, lng: 114.5510 }),
    order: 1,
    images: null,
    tags: null,
    extra: null,
  },
];

console.log("开始插入示例数据...\n");

const now = Math.floor(Date.now() / 1000);

const transaction = db.transaction(() => {
  for (const point of samplePoints) {
    console.log(
      `插入: ${point.name} (${point.entity_type}/${point.type}${point.order !== null ? `, order=${point.order}` : ""})`
    );

    db.prepare(
      `
      INSERT INTO points (
        id, entity_type, entity_id, type, name, description,
        coordinates, "order", images, tags, extra, created_at, updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `
    ).run(
      point.id,
      point.entity_type,
      point.entity_id,
      point.type,
      point.name,
      point.description,
      point.coordinates,
      point.order,
      point.images,
      point.tags,
      point.extra,
      now,
      now
    );
  }
});

try {
  transaction();
  console.log("\n✅ 示例数据插入成功！\n");
} catch (error) {
  console.error("❌ 插入失败:", error);
  process.exit(1);
}

// 验证数据
console.log("验证插入结果...\n");

// 按类型统计
const typeStats = db
  .prepare(
    `
  SELECT entity_type, type, COUNT(*) as count
  FROM points
  GROUP BY entity_type, type
  ORDER BY entity_type, type
`
  )
  .all();

console.log("按类型统计:");
console.table(typeStats);

// 查询路线途径点（有序）
const routeWaypoints = db
  .prepare(
    `
  SELECT name, "order"
  FROM points
  WHERE entity_type = 'route' AND entity_id = 'route_wutongshan' AND type = 'waypoint'
  ORDER BY "order" ASC
`
  )
  .all();

console.log("\n梧桐山路线途径点（按顺序）:");
console.table(routeWaypoints);

// 查询地点兴趣点（无序）
const locationPoints = db
  .prepare(
    `
  SELECT type, name
  FROM points
  WHERE entity_type = 'location' AND entity_id = 'wutongshan'
  ORDER BY type
`
  )
  .all();

console.log("\n梧桐山地点兴趣点:");
console.table(locationPoints);

console.log("\n✅ 验证完成！");

db.close();
