/**
 * 梅沙尖 POI 数据种子
 */

import type Database from "better-sqlite3";
import { nanoid } from "nanoid";
import type { LocationData } from "../locations";
import type { RouteData } from "../routes";
import type { PoiData } from "./index";

const meishajianPoisData = [
  {
    name: "梅沙尖主峰",
    description: "深圳第四高峰，海拔753米，360度观景平台",
    coordinates: JSON.stringify({ lat: 22.6012, lng: 114.289 }),
    category: "mountain_peak",
    extra: JSON.stringify({
      elevation: 753,
      rank: "深圳第四高峰",
      view: "盐田港、大梅沙、梧桐山、七娘山",
    }),
  },
  {
    name: "山海大观入口",
    description: "梅沙尖推荐登山入口，风景最佳",
    coordinates: JSON.stringify({ lat: 22.5956, lng: 114.2834 }),
    category: "checkpoint",
    extra: JSON.stringify({
      hasParking: true,
      difficulty: "部分路段为野路",
    }),
  },
  {
    name: "三洲田水库",
    description: "梅沙尖附近高山湖泊，云雾缭绕",
    coordinates: JSON.stringify({ lat: 22.6089, lng: 114.2956 }),
    category: "viewpoint",
    extra: JSON.stringify({
      feature: "云海观赏点",
      bestTime: "清晨",
    }),
  },
  {
    name: "茶溪谷",
    description: "东部华侨城景区，可从北侧登梅沙尖",
    coordinates: JSON.stringify({ lat: 22.6123, lng: 114.3012 }),
    category: "checkpoint",
    extra: JSON.stringify({
      hasParking: true,
      fee: "景区门票",
    }),
  },
];

const entityToPoisData = [
  {
    poiName: "梅沙尖主峰",
    entityType: "location",
    entitySlug: "meishajian",
    roleType: "poi",
  },
  {
    poiName: "山海大观入口",
    entityType: "location",
    entitySlug: "meishajian",
    roleType: "checkpoint",
  },
  {
    poiName: "三洲田水库",
    entityType: "location",
    entitySlug: "meishajian",
    roleType: "viewpoint",
  },
];

export function seedMeishajianPois(
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

  for (const poi of meishajianPoisData) {
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

  return meishajianPoisData.map((poi) => ({
    id: poiMap.get(poi.name)!,
    name: poi.name,
  }));
}
