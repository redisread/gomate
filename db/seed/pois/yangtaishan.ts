/**
 * 阳台山 POI 数据种子
 */

import type Database from "better-sqlite3";
import { nanoid } from "nanoid";
import type { LocationData } from "../locations";
import type { RouteData } from "../routes";
import type { PoiData } from "./index";

const yangtaishanPoisData = [
  {
    name: "阳台山山顶",
    description: "阳台山主峰，海拔587.3米，深圳西部最高峰",
    coordinates: JSON.stringify({ lat: 22.6789, lng: 113.9654 }),
    category: "mountain_peak",
    extra: JSON.stringify({
      elevation: 587.3,
      openHours: "全天开放",
      fee: "免费",
    }),
  },
  {
    name: "大阳台山顶",
    description: "大阳台山顶观景台，可俯瞰石岩湖和深圳西部",
    coordinates: JSON.stringify({ lat: 22.6795, lng: 113.9667 }),
    category: "viewpoint",
    extra: JSON.stringify({
      elevation: 580,
      bestTime: "日落时分",
    }),
  },
  {
    name: "小阳台山顶",
    description: "小阳台山顶，相对平缓，适合家庭登高",
    coordinates: JSON.stringify({ lat: 22.6767, lng: 113.9634 }),
    category: "mountain_peak",
    extra: JSON.stringify({
      elevation: 450,
      difficulty: "入门级",
    }),
  },
  {
    name: "阳台山牌坊",
    description: "阳台山森林公园正门入口，登山起点",
    coordinates: JSON.stringify({ lat: 22.6723, lng: 113.9589 }),
    category: "checkpoint",
    extra: JSON.stringify({
      hasParking: true,
      hasRestroom: true,
      hasWater: true,
    }),
  },
];

const entityToPoisData = [
  {
    poiName: "阳台山山顶",
    entityType: "location",
    entitySlug: "yangtai-mountain",
    roleType: "poi",
  },
  {
    poiName: "大阳台山顶",
    entityType: "location",
    entitySlug: "yangtai-mountain",
    roleType: "viewpoint",
  },
  {
    poiName: "小阳台山顶",
    entityType: "location",
    entitySlug: "yangtai-mountain",
    roleType: "poi",
  },
];

export function seedYangtaishanPois(
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

  for (const poi of yangtaishanPoisData) {
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

  return yangtaishanPoisData.map((poi) => ({
    id: poiMap.get(poi.name)!,
    name: poi.name,
  }));
}
