/**
 * 昆明城市 POI 数据种子
 */

import type Database from "better-sqlite3";
import { nanoid } from "nanoid";
import type { LocationData } from "../locations";
import type { RouteData } from "../routes";
import type { PoiData } from "./index";

const kunmingCityPoisData = [
  {
    name: "滇池",
    description: "云南最大淡水湖，冬季可观红嘴鸥",
    coordinates: JSON.stringify({ lat: 24.8244, lng: 102.7016 }),
    category: "viewpoint",
    extra: JSON.stringify({
      feature: "高原湖泊",
      bestTime: "冬季观鸥最佳",
      ticket: "免费",
    }),
  },
  {
    name: "翠湖公园",
    description: "市中心公园，四季景色宜人",
    coordinates: JSON.stringify({ lat: 25.0576, lng: 102.7069 }),
    category: "checkpoint",
    extra: JSON.stringify({
      feature: "城市公园",
      type: "休闲场所",
      bestTime: "全天开放",
    }),
  },
  {
    name: "南屏街",
    description: "昆明最繁华的商业步行街",
    coordinates: JSON.stringify({ lat: 25.0389, lng: 102.7123 }),
    category: "checkpoint",
    extra: JSON.stringify({
      feature: "商业街区",
      type: "购物美食",
      tips: "品尝当地小吃",
    }),
  },
  {
    name: "昆明火车站",
    description: "主要铁路交通枢纽",
    coordinates: JSON.stringify({ lat: 25.0167, lng: 102.7167 }),
    category: "checkpoint",
    extra: JSON.stringify({
      feature: "交通枢纽",
      type: "火车站",
      hasParking: true,
    }),
  },
  {
    name: "云南民族村",
    description: "展示云南26个民族文化的主题公园",
    coordinates: JSON.stringify({ lat: 24.8423, lng: 102.6845 }),
    category: "checkpoint",
    extra: JSON.stringify({
      feature: "文化景点",
      type: "民族文化",
      ticket: "收费",
    }),
  },
  {
    name: "金马碧鸡坊",
    description: "昆明标志性历史建筑",
    coordinates: JSON.stringify({ lat: 25.0367, lng: 102.7108 }),
    category: "viewpoint",
    extra: JSON.stringify({
      feature: "历史地标",
      type: "古建筑",
      bestTime: "夜晚灯光更美",
    }),
  },
];

const entityToPoisData = [
  {
    poiName: "滇池",
    entityType: "location",
    entitySlug: "kunming-city",
    roleType: "viewpoint",
  },
  {
    poiName: "翠湖公园",
    entityType: "location",
    entitySlug: "kunming-city",
    roleType: "checkpoint",
  },
  {
    poiName: "南屏街",
    entityType: "location",
    entitySlug: "kunming-city",
    roleType: "checkpoint",
  },
  {
    poiName: "昆明火车站",
    entityType: "location",
    entitySlug: "kunming-city",
    roleType: "checkpoint",
  },
  {
    poiName: "云南民族村",
    entityType: "location",
    entitySlug: "kunming-city",
    roleType: "checkpoint",
  },
  {
    poiName: "金马碧鸡坊",
    entityType: "location",
    entitySlug: "kunming-city",
    roleType: "viewpoint",
  },
];

export function seedKunmingCityPois(
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

  for (const poi of kunmingCityPoisData) {
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

  return kunmingCityPoisData.map((poi) => ({
    id: poiMap.get(poi.name)!,
    name: poi.name,
  }));
}
