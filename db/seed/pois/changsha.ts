/**
 * 长沙城市 POI 数据种子
 */

import type Database from "better-sqlite3";
import { nanoid } from "nanoid";
import type { LocationData } from "../locations";
import type { RouteData } from "../routes";
import type { PoiData } from "./index";

const changshaCityPoisData = [
  {
    name: "橘子洲头",
    description: "湘江中心的著名景点，毛泽东青年雕塑所在地",
    coordinates: JSON.stringify({ lat: 28.1713, lng: 112.9603 }),
    category: "viewpoint",
    extra: JSON.stringify({
      feature: "地标景点",
      bestTime: "傍晚夜景最佳",
      ticket: "免费",
    }),
  },
  {
    name: "岳麓山",
    description: "湘江西岸名山，自古以「岳麓之胜」闻名",
    coordinates: JSON.stringify({ lat: 28.1847, lng: 112.9388 }),
    category: "viewpoint",
    extra: JSON.stringify({
      feature: "山峰",
      type: "自然景点",
      bestTime: "秋季赏枫",
    }),
  },
  {
    name: "五一广场",
    description: "长沙市中心最繁华的商业区",
    coordinates: JSON.stringify({ lat: 28.1973, lng: 112.9794 }),
    category: "checkpoint",
    extra: JSON.stringify({
      feature: "商业中心",
      type: "购物商圈",
      tips: "周边美食众多",
    }),
  },
  {
    name: "太平老街",
    description: "长沙历史文化街区，保留明清建筑风格",
    coordinates: JSON.stringify({ lat: 28.1967, lng: 112.9712 }),
    category: "checkpoint",
    extra: JSON.stringify({
      feature: "历史街区",
      type: "文化美食",
      tips: "品尝臭豆腐和糖油粑粑",
    }),
  },
  {
    name: "长沙南站",
    description: "主要高铁站，连接全国各地",
    coordinates: JSON.stringify({ lat: 28.1503, lng: 113.0597 }),
    category: "checkpoint",
    extra: JSON.stringify({
      feature: "交通枢纽",
      type: "高铁站",
      hasParking: true,
    }),
  },
  {
    name: "黄兴路步行街",
    description: "长沙最热闹的购物步行街",
    coordinates: JSON.stringify({ lat: 28.1989, lng: 112.9778 }),
    category: "checkpoint",
    extra: JSON.stringify({
      feature: "购物街",
      type: "商业区",
      bestTime: "全天",
    }),
  },
];

const entityToPoisData = [
  {
    poiName: "橘子洲头",
    entityType: "location",
    entitySlug: "changsha-city",
    roleType: "viewpoint",
  },
  {
    poiName: "岳麓山",
    entityType: "location",
    entitySlug: "changsha-city",
    roleType: "viewpoint",
  },
  {
    poiName: "五一广场",
    entityType: "location",
    entitySlug: "changsha-city",
    roleType: "checkpoint",
  },
  {
    poiName: "太平老街",
    entityType: "location",
    entitySlug: "changsha-city",
    roleType: "checkpoint",
  },
  {
    poiName: "长沙南站",
    entityType: "location",
    entitySlug: "changsha-city",
    roleType: "checkpoint",
  },
  {
    poiName: "黄兴路步行街",
    entityType: "location",
    entitySlug: "changsha-city",
    roleType: "checkpoint",
  },
];

export function seedChangshaCityPois(
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

  for (const poi of changshaCityPoisData) {
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

  return changshaCityPoisData.map((poi) => ({
    id: poiMap.get(poi.name)!,
    name: poi.name,
  }));
}
