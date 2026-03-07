/**
 * 衡山 POI 数据种子
 */

import type Database from "better-sqlite3";
import { nanoid } from "nanoid";
import type { LocationData } from "../locations";
import type { RouteData } from "../routes";
import type { PoiData } from "./index";

const hengshanPoisData = [
  {
    name: "祝融峰",
    description: "衡山最高峰，海拔1300.2米，南岳衡山标志",
    coordinates: JSON.stringify({ lat: 27.2567, lng: 112.6789 }),
    category: "mountain_peak",
    extra: JSON.stringify({
      elevation: 1300.2,
      feature: "祝融殿",
      bestTime: "日出时分",
    }),
  },
  {
    name: "南岳大庙",
    description: "中国南方最大的宫殿式古建筑群，江南第一庙",
    coordinates: JSON.stringify({ lat: 27.2467, lng: 112.6689 }),
    category: "checkpoint",
    extra: JSON.stringify({
      feature: "江南第一庙",
      type: "古建筑群",
      ticket: "需购票",
    }),
  },
  {
    name: "忠烈祠",
    description: "纪念抗日阵亡将士的祠堂",
    coordinates: JSON.stringify({ lat: 27.2523, lng: 112.6723 }),
    category: "checkpoint",
    extra: JSON.stringify({
      feature: "纪念建筑",
      history: "抗战纪念",
    }),
  },
  {
    name: "南天门",
    description: "衡山登山重要节点，可乘索道",
    coordinates: JSON.stringify({ lat: 27.2589, lng: 112.6756 }),
    category: "checkpoint",
    extra: JSON.stringify({
      hasCableway: true,
      hasRestaurant: true,
      feature: "索道中转站",
    }),
  },
  {
    name: "半山亭",
    description: "登山中途重要休息点，可乘索道",
    coordinates: JSON.stringify({ lat: 27.2545, lng: 112.6712 }),
    category: "checkpoint",
    extra: JSON.stringify({
      hasHotel: true,
      hasRestaurant: true,
      transport: "观光车终点",
    }),
  },
  {
    name: "梵音谷",
    description: "风景秀丽的溪谷，沿途有多个瀑布",
    coordinates: JSON.stringify({ lat: 27.2512, lng: 112.6698 }),
    category: "viewpoint",
    extra: JSON.stringify({
      feature: "瀑布群",
      type: "溪谷",
    }),
  },
];

const entityToPoisData = [
  {
    poiName: "祝融峰",
    entityType: "location",
    entitySlug: "heng-mountain",
    roleType: "poi",
  },
  {
    poiName: "南岳大庙",
    entityType: "location",
    entitySlug: "heng-mountain",
    roleType: "checkpoint",
  },
  {
    poiName: "忠烈祠",
    entityType: "location",
    entitySlug: "heng-mountain",
    roleType: "checkpoint",
  },
  {
    poiName: "南天门",
    entityType: "location",
    entitySlug: "heng-mountain",
    roleType: "checkpoint",
  },
  {
    poiName: "半山亭",
    entityType: "location",
    entitySlug: "heng-mountain",
    roleType: "checkpoint",
  },
  {
    poiName: "梵音谷",
    entityType: "location",
    entitySlug: "heng-mountain",
    roleType: "viewpoint",
  },
];

export function seedHengshanPois(
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

  for (const poi of hengshanPoisData) {
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

  return hengshanPoisData.map((poi) => ({
    id: poiMap.get(poi.name)!,
    name: poi.name,
  }));
}
