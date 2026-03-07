/**
 * 洱海 POI 数据种子
 */

import type Database from "better-sqlite3";
import { nanoid } from "nanoid";
import type { LocationData } from "../locations";
import type { RouteData } from "../routes";
import type { PoiData } from "./index";

const erhaiLakePoisData = [
  {
    name: "双廊古镇",
    description: "洱海东北岸最美古镇，杨丽萍太阳宫所在地",
    coordinates: JSON.stringify({ lat: 25.9167, lng: 100.2 }),
    category: "checkpoint",
    extra: JSON.stringify({
      feature: "白族古镇",
      type: "文化景点",
      tips: "可参观太阳宫",
    }),
  },
  {
    name: "挖色码头",
    description: "洱海东岸观日落最佳位置，水上栈道唯美",
    coordinates: JSON.stringify({ lat: 25.85, lng: 100.25 }),
    category: "viewpoint",
    extra: JSON.stringify({
      feature: "日落观景点",
      type: "摄影圣地",
      bestTime: "傍晚17:00-19:00",
    }),
  },
  {
    name: "小普陀",
    description: "洱海中的迷你小岛，冬季可观赏海鸥",
    coordinates: JSON.stringify({ lat: 25.8167, lng: 100.2333 }),
    category: "viewpoint",
    extra: JSON.stringify({
      feature: "湖中小岛",
      type: "自然景点",
      tips: "可乘船上岛",
    }),
  },
  {
    name: "才村码头",
    description: "大理古城附近最近的洱海码头，骑行出发点",
    coordinates: JSON.stringify({ lat: 25.7167, lng: 100.1833 }),
    category: "checkpoint",
    extra: JSON.stringify({
      feature: "环湖起点",
      type: "交通枢纽",
      tips: "租车骑行出发点",
    }),
  },
  {
    name: "海舌公园",
    description: "洱海西岸半岛形公园，三面环海景色优美",
    coordinates: JSON.stringify({ lat: 25.8333, lng: 100.1333 }),
    category: "viewpoint",
    extra: JSON.stringify({
      feature: "生态公园",
      type: "自然景观",
      ticket: "免费",
    }),
  },
  {
    name: "理想邦",
    description: "洱海东岸网红打卡点，白色建筑群被称为大理圣托里尼",
    coordinates: JSON.stringify({ lat: 25.7833, lng: 100.2667 }),
    category: "viewpoint",
    extra: JSON.stringify({
      feature: "网红建筑",
      type: "拍照圣地",
      tips: "建议上午前往光线好",
    }),
  },
  {
    name: "龙龛码头",
    description: "洱海西岸日出观景点，水杉林景观独特",
    coordinates: JSON.stringify({ lat: 25.7333, lng: 100.2167 }),
    category: "viewpoint",
    extra: JSON.stringify({
      feature: "日出观景点",
      type: "摄影圣地",
      bestTime: "清晨6:00-8:00",
    }),
  },
  {
    name: "磻溪S弯",
    description: "洱海西岸网红S型公路，骑行打卡必去",
    coordinates: JSON.stringify({ lat: 25.75, lng: 100.1667 }),
    category: "viewpoint",
    extra: JSON.stringify({
      feature: "网红公路",
      type: "骑行路线",
      tips: "注意安全车辆",
    }),
  },
];

const entityToPoisData = [
  {
    poiName: "双廊古镇",
    entityType: "location",
    entitySlug: "erhai-lake",
    roleType: "checkpoint",
  },
  {
    poiName: "挖色码头",
    entityType: "location",
    entitySlug: "erhai-lake",
    roleType: "viewpoint",
  },
  {
    poiName: "小普陀",
    entityType: "location",
    entitySlug: "erhai-lake",
    roleType: "viewpoint",
  },
  {
    poiName: "才村码头",
    entityType: "location",
    entitySlug: "erhai-lake",
    roleType: "checkpoint",
  },
  {
    poiName: "海舌公园",
    entityType: "location",
    entitySlug: "erhai-lake",
    roleType: "viewpoint",
  },
  {
    poiName: "理想邦",
    entityType: "location",
    entitySlug: "erhai-lake",
    roleType: "viewpoint",
  },
  {
    poiName: "龙龛码头",
    entityType: "location",
    entitySlug: "erhai-lake",
    roleType: "viewpoint",
  },
  {
    poiName: "磻溪S弯",
    entityType: "location",
    entitySlug: "erhai-lake",
    roleType: "viewpoint",
  },
];

export function seedErhaiLakePois(
  db: Database,
  locations: LocationData[],
  routes: RouteData[]
): PoiData[] {
  const insertPoiStmt = db.prepare(`
    INSERT OR IGNORE INTO pois (id, name, description, coordinates, category, extra, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const now = Date.now();
  const poiMap = new Map<string, string>();

  for (const poi of erhaiLakePoisData) {
    const id = nanoid();
    insertPoiStmt.run(
      id,
      poi.name,
      poi.description,
      poi.coordinates,
      poi.category,
      poi.extra,
      now,
      now
    );
    poiMap.set(poi.name, id);
    console.log(`  ✓ POI: ${poi.name}`);
  }

  const locationMap = new Map<string, string>();
  for (const loc of locations) {
    locationMap.set(loc.slug, loc.id);
  }

  const insertEntityPoiStmt = db.prepare(`
    INSERT OR IGNORE INTO entity_to_pois (
      id, poi_id, entity_type, entity_id, role_type, "order", role_specific_data, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  for (const assoc of entityToPoisData) {
    const poiId = poiMap.get(assoc.poiName);
    const entityId = locationMap.get(assoc.entitySlug);

    if (poiId && entityId) {
      insertEntityPoiStmt.run(
        nanoid(),
        poiId,
        assoc.entityType,
        entityId,
        assoc.roleType,
        null,
        null,
        now
      );
      console.log(`  ✓ 关联: ${assoc.poiName} -> ${assoc.entitySlug}`);
    }
  }

  return erhaiLakePoisData.map((poi) => ({
    id: poiMap.get(poi.name)!,
    name: poi.name,
  }));
}
