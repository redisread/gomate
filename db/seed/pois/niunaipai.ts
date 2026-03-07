/**
 * 牛奶排 POI 数据种子
 */

import type Database from "better-sqlite3";
import { nanoid } from "nanoid";
import type { LocationData } from "../locations";
import type { RouteData } from "../routes";
import type { PoiData } from "./index";

const niunaipaiPoisData = [
  {
    name: "牛奶排起点",
    description: "西涌沙滩附近，牛奶排海岸线穿越起点",
    coordinates: JSON.stringify({ lat: 22.4234, lng: 114.5012 }),
    category: "checkpoint",
    extra: JSON.stringify({
      hasParking: true,
      warning: "难度极高，仅限经验丰富者",
    }),
  },
  {
    name: "黑岩角",
    description: "牛奶排标志性海蚀地貌，需要绳降通过",
    coordinates: JSON.stringify({ lat: 22.4256, lng: 114.5034 }),
    category: "landmark",
    extra: JSON.stringify({
      difficulty: "需要专业装备和技能",
      warning: "绳降路段",
    }),
  },
  {
    name: "墨鱼眼",
    description: "独特的海蚀洞穴，形似墨鱼眼睛",
    coordinates: JSON.stringify({ lat: 22.4278, lng: 114.5056 }),
    category: "landmark",
    extra: JSON.stringify({
      feature: "天然海蚀洞",
      bestTime: "低潮时",
    }),
  },
  {
    name: "飞机石",
    description: "形似飞机的巨型礁石，牛奶排地标",
    coordinates: JSON.stringify({ lat: 22.429, lng: 114.5078 }),
    category: "landmark",
    extra: JSON.stringify({
      feature: "标志性景观",
      photoSpot: true,
    }),
  },
  {
    name: "牛奶排终点",
    description: "墨鱼眼附近，穿越路线终点",
    coordinates: JSON.stringify({ lat: 22.4301, lng: 114.509 }),
    category: "checkpoint",
    extra: JSON.stringify({
      note: "可原路返回或找船接送",
    }),
  },
];

const entityToPoisData = [
  {
    poiName: "黑岩角",
    entityType: "location",
    entitySlug: "niunaipai",
    roleType: "landmark",
  },
  {
    poiName: "墨鱼眼",
    entityType: "location",
    entitySlug: "niunaipai",
    roleType: "landmark",
  },
  {
    poiName: "飞机石",
    entityType: "location",
    entitySlug: "niunaipai",
    roleType: "poi",
  },
  {
    poiName: "牛奶排起点",
    entityType: "location",
    entitySlug: "niunaipai",
    roleType: "checkpoint",
  },
];

export function seedNiunaipaiPois(
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

  for (const poi of niunaipaiPoisData) {
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

  return niunaipaiPoisData.map((poi) => ({
    id: poiMap.get(poi.name)!,
    name: poi.name,
  }));
}
