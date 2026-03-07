/**
 * 麦理浩径 POI 数据种子
 */

import type Database from "better-sqlite3";
import { nanoid } from "nanoid";
import type { LocationData } from "../locations";
import type { RouteData } from "../routes";
import type { PoiData } from "./index";

const maclehosePoisData = [
  {
    name: "北潭涌",
    description: "麦理浩径起点，有公交总站、停车场和游客中心",
    coordinates: JSON.stringify({ lat: 22.3964, lng: 114.3289 }),
    category: "checkpoint",
    extra: JSON.stringify({
      hasParking: true,
      hasRestroom: true,
      transport: "94/96R/698R巴士",
    }),
  },
  {
    name: "万宜水库东坝",
    description: "香港地质公园核心景点，可欣赏六角形岩柱群",
    coordinates: JSON.stringify({ lat: 22.3589, lng: 114.3789 }),
    category: "viewpoint",
    extra: JSON.stringify({
      feature: "世界地质公园",
      landscape: "六角形岩柱",
    }),
  },
  {
    name: "浪茄沙滩",
    description: "第一段终点，美丽的沙滩，可露营",
    coordinates: JSON.stringify({ lat: 22.3489, lng: 114.3889 }),
    category: "campsite",
    extra: JSON.stringify({
      hasCampsite: true,
      hasWater: false,
      feature: "白沙滩",
    }),
  },
  {
    name: "西湾",
    description: "麦理浩径第二段精华，有补给和餐厅",
    coordinates: JSON.stringify({ lat: 22.3689, lng: 114.3989 }),
    category: "checkpoint",
    extra: JSON.stringify({
      hasRestaurant: true,
      hasCampsite: true,
      feature: "大浪西湾",
    }),
  },
  {
    name: "咸田湾",
    description: "美丽的沙滩，有餐厅和营地",
    coordinates: JSON.stringify({ lat: 22.3723, lng: 114.4056 }),
    category: "campsite",
    extra: JSON.stringify({
      hasRestaurant: true,
      hasCampsite: true,
      feature: "木桥打卡点",
    }),
  },
  {
    name: "北潭凹",
    description: "第二段终点，有公交站可返回市区",
    coordinates: JSON.stringify({ lat: 22.3989, lng: 114.3389 }),
    category: "checkpoint",
    extra: JSON.stringify({
      hasRestroom: true,
      transport: "94/96R巴士",
    }),
  },
];

const entityToPoisData = [
  {
    poiName: "北潭涌",
    entityType: "location",
    entitySlug: "maclehose-trail",
    roleType: "checkpoint",
  },
  {
    poiName: "万宜水库东坝",
    entityType: "location",
    entitySlug: "maclehose-trail",
    roleType: "viewpoint",
  },
  {
    poiName: "浪茄沙滩",
    entityType: "location",
    entitySlug: "maclehose-trail",
    roleType: "campsite",
  },
  {
    poiName: "西湾",
    entityType: "location",
    entitySlug: "maclehose-trail",
    roleType: "checkpoint",
  },
  {
    poiName: "咸田湾",
    entityType: "location",
    entitySlug: "maclehose-trail",
    roleType: "campsite",
  },
];

export function seedMaclehosePois(
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

  for (const poi of maclehosePoisData) {
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

  return maclehosePoisData.map((poi) => ({
    id: poiMap.get(poi.name)!,
    name: poi.name,
  }));
}
