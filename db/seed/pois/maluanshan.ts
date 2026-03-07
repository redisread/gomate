/**
 * 马峦山 POI 数据种子
 */

import type Database from "better-sqlite3";
import { nanoid } from "nanoid";
import type { LocationData } from "../locations";
import type { RouteData } from "../routes";
import type { PoiData } from "./index";

const maluanshanPoisData = [
  {
    name: "马峦山瀑布群",
    description: "深圳最大瀑布群，雨季时最为壮观，有多个大小不一的瀑布",
    coordinates: JSON.stringify({ lat: 22.6456, lng: 114.3456 }),
    category: "landmark",
    extra: JSON.stringify({
      bestSeason: "夏季雨季",
      fee: "免费",
      warning: "雨后路滑注意安全",
    }),
  },
  {
    name: "大瀑布",
    description: "马峦山最大瀑布，落差约30米，夏季水量充沛",
    coordinates: JSON.stringify({ lat: 22.6478, lng: 114.3478 }),
    category: "landmark",
    extra: JSON.stringify({
      height: 30,
      bestTime: "雨后观赏",
    }),
  },
  {
    name: "马峦山村",
    description: "山脚下的客家古村，可品尝农家菜",
    coordinates: JSON.stringify({ lat: 22.6423, lng: 114.3423 }),
    category: "checkpoint",
    extra: JSON.stringify({
      hasParking: true,
      hasRestaurant: true,
      feature: "客家美食",
    }),
  },
  {
    name: "红花岭水库",
    description: "马峦山附近水库，风景优美",
    coordinates: JSON.stringify({ lat: 22.6512, lng: 114.3512 }),
    category: "viewpoint",
    extra: JSON.stringify({
      feature: "湖光山色",
    }),
  },
];

const entityToPoisData = [
  {
    poiName: "马峦山瀑布群",
    entityType: "location",
    entitySlug: "maluan-mountain",
    roleType: "poi",
  },
  {
    poiName: "大瀑布",
    entityType: "location",
    entitySlug: "maluan-mountain",
    roleType: "landmark",
  },
  {
    poiName: "马峦山村",
    entityType: "location",
    entitySlug: "maluan-mountain",
    roleType: "checkpoint",
  },
];

export function seedMaluanshanPois(
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

  for (const poi of maluanshanPoisData) {
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

  return maluanshanPoisData.map((poi) => ({
    id: poiMap.get(poi.name)!,
    name: poi.name,
  }));
}
