/**
 * 大理 POI 数据种子
 */

import type Database from "better-sqlite3";
import { nanoid } from "nanoid";
import type { LocationData } from "../locations";
import type { RouteData } from "../routes";
import type { PoiData } from "./index";

const daliPoisData = [
  {
    name: "洱海",
    description: "云南第二大淡水湖，大理标志性景观",
    coordinates: JSON.stringify({ lat: 25.773, lng: 100.17 }),
    category: "viewpoint",
    extra: JSON.stringify({
      feature: "高原湖泊",
      bestTime: "清晨和傍晚",
      ticket: "免费",
    }),
  },
  {
    name: "大理古城南门",
    description: "大理古城正门，保存完好的明代城门",
    coordinates: JSON.stringify({ lat: 25.6925, lng: 100.1655 }),
    category: "checkpoint",
    extra: JSON.stringify({
      feature: "古城门",
      type: "历史建筑",
      tips: "可登城楼俯瞰古城",
    }),
  },
  {
    name: "崇圣寺三塔",
    description: "大理标志性古建筑，千年历史",
    coordinates: JSON.stringify({ lat: 25.7154, lng: 100.1469 }),
    category: "viewpoint",
    extra: JSON.stringify({
      feature: "佛教建筑",
      type: "文化景点",
      ticket: "收费",
    }),
  },
  {
    name: "喜洲古镇",
    description: "白族民居建筑群保存最完整的古镇",
    coordinates: JSON.stringify({ lat: 25.857, lng: 100.1286 }),
    category: "checkpoint",
    extra: JSON.stringify({
      feature: "白族古镇",
      type: "文化景点",
      tips: "品尝喜洲粑粑",
    }),
  },
  {
    name: "苍山洗马潭",
    description: "苍山山顶高山湖泊，海拔3920米",
    coordinates: JSON.stringify({ lat: 25.6819, lng: 100.1058 }),
    category: "viewpoint",
    extra: JSON.stringify({
      feature: "高山湖泊",
      type: "自然景观",
      ticket: "索道收费",
    }),
  },
  {
    name: "感通索道",
    description: "苍山景区主要索道之一，可直达玉带路",
    coordinates: JSON.stringify({ lat: 25.678, lng: 100.145 }),
    category: "checkpoint",
    extra: JSON.stringify({
      feature: "索道入口",
      type: "交通设施",
      ticket: "索道收费",
    }),
  },
  {
    name: "寂照庵",
    description: "苍山腰间的尼姑庵，以多肉植物和素斋闻名",
    coordinates: JSON.stringify({ lat: 25.679, lng: 100.148 }),
    category: "checkpoint",
    extra: JSON.stringify({
      feature: "佛教庵堂",
      type: "文化景点",
      tips: "素斋很有名",
    }),
  },
  {
    name: "玉带路",
    description: "苍山半山腰的徒步步道，可俯瞰洱海全景",
    coordinates: JSON.stringify({ lat: 25.685, lng: 100.12 }),
    category: "viewpoint",
    extra: JSON.stringify({
      feature: "徒步路线",
      type: "自然景观",
      tips: "平路适合散步",
    }),
  },
  {
    name: "大理火车站",
    description: "大理主要铁路交通枢纽",
    coordinates: JSON.stringify({ lat: 25.6065, lng: 100.2509 }),
    category: "checkpoint",
    extra: JSON.stringify({
      feature: "交通枢纽",
      type: "火车站",
      hasParking: true,
    }),
  },
];

const entityToPoisData = [
  {
    poiName: "洱海",
    entityType: "location",
    entitySlug: "dali-old-town",
    roleType: "viewpoint",
  },
  {
    poiName: "大理古城南门",
    entityType: "location",
    entitySlug: "dali-old-town",
    roleType: "checkpoint",
  },
  {
    poiName: "崇圣寺三塔",
    entityType: "location",
    entitySlug: "dali-old-town",
    roleType: "viewpoint",
  },
  {
    poiName: "喜洲古镇",
    entityType: "location",
    entitySlug: "dali-old-town",
    roleType: "checkpoint",
  },
  {
    poiName: "苍山洗马潭",
    entityType: "location",
    entitySlug: "cangshan-mountain",
    roleType: "viewpoint",
  },
  {
    poiName: "感通索道",
    entityType: "location",
    entitySlug: "cangshan-mountain",
    roleType: "checkpoint",
  },
  {
    poiName: "寂照庵",
    entityType: "location",
    entitySlug: "cangshan-mountain",
    roleType: "checkpoint",
  },
  {
    poiName: "玉带路",
    entityType: "location",
    entitySlug: "cangshan-mountain",
    roleType: "viewpoint",
  },
  {
    poiName: "大理火车站",
    entityType: "location",
    entitySlug: "dali-old-town",
    roleType: "checkpoint",
  },
];

export function seedDaliPois(
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

  for (const poi of daliPoisData) {
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

  return daliPoisData.map((poi) => ({
    id: poiMap.get(poi.name)!,
    name: poi.name,
  }));
}
