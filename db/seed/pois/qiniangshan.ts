/**
 * 七娘山 POI 数据种子
 */

import type Database from "better-sqlite3";
import { nanoid } from "nanoid";
import type { LocationData } from "../locations";
import type { RouteData } from "../routes";
import type { PoiData } from "./index";

const qiniangshanPoisData = [
  {
    name: "七娘山主峰",
    description: "七娘山最高峰，海拔869米，深圳第二高峰，可俯瞰大鹏半岛全景",
    coordinates: JSON.stringify({ lat: 22.5289, lng: 114.5456 }),
    category: "mountain_peak",
    extra: JSON.stringify({
      elevation: 869,
      openHours: "全天开放",
      fee: "免费",
    }),
  },
  {
    name: "七娘山登山口",
    description: "主峰登山口起点，有登山指引标识",
    coordinates: JSON.stringify({ lat: 22.5234, lng: 114.5412 }),
    category: "checkpoint",
    extra: JSON.stringify({
      hasRestroom: true,
      hasParking: true,
    }),
  },
  {
    name: "七娘山观景平台",
    description: "半山腰观景平台，可远眺大鹏湾海景",
    coordinates: JSON.stringify({ lat: 22.5267, lng: 114.5434 }),
    category: "viewpoint",
    extra: JSON.stringify({
      elevation: 600,
      bestTime: "晴天视野最佳",
    }),
  },
];

const entityToPoisData = [
  {
    poiName: "七娘山主峰",
    entityType: "location",
    entitySlug: "qiniang-mountain",
    roleType: "poi",
  },
  {
    poiName: "七娘山观景平台",
    entityType: "location",
    entitySlug: "qiniang-mountain",
    roleType: "viewpoint",
  },
];

export function seedQiniangshanPois(
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

  for (const poi of qiniangshanPoisData) {
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

  return qiniangshanPoisData.map((poi) => ({
    id: poiMap.get(poi.name)!,
    name: poi.name,
  }));
}
