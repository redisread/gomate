/**
 * 丽江 POI 数据种子
 */

import type Database from "better-sqlite3";
import { nanoid } from "nanoid";
import type { LocationData } from "../locations";
import type { RouteData } from "../routes";
import type { PoiData } from "./index";

const lijiangPoisData = [
  {
    name: "四方街",
    description: "丽江古城中心广场，纳西族传统集市",
    coordinates: JSON.stringify({ lat: 26.8721, lng: 100.2296 }),
    category: "checkpoint",
    extra: JSON.stringify({
      feature: "古城中心",
      type: "广场",
      tips: "晚上有篝火晚会",
    }),
  },
  {
    name: "木府",
    description: "纳西族土司衙门，丽江古城文化地标",
    coordinates: JSON.stringify({ lat: 26.8695, lng: 100.232 }),
    category: "checkpoint",
    extra: JSON.stringify({
      feature: "历史建筑",
      type: "文化景点",
      ticket: "收费",
    }),
  },
  {
    name: "狮子山",
    description: "俯瞰丽江古城全景的最佳位置",
    coordinates: JSON.stringify({ lat: 26.874, lng: 100.2335 }),
    category: "viewpoint",
    extra: JSON.stringify({
      feature: "观景台",
      type: "自然景点",
      bestTime: "傍晚看日落",
    }),
  },
  {
    name: "蓝月谷",
    description: "玉龙雪山脚下的蓝色湖泊群，被誉为小九寨",
    coordinates: JSON.stringify({ lat: 27.1, lng: 100.185 }),
    category: "viewpoint",
    extra: JSON.stringify({
      feature: "高山湖泊",
      type: "自然景观",
      ticket: "含在雪山门票内",
    }),
  },
  {
    name: "冰川公园",
    description: "玉龙雪山海拔4506米的冰川景观",
    coordinates: JSON.stringify({ lat: 27.105, lng: 100.182 }),
    category: "viewpoint",
    extra: JSON.stringify({
      feature: "冰川景观",
      type: "自然景观",
      tips: "注意高原反应",
    }),
  },
  {
    name: "里格半岛",
    description: "泸沽湖最美半岛，观日出绝佳位置",
    coordinates: JSON.stringify({ lat: 27.72, lng: 100.78 }),
    category: "viewpoint",
    extra: JSON.stringify({
      feature: "湖景半岛",
      type: "自然景观",
      bestTime: "清晨观日出",
    }),
  },
];

const entityToPoisData = [
  {
    poiName: "四方街",
    entityType: "location",
    entitySlug: "lijiang-old-town",
    roleType: "checkpoint",
  },
  {
    poiName: "木府",
    entityType: "location",
    entitySlug: "lijiang-old-town",
    roleType: "checkpoint",
  },
  {
    poiName: "狮子山",
    entityType: "location",
    entitySlug: "lijiang-old-town",
    roleType: "viewpoint",
  },
  {
    poiName: "蓝月谷",
    entityType: "location",
    entitySlug: "yulong-snow-mountain",
    roleType: "viewpoint",
  },
  {
    poiName: "冰川公园",
    entityType: "location",
    entitySlug: "yulong-snow-mountain",
    roleType: "viewpoint",
  },
  {
    poiName: "里格半岛",
    entityType: "location",
    entitySlug: "lugu-lake",
    roleType: "viewpoint",
  },
];

export function seedLijiangPois(
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

  for (const poi of lijiangPoisData) {
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

  return lijiangPoisData.map((poi) => ({
    id: poiMap.get(poi.name)!,
    name: poi.name,
  }));
}
