/**
 * 香港城市 POI 数据种子
 */

import type Database from "better-sqlite3";
import { nanoid } from "nanoid";
import type { LocationData } from "../locations";
import type { RouteData } from "../routes";
import type { PoiData } from "./index";

const hongkongCityPoisData = [
  {
    name: "维多利亚港",
    description: "世界著名天然良港，香港标志性景观",
    coordinates: JSON.stringify({ lat: 22.2871, lng: 114.1721 }),
    category: "viewpoint",
    extra: JSON.stringify({
      feature: "地标景观",
      bestTime: "晚上8点灯光秀",
      ticket: "免费",
    }),
  },
  {
    name: "尖沙咀",
    description: "香港著名购物和观光区",
    coordinates: JSON.stringify({ lat: 22.2988, lng: 114.1722 }),
    category: "checkpoint",
    extra: JSON.stringify({
      feature: "商业区",
      type: "购物观光",
      tips: "海港城购物，星光大道散步",
    }),
  },
  {
    name: "中环",
    description: "香港金融中心，摩天大楼林立",
    coordinates: JSON.stringify({ lat: 22.2833, lng: 114.1588 }),
    category: "checkpoint",
    extra: JSON.stringify({
      feature: "商业中心",
      type: "金融区",
      tips: "乘坐半山扶梯，参观立法会大楼",
    }),
  },
  {
    name: "香港国际机场",
    description: "世界级航空枢纽",
    coordinates: JSON.stringify({ lat: 22.3080, lng: 113.9185 }),
    category: "checkpoint",
    extra: JSON.stringify({
      feature: "交通枢纽",
      type: "国际机场",
      hasParking: true,
    }),
  },
  {
    name: "旺角",
    description: "香港最热闹的地区之一，购物美食天堂",
    coordinates: JSON.stringify({ lat: 22.3193, lng: 114.1694 }),
    category: "checkpoint",
    extra: JSON.stringify({
      feature: "购物区",
      type: "商业街",
      tips: "女人街、波鞋街购物",
    }),
  },
  {
    name: "香港迪士尼乐园",
    description: "迪士尼主题公园，适合全家游玩",
    coordinates: JSON.stringify({ lat: 22.3129, lng: 114.0413 }),
    category: "checkpoint",
    extra: JSON.stringify({
      feature: "主题公园",
      type: "娱乐场所",
      ticket: "收费",
    }),
  },
];

const entityToPoisData = [
  {
    poiName: "维多利亚港",
    entityType: "location",
    entitySlug: "hongkong-city",
    roleType: "viewpoint",
  },
  {
    poiName: "尖沙咀",
    entityType: "location",
    entitySlug: "hongkong-city",
    roleType: "checkpoint",
  },
  {
    poiName: "中环",
    entityType: "location",
    entitySlug: "hongkong-city",
    roleType: "checkpoint",
  },
  {
    poiName: "香港国际机场",
    entityType: "location",
    entitySlug: "hongkong-city",
    roleType: "checkpoint",
  },
  {
    poiName: "旺角",
    entityType: "location",
    entitySlug: "hongkong-city",
    roleType: "checkpoint",
  },
  {
    poiName: "香港迪士尼乐园",
    entityType: "location",
    entitySlug: "hongkong-city",
    roleType: "checkpoint",
  },
];

export function seedHongkongCityPois(
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

  for (const poi of hongkongCityPoisData) {
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

  return hongkongCityPoisData.map((poi) => ({
    id: poiMap.get(poi.name)!,
    name: poi.name,
  }));
}
