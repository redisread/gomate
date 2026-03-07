/**
 * 漓江 POI 数据种子
 */

import type Database from "better-sqlite3";
import { nanoid } from "nanoid";
import type { LocationData } from "../locations";
import type { RouteData } from "../routes";
import type { PoiData } from "./index";

const lijiangRiverPoisData = [
  {
    name: "杨堤码头",
    description: "漓江精华段游船起点",
    coordinates: JSON.stringify({ lat: 24.7798, lng: 110.4779 }),
    category: "checkpoint",
    extra: JSON.stringify({
      feature: "游船码头",
      type: "交通枢纽",
      tips: "精华段起点",
    }),
  },
  {
    name: "九马画山",
    description: "漓江著名景观，山壁如九匹骏马",
    coordinates: JSON.stringify({ lat: 24.85, lng: 110.5 }),
    category: "viewpoint",
    extra: JSON.stringify({
      feature: "山水景观",
      type: "自然景观",
      tips: "考验想象力数马",
    }),
  },
  {
    name: "黄布倒影",
    description: "20元人民币背面图案取景地",
    coordinates: JSON.stringify({ lat: 24.89, lng: 110.51 }),
    category: "viewpoint",
    extra: JSON.stringify({
      feature: "标志性景观",
      type: "摄影圣地",
      tips: "记得带20元人民币打卡",
    }),
  },
  {
    name: "兴坪码头",
    description: "漓江游船终点，古镇入口",
    coordinates: JSON.stringify({ lat: 24.9189, lng: 110.5264 }),
    category: "checkpoint",
    extra: JSON.stringify({
      feature: "游船码头",
      type: "交通枢纽",
      hasParking: true,
    }),
  },
  {
    name: "老寨山",
    description: "俯瞰兴坪古镇和漓江全景的最佳位置",
    coordinates: JSON.stringify({ lat: 24.92, lng: 110.525 }),
    category: "viewpoint",
    extra: JSON.stringify({
      feature: "山顶观景台",
      type: "登山景点",
      tips: "攀登有一定难度",
    }),
  },
  {
    name: "兴坪古街",
    description: "保存完好的明清古街",
    coordinates: JSON.stringify({ lat: 24.918, lng: 110.527 }),
    category: "checkpoint",
    extra: JSON.stringify({
      feature: "历史街区",
      type: "文化景点",
      tips: "适合漫步拍照",
    }),
  },
];

const entityToPoisData = [
  {
    poiName: "杨堤码头",
    entityType: "location",
    entitySlug: "lijiang-river",
    roleType: "checkpoint",
  },
  {
    poiName: "九马画山",
    entityType: "location",
    entitySlug: "lijiang-river",
    roleType: "viewpoint",
  },
  {
    poiName: "黄布倒影",
    entityType: "location",
    entitySlug: "lijiang-river",
    roleType: "viewpoint",
  },
  {
    poiName: "兴坪码头",
    entityType: "location",
    entitySlug: "xingping-old-town",
    roleType: "checkpoint",
  },
  {
    poiName: "老寨山",
    entityType: "location",
    entitySlug: "xingping-old-town",
    roleType: "viewpoint",
  },
  {
    poiName: "兴坪古街",
    entityType: "location",
    entitySlug: "xingping-old-town",
    roleType: "checkpoint",
  },
];

export function seedLijiangRiverPois(
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

  for (const poi of lijiangRiverPoisData) {
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

  return lijiangRiverPoisData.map((poi) => ({
    id: poiMap.get(poi.name)!,
    name: poi.name,
  }));
}
