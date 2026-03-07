/**
 * 大雁顶 POI 数据种子
 */

import type Database from "better-sqlite3";
import { nanoid } from "nanoid";
import type { LocationData } from "../locations";
import type { RouteData } from "../routes";
import type { PoiData } from "./index";

const dayandingPoisData = [
  {
    name: "大雁顶主峰",
    description: "深圳第三高峰，海拔801米，可360度俯瞰大鹏半岛海景",
    coordinates: JSON.stringify({ lat: 22.4789, lng: 114.5678 }),
    category: "mountain_peak",
    extra: JSON.stringify({
      elevation: 801,
      rank: "深圳第三高峰",
      bestTime: "日出时分",
    }),
  },
  {
    name: "鹿嘴山庄",
    description: "大雁顶登山起点，有停车场和美人鱼拍摄地",
    coordinates: JSON.stringify({ lat: 22.4723, lng: 114.5612 }),
    category: "checkpoint",
    extra: JSON.stringify({
      hasParking: true,
      hasRestroom: true,
      feature: "美人鱼拍摄地",
    }),
  },
  {
    name: "杨梅坑",
    description: "前往鹿嘴山庄的必经之地，有码头和沙滩",
    coordinates: JSON.stringify({ lat: 22.4689, lng: 114.5589 }),
    category: "checkpoint",
    extra: JSON.stringify({
      hasParking: true,
      transport: "可乘船或徒步",
    }),
  },
  {
    name: "大雁顶观景台",
    description: "半山腰观景平台，可远眺七娘山",
    coordinates: JSON.stringify({ lat: 22.4756, lng: 114.5645 }),
    category: "viewpoint",
    extra: JSON.stringify({
      elevation: 500,
    }),
  },
];

const entityToPoisData = [
  {
    poiName: "大雁顶主峰",
    entityType: "location",
    entitySlug: "dayanding",
    roleType: "poi",
  },
  {
    poiName: "鹿嘴山庄",
    entityType: "location",
    entitySlug: "dayanding",
    roleType: "checkpoint",
  },
  {
    poiName: "大雁顶观景台",
    entityType: "location",
    entitySlug: "dayanding",
    roleType: "viewpoint",
  },
];

export function seedDayandingPois(
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

  for (const poi of dayandingPoisData) {
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

  return dayandingPoisData.map((poi) => ({
    id: poiMap.get(poi.name)!,
    name: poi.name,
  }));
}
