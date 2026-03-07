/**
 * 大笔架山 POI 数据种子
 */

import type Database from "better-sqlite3";
import { nanoid } from "nanoid";
import type { LocationData } from "../locations";
import type { RouteData } from "../routes";
import type { PoiData } from "./index";

const dabijiashanPoisData = [
  {
    name: "大笔架山主峰",
    description: "深圳十峰之一，海拔717米，深圳与惠州交界",
    coordinates: JSON.stringify({ lat: 22.6456, lng: 114.4123 }),
    category: "mountain_peak",
    extra: JSON.stringify({
      elevation: 717,
      rank: "深圳十峰之一",
      location: "深圳/惠州交界",
    }),
  },
  {
    name: "三水线起点",
    description: "深圳经典三水线徒步起点",
    coordinates: JSON.stringify({ lat: 22.6389, lng: 114.4056 }),
    category: "checkpoint",
    extra: JSON.stringify({
      hasParking: true,
      difficulty: "高难度长距离",
    }),
  },
  {
    name: "火烧天",
    description: "三水线中途重要山峰，海拔约500米",
    coordinates: JSON.stringify({ lat: 22.6412, lng: 114.4089 }),
    category: "mountain_peak",
    extra: JSON.stringify({
      elevation: 500,
      feature: "三水线必经点",
    }),
  },
  {
    name: "金龟村",
    description: "大笔架山附近村落，有补给点",
    coordinates: JSON.stringify({ lat: 22.6523, lng: 114.4189 }),
    category: "checkpoint",
    extra: JSON.stringify({
      hasParking: true,
      hasWater: true,
    }),
  },
];

const entityToPoisData = [
  {
    poiName: "大笔架山主峰",
    entityType: "location",
    entitySlug: "dabijiashan",
    roleType: "poi",
  },
  {
    poiName: "三水线起点",
    entityType: "location",
    entitySlug: "dabijiashan",
    roleType: "checkpoint",
  },
  {
    poiName: "火烧天",
    entityType: "location",
    entitySlug: "dabijiashan",
    roleType: "landmark",
  },
];

export function seedDabijiashanPois(
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

  for (const poi of dabijiashanPoisData) {
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

  return dabijiashanPoisData.map((poi) => ({
    id: poiMap.get(poi.name)!,
    name: poi.name,
  }));
}
