/**
 * 大南山 POI 数据种子
 */

import type Database from "better-sqlite3";
import { nanoid } from "nanoid";
import type { LocationData } from "../locations";
import type { RouteData } from "../routes";
import type { PoiData } from "./index";

const dananshanPoisData = [
  {
    name: "大南山山顶",
    description: "南山第一峰，海拔336米，可俯瞰深圳湾和香港元朗",
    coordinates: JSON.stringify({ lat: 22.5123, lng: 113.9234 }),
    category: "mountain_peak",
    extra: JSON.stringify({
      elevation: 336,
      view: "深圳湾、香港元朗、前海自贸区",
      bestTime: "日落和夜景",
    }),
  },
  {
    name: "齐天亭",
    description: "大南山著名观景亭，赏夜景最佳位置",
    coordinates: JSON.stringify({ lat: 22.5145, lng: 113.9256 }),
    category: "viewpoint",
    extra: JSON.stringify({
      bestTime: "傍晚至夜晚",
      feature: "城市夜景",
    }),
  },
  {
    name: "大南山北登山口",
    description: "荔林公园登山入口，交通便利",
    coordinates: JSON.stringify({ lat: 22.5189, lng: 113.9289 }),
    category: "checkpoint",
    extra: JSON.stringify({
      hasParking: true,
      transport: "地铁荔林站",
    }),
  },
  {
    name: "大南山别墅登山口",
    description: "海上世界附近登山口，靠近别墅区",
    coordinates: JSON.stringify({ lat: 22.5056, lng: 113.9189 }),
    category: "checkpoint",
    extra: JSON.stringify({
      hasParking: false,
      transport: "地铁海上世界站",
    }),
  },
];

const entityToPoisData = [
  {
    poiName: "大南山山顶",
    entityType: "location",
    entitySlug: "dananshan",
    roleType: "poi",
  },
  {
    poiName: "齐天亭",
    entityType: "location",
    entitySlug: "dananshan",
    roleType: "viewpoint",
  },
  {
    poiName: "大南山北登山口",
    entityType: "location",
    entitySlug: "dananshan",
    roleType: "checkpoint",
  },
];

export function seedDananshanPois(
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

  for (const poi of dananshanPoisData) {
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

  return dananshanPoisData.map((poi) => ({
    id: poiMap.get(poi.name)!,
    name: poi.name,
  }));
}
