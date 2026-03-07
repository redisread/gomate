/**
 * 东西涌 POI 数据种子
 */

import type Database from "better-sqlite3";
import { nanoid } from "nanoid";
import type { LocationData } from "../locations";
import type { RouteData } from "../routes";
import type { PoiData } from "./index";

const dongxichongPoisData = [
  {
    name: "东涌沙滩",
    description: "东西涌穿越起点，有停车场和补给点",
    coordinates: JSON.stringify({ lat: 22.4765, lng: 114.5689 }),
    category: "checkpoint",
    extra: JSON.stringify({
      hasParking: true,
      hasRestroom: true,
      fee: "沙滩门票20元",
    }),
  },
  {
    name: "西涌沙滩",
    description: "东西涌穿越终点，中国最美八大海滩之一",
    coordinates: JSON.stringify({ lat: 22.4789, lng: 114.5623 }),
    category: "checkpoint",
    extra: JSON.stringify({
      hasParking: true,
      hasRestroom: true,
      fee: "沙滩门票30元",
    }),
  },
  {
    name: "鬼仔角",
    description: "东西涌海岸线标志性景点，海蚀地貌奇观",
    coordinates: JSON.stringify({ lat: 22.4778, lng: 114.5656 }),
    category: "viewpoint",
    extra: JSON.stringify({
      bestTime: "低潮时通过",
      warning: "注意潮汐变化",
    }),
  },
  {
    name: "穿鼻岩",
    description: "海岸线上的天然岩洞，需攀爬通过",
    coordinates: JSON.stringify({ lat: 22.4772, lng: 114.5645 }),
    category: "landmark",
    extra: JSON.stringify({
      difficulty: "需要手脚并用",
    }),
  },
];

const entityToPoisData = [
  {
    poiName: "东涌沙滩",
    entityType: "location",
    entitySlug: "dongxichong",
    roleType: "checkpoint",
  },
  {
    poiName: "西涌沙滩",
    entityType: "location",
    entitySlug: "dongxichong",
    roleType: "checkpoint",
  },
  {
    poiName: "鬼仔角",
    entityType: "location",
    entitySlug: "dongxichong",
    roleType: "viewpoint",
  },
  {
    poiName: "穿鼻岩",
    entityType: "location",
    entitySlug: "dongxichong",
    roleType: "landmark",
  },
];

export function seedDongxichongPois(
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

  for (const poi of dongxichongPoisData) {
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

  return dongxichongPoisData.map((poi) => ({
    id: poiMap.get(poi.name)!,
    name: poi.name,
  }));
}
