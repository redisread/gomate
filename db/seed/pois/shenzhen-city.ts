/**
 * 深圳城市 POI 数据种子
 */

import type Database from "better-sqlite3";
import { nanoid } from "nanoid";
import type { LocationData } from "../locations";
import type { RouteData } from "../routes";
import type { PoiData } from "./index";

const shenzhenCityPoisData = [
  {
    name: "深圳湾公园",
    description: "沿海而建的城市公园，可观赏海景和日落",
    coordinates: JSON.stringify({ lat: 22.5283, lng: 113.9436 }),
    category: "viewpoint",
    extra: JSON.stringify({
      feature: "城市公园",
      bestTime: "傍晚日落时分",
      ticket: "免费",
    }),
  },
  {
    name: "市民中心",
    description: "深圳市政府所在地，建筑独特，周边有图书馆和音乐厅",
    coordinates: JSON.stringify({ lat: 22.5435, lng: 114.0578 }),
    category: "checkpoint",
    extra: JSON.stringify({
      feature: "地标建筑",
      type: "文化中心",
      tips: "可参观深圳博物馆",
    }),
  },
  {
    name: "东门老街",
    description: "深圳最繁华的商业步行街，购物美食天堂",
    coordinates: JSON.stringify({ lat: 22.5456, lng: 114.0579 }),
    category: "checkpoint",
    extra: JSON.stringify({
      feature: "商业街区",
      type: "购物美食",
      tips: "品尝各类小吃",
    }),
  },
  {
    name: "深圳北站",
    description: "主要高铁站，连接全国各地",
    coordinates: JSON.stringify({ lat: 22.6093, lng: 114.0325 }),
    category: "checkpoint",
    extra: JSON.stringify({
      feature: "交通枢纽",
      type: "高铁站",
      hasParking: true,
    }),
  },
  {
    name: "平安金融中心",
    description: "深圳第一高楼，观光层可俯瞰全城",
    coordinates: JSON.stringify({ lat: 22.5378, lng: 114.0506 }),
    category: "viewpoint",
    extra: JSON.stringify({
      feature: "摩天大楼",
      type: "观景台",
      bestTime: "晴朗天气",
    }),
  },
  {
    name: "华强北",
    description: "亚洲最大的电子产品集散地",
    coordinates: JSON.stringify({ lat: 22.5433, lng: 114.0823 }),
    category: "checkpoint",
    extra: JSON.stringify({
      feature: "电子市场",
      type: "购物商圈",
      tips: "数码产品应有尽有",
    }),
  },
];

const entityToPoisData = [
  {
    poiName: "深圳湾公园",
    entityType: "location",
    entitySlug: "shenzhen-city",
    roleType: "viewpoint",
  },
  {
    poiName: "市民中心",
    entityType: "location",
    entitySlug: "shenzhen-city",
    roleType: "checkpoint",
  },
  {
    poiName: "东门老街",
    entityType: "location",
    entitySlug: "shenzhen-city",
    roleType: "checkpoint",
  },
  {
    poiName: "深圳北站",
    entityType: "location",
    entitySlug: "shenzhen-city",
    roleType: "checkpoint",
  },
  {
    poiName: "平安金融中心",
    entityType: "location",
    entitySlug: "shenzhen-city",
    roleType: "viewpoint",
  },
  {
    poiName: "华强北",
    entityType: "location",
    entitySlug: "shenzhen-city",
    roleType: "checkpoint",
  },
];

export function seedShenzhenCityPois(
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

  for (const poi of shenzhenCityPoisData) {
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

  return shenzhenCityPoisData.map((poi) => ({
    id: poiMap.get(poi.name)!,
    name: poi.name,
  }));
}
