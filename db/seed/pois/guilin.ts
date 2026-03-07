/**
 * 桂林 POI 数据种子
 */

import type Database from "better-sqlite3";
import { nanoid } from "nanoid";
import type { LocationData } from "../locations";
import type { RouteData } from "../routes";
import type { PoiData } from "./index";

const guilinPoisData = [
  {
    name: "象鼻山",
    description: "桂林城徽，山形如象饮水",
    coordinates: JSON.stringify({ lat: 25.274, lng: 110.2993 }),
    category: "viewpoint",
    extra: JSON.stringify({
      feature: "标志性景观",
      type: "自然景观",
      ticket: "收费",
    }),
  },
  {
    name: "两江四湖码头",
    description: "夜游桂林环城水系的起点",
    coordinates: JSON.stringify({ lat: 25.28, lng: 110.295 }),
    category: "checkpoint",
    extra: JSON.stringify({
      feature: "游船码头",
      type: "交通枢纽",
      tips: "建议夜游",
    }),
  },
  {
    name: "正阳步行街",
    description: "桂林最繁华的商业步行街",
    coordinates: JSON.stringify({ lat: 25.278, lng: 110.3 }),
    category: "checkpoint",
    extra: JSON.stringify({
      feature: "商业街区",
      type: "购物美食",
      tips: "品尝桂林米粉",
    }),
  },
  {
    name: "西街",
    description: "阳朔最古老繁华的街道，有1400多年历史",
    coordinates: JSON.stringify({ lat: 25.7784, lng: 110.4966 }),
    category: "checkpoint",
    extra: JSON.stringify({
      feature: "历史街区",
      type: "文化景点",
      tips: "夜生活丰富",
    }),
  },
  {
    name: "金坑大寨",
    description: "龙脊梯田三大观景区中视野最开阔的",
    coordinates: JSON.stringify({ lat: 25.7261, lng: 110.074 }),
    category: "viewpoint",
    extra: JSON.stringify({
      feature: "梯田景观",
      type: "自然景观",
      bestTime: "灌水期和收割期",
    }),
  },
  {
    name: "平安寨七星伴月",
    description: "龙脊梯田经典观景台",
    coordinates: JSON.stringify({ lat: 25.73, lng: 110.08 }),
    category: "viewpoint",
    extra: JSON.stringify({
      feature: "梯田景观",
      type: "自然景观",
      tips: "日出最佳观赏点",
    }),
  },
];

const entityToPoisData = [
  {
    poiName: "象鼻山",
    entityType: "location",
    entitySlug: "guilin-city",
    roleType: "viewpoint",
  },
  {
    poiName: "两江四湖码头",
    entityType: "location",
    entitySlug: "guilin-city",
    roleType: "checkpoint",
  },
  {
    poiName: "正阳步行街",
    entityType: "location",
    entitySlug: "guilin-city",
    roleType: "checkpoint",
  },
  {
    poiName: "西街",
    entityType: "location",
    entitySlug: "yangshuo-west-street",
    roleType: "checkpoint",
  },
  {
    poiName: "金坑大寨",
    entityType: "location",
    entitySlug: "longji-terraces",
    roleType: "viewpoint",
  },
  {
    poiName: "平安寨七星伴月",
    entityType: "location",
    entitySlug: "longji-terraces",
    roleType: "viewpoint",
  },
];

export function seedGuilinPois(
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

  for (const poi of guilinPoisData) {
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

  return guilinPoisData.map((poi) => ({
    id: poiMap.get(poi.name)!,
    name: poi.name,
  }));
}
