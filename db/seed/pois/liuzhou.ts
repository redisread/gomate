/**
 * 柳州 POI 数据种子
 */

import type Database from "better-sqlite3";
import { nanoid } from "nanoid";
import type { LocationData } from "../locations";
import type { RouteData } from "../routes";
import type { PoiData } from "./index";

const liuzhouPoisData = [
  {
    name: "马鞍山",
    description: "柳州市区最高峰，俯瞰柳江全景",
    coordinates: JSON.stringify({ lat: 24.3265, lng: 109.4285 }),
    category: "viewpoint",
    extra: JSON.stringify({
      feature: "城市观景台",
      type: "自然景点",
      bestTime: "傍晚看夜景最佳",
    }),
  },
  {
    name: "柳江夜游码头",
    description: "乘船游览柳江夜景的登船点",
    coordinates: JSON.stringify({ lat: 24.325, lng: 109.43 }),
    category: "checkpoint",
    extra: JSON.stringify({
      feature: "游船码头",
      type: "夜游项目",
      tips: "夜景非常迷人",
    }),
  },
  {
    name: "龙潭公园",
    description: "柳州市区最大的公园，喀斯特地貌景观",
    coordinates: JSON.stringify({ lat: 24.318, lng: 109.42 }),
    category: "checkpoint",
    extra: JSON.stringify({
      feature: "城市公园",
      type: "休闲场所",
      ticket: "免费",
    }),
  },
  {
    name: "程阳永济风雨桥",
    description: "世界四大名桥之一，侗族建筑杰作",
    coordinates: JSON.stringify({ lat: 25.8985, lng: 109.5858 }),
    category: "viewpoint",
    extra: JSON.stringify({
      feature: "古桥建筑",
      type: "历史建筑",
      ticket: "含在景区门票内",
    }),
  },
  {
    name: "程阳八寨鼓楼",
    description: "侗族村寨标志性建筑",
    coordinates: JSON.stringify({ lat: 25.899, lng: 109.586 }),
    category: "checkpoint",
    extra: JSON.stringify({
      feature: "民族建筑",
      type: "文化景点",
      tips: "侗族集会场所",
    }),
  },
  {
    name: "柳州火车站",
    description: "柳州主要铁路交通枢纽",
    coordinates: JSON.stringify({ lat: 24.315, lng: 109.405 }),
    category: "checkpoint",
    extra: JSON.stringify({
      feature: "交通枢纽",
      type: "火车站",
      hasParking: true,
    }),
  },
];

const entityToPoisData = [
  {
    poiName: "马鞍山",
    entityType: "location",
    entitySlug: "liuzhou-city",
    roleType: "viewpoint",
  },
  {
    poiName: "柳江夜游码头",
    entityType: "location",
    entitySlug: "liuzhou-city",
    roleType: "checkpoint",
  },
  {
    poiName: "龙潭公园",
    entityType: "location",
    entitySlug: "liuzhou-city",
    roleType: "checkpoint",
  },
  {
    poiName: "程阳永济风雨桥",
    entityType: "location",
    entitySlug: "chengyang-bazhai",
    roleType: "viewpoint",
  },
  {
    poiName: "程阳八寨鼓楼",
    entityType: "location",
    entitySlug: "chengyang-bazhai",
    roleType: "checkpoint",
  },
  {
    poiName: "柳州火车站",
    entityType: "location",
    entitySlug: "liuzhou-city",
    roleType: "checkpoint",
  },
];

export function seedLiuzhouPois(
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

  for (const poi of liuzhouPoisData) {
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

  return liuzhouPoisData.map((poi) => ({
    id: poiMap.get(poi.name)!,
    name: poi.name,
  }));
}
