/**
 * 凤凰山 POI 数据种子
 */

import type Database from "better-sqlite3";
import { nanoid } from "nanoid";
import type { LocationData } from "../locations";
import type { RouteData } from "../routes";
import type { PoiData } from "./index";

const fenghuangshanPoisData = [
  {
    name: "凤岩古庙",
    description: "凤凰山著名祈福圣地，始建于元代",
    coordinates: JSON.stringify({ lat: 22.7123, lng: 113.8567 }),
    category: "landmark",
    extra: JSON.stringify({
      history: "始建于元代",
      feature: "祈福圣地",
      fee: "免费",
    }),
  },
  {
    name: "凤凰山山顶",
    description: "宝安第一山，海拔376米",
    coordinates: JSON.stringify({ lat: 22.7156, lng: 113.8612 }),
    category: "mountain_peak",
    extra: JSON.stringify({
      elevation: 376,
      rank: "宝安第一山",
    }),
  },
  {
    name: "凤凰山广场",
    description: "登山起点，有大型停车场和游客中心",
    coordinates: JSON.stringify({ lat: 22.7089, lng: 113.8523 }),
    category: "checkpoint",
    extra: JSON.stringify({
      hasParking: true,
      hasRestroom: true,
      hasRestaurant: true,
    }),
  },
  {
    name: "望烟楼",
    description: "凤凰山观景平台，可俯瞰宝安城区",
    coordinates: JSON.stringify({ lat: 22.7145, lng: 113.8598 }),
    category: "viewpoint",
    extra: JSON.stringify({
      bestTime: "傍晚日落",
    }),
  },
];

const entityToPoisData = [
  {
    poiName: "凤岩古庙",
    entityType: "location",
    entitySlug: "fenghuangshan",
    roleType: "poi",
  },
  {
    poiName: "凤凰山山顶",
    entityType: "location",
    entitySlug: "fenghuangshan",
    roleType: "poi",
  },
  {
    poiName: "望烟楼",
    entityType: "location",
    entitySlug: "fenghuangshan",
    roleType: "viewpoint",
  },
];

export function seedFenghuangshanPois(
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

  for (const poi of fenghuangshanPoisData) {
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

  return fenghuangshanPoisData.map((poi) => ({
    id: poiMap.get(poi.name)!,
    name: poi.name,
  }));
}
