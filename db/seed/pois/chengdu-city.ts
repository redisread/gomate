/**
 * 成都城市 POI 数据种子
 */

import type Database from "better-sqlite3";
import { nanoid } from "nanoid";
import type { LocationData } from "../locations";
import type { RouteData } from "../routes";
import type { PoiData } from "./index";

const chengduCityPoisData = [
  {
    name: "宽窄巷子",
    description: "成都最具代表性的历史文化街区，体验老成都生活",
    coordinates: JSON.stringify({ lat: 30.6665, lng: 104.0556 }),
    category: "checkpoint",
    extra: JSON.stringify({
      feature: "历史街区",
      type: "文化美食",
      tips: "品尝成都小吃",
    }),
  },
  {
    name: "锦里古街",
    description: "仿古建筑商业街，感受三国文化氛围",
    coordinates: JSON.stringify({ lat: 30.6456, lng: 104.0445 }),
    category: "checkpoint",
    extra: JSON.stringify({
      feature: "古街",
      type: "文化购物",
      tips: "夜景更美",
    }),
  },
  {
    name: "大熊猫繁育研究基地",
    description: "全球最大的人工繁育大熊猫基地",
    coordinates: JSON.stringify({ lat: 30.7345, lng: 104.1478 }),
    category: "viewpoint",
    extra: JSON.stringify({
      feature: "动物园",
      bestTime: "早上熊猫最活跃",
      ticket: "需购票",
    }),
  },
  {
    name: "春熙路",
    description: "成都最繁华的商业中心，购物美食聚集地",
    coordinates: JSON.stringify({ lat: 30.6578, lng: 104.0823 }),
    category: "checkpoint",
    extra: JSON.stringify({
      feature: "商业街区",
      type: "购物商圈",
      tips: "时尚潮流地标",
    }),
  },
  {
    name: "成都东站",
    description: "主要高铁站，连接全国各地",
    coordinates: JSON.stringify({ lat: 30.6301, lng: 104.1445 }),
    category: "checkpoint",
    extra: JSON.stringify({
      feature: "交通枢纽",
      type: "高铁站",
      hasParking: true,
    }),
  },
  {
    name: "武侯祠",
    description: "纪念诸葛亮的祠堂，三国文化圣地",
    coordinates: JSON.stringify({ lat: 30.6423, lng: 104.0456 }),
    category: "viewpoint",
    extra: JSON.stringify({
      feature: "历史古迹",
      type: "文化景点",
      tips: "了解三国历史",
    }),
  },
];

const entityToPoisData = [
  {
    poiName: "宽窄巷子",
    entityType: "location",
    entitySlug: "chengdu-city",
    roleType: "checkpoint",
  },
  {
    poiName: "锦里古街",
    entityType: "location",
    entitySlug: "chengdu-city",
    roleType: "checkpoint",
  },
  {
    poiName: "大熊猫繁育研究基地",
    entityType: "location",
    entitySlug: "chengdu-city",
    roleType: "viewpoint",
  },
  {
    poiName: "春熙路",
    entityType: "location",
    entitySlug: "chengdu-city",
    roleType: "checkpoint",
  },
  {
    poiName: "成都东站",
    entityType: "location",
    entitySlug: "chengdu-city",
    roleType: "checkpoint",
  },
  {
    poiName: "武侯祠",
    entityType: "location",
    entitySlug: "chengdu-city",
    roleType: "viewpoint",
  },
];

export function seedChengduCityPois(
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

  for (const poi of chengduCityPoisData) {
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

  return chengduCityPoisData.map((poi) => ({
    id: poiMap.get(poi.name)!,
    name: poi.name,
  }));
}
