/**
 * 武功山 POI 数据种子
 */

import type Database from "better-sqlite3";
import { nanoid } from "nanoid";
import type { LocationData } from "../locations";
import type { RouteData } from "../routes";
import type { PoiData } from "./index";

const wugongshanPoisData = [
  {
    name: "武功山金顶",
    description: "武功山最高峰，海拔1918.3米，可观日出云海",
    coordinates: JSON.stringify({ lat: 27.4567, lng: 114.1789 }),
    category: "mountain_peak",
    extra: JSON.stringify({
      elevation: 1918.3,
      feature: "白鹤峰",
      bestTime: "日出时分",
    }),
  },
  {
    name: "武功山游客中心",
    description: "景区入口，可乘索道或步行上山",
    coordinates: JSON.stringify({ lat: 27.4367, lng: 114.1589 }),
    category: "checkpoint",
    extra: JSON.stringify({
      hasParking: true,
      hasTicketOffice: true,
      transport: "景区接驳车",
    }),
  },
  {
    name: "石鼓寺",
    description: "登山起点，历史悠久的寺庙",
    coordinates: JSON.stringify({ lat: 27.4423, lng: 114.1623 }),
    category: "checkpoint",
    extra: JSON.stringify({
      feature: "登山口",
      type: "寺庙",
    }),
  },
  {
    name: "中庵",
    description: "一级索道终点，可换乘二级索道",
    coordinates: JSON.stringify({ lat: 27.4489, lng: 114.1689 }),
    category: "checkpoint",
    extra: JSON.stringify({
      hasRestaurant: true,
      hasRestroom: true,
      feature: "索道中转站",
    }),
  },
  {
    name: "吊马桩",
    description: "金顶前的重要驿站，有客栈",
    coordinates: JSON.stringify({ lat: 27.4523, lng: 114.1723 }),
    category: "checkpoint",
    extra: JSON.stringify({
      hasHotel: true,
      hasRestaurant: true,
    }),
  },
  {
    name: "发云界",
    description: "高山草甸观景点，可观云海",
    coordinates: JSON.stringify({ lat: 27.4623, lng: 114.1889 }),
    category: "viewpoint",
    extra: JSON.stringify({
      feature: "云海观赏点",
      hasCampsite: true,
    }),
  },
];

const entityToPoisData = [
  {
    poiName: "武功山金顶",
    entityType: "location",
    entitySlug: "wugong-mountain",
    roleType: "poi",
  },
  {
    poiName: "武功山游客中心",
    entityType: "location",
    entitySlug: "wugong-mountain",
    roleType: "checkpoint",
  },
  {
    poiName: "石鼓寺",
    entityType: "location",
    entitySlug: "wugong-mountain",
    roleType: "checkpoint",
  },
  {
    poiName: "中庵",
    entityType: "location",
    entitySlug: "wugong-mountain",
    roleType: "checkpoint",
  },
  {
    poiName: "吊马桩",
    entityType: "location",
    entitySlug: "wugong-mountain",
    roleType: "checkpoint",
  },
  {
    poiName: "发云界",
    entityType: "location",
    entitySlug: "wugong-mountain",
    roleType: "viewpoint",
  },
];

export function seedWugongshanPois(
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

  for (const poi of wugongshanPoisData) {
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

  return wugongshanPoisData.map((poi) => ({
    id: poiMap.get(poi.name)!,
    name: poi.name,
  }));
}
