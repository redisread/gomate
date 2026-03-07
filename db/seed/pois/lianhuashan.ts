/**
 * 莲花山 POI 数据种子
 */

import type Database from "better-sqlite3";
import { nanoid } from "nanoid";
import type { LocationData } from "../locations";
import type { RouteData } from "../routes";
import type { PoiData } from "./index";

const lianhuashanPoisData = [
  {
    name: "邓小平铜像",
    description: "莲花山标志性景点，俯瞰福田中心区",
    coordinates: JSON.stringify({ lat: 22.5534, lng: 114.0567 }),
    category: "landmark",
    extra: JSON.stringify({
      feature: "深圳市标志性雕塑",
      bestTime: "全天",
      fee: "免费",
    }),
  },
  {
    name: "莲花山山顶广场",
    description: "山顶观景平台，可俯瞰整个福田中心区",
    coordinates: JSON.stringify({ lat: 22.5545, lng: 114.0578 }),
    category: "viewpoint",
    extra: JSON.stringify({
      elevation: 106,
      view: "福田CBD、市民中心",
    }),
  },
  {
    name: "风筝广场",
    description: "莲花山南麓大草坪，深圳最著名的放风筝地点",
    coordinates: JSON.stringify({ lat: 22.5498, lng: 114.0545 }),
    category: "recreation",
    extra: JSON.stringify({
      feature: "放风筝圣地",
      bestTime: "周末和节假日",
    }),
  },
  {
    name: "莲花山公园南门",
    description: "正门入口，有地铁站和停车场",
    coordinates: JSON.stringify({ lat: 22.5489, lng: 114.0534 }),
    category: "checkpoint",
    extra: JSON.stringify({
      hasParking: true,
      transport: "地铁莲花村站、少年宫站",
    }),
  },
  {
    name: "莲花湖",
    description: "公园内的湖泊，可划船休闲",
    coordinates: JSON.stringify({ lat: 22.5512, lng: 114.0556 }),
    category: "recreation",
    extra: JSON.stringify({
      feature: "划船、休闲",
    }),
  },
];

const entityToPoisData = [
  {
    poiName: "邓小平铜像",
    entityType: "location",
    entitySlug: "lianhuashan",
    roleType: "poi",
  },
  {
    poiName: "莲花山山顶广场",
    entityType: "location",
    entitySlug: "lianhuashan",
    roleType: "viewpoint",
  },
  {
    poiName: "风筝广场",
    entityType: "location",
    entitySlug: "lianhuashan",
    roleType: "poi",
  },
  {
    poiName: "莲花湖",
    entityType: "location",
    entitySlug: "lianhuashan",
    roleType: "landmark",
  },
];

export function seedLianhuashanPois(
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

  for (const poi of lianhuashanPoisData) {
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

  return lianhuashanPoisData.map((poi) => ({
    id: poiMap.get(poi.name)!,
    name: poi.name,
  }));
}
