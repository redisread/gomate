/**
 * 西双版纳 POI 数据种子
 */

import type Database from "better-sqlite3";
import { nanoid } from "nanoid";
import type { LocationData } from "../locations";
import type { RouteData } from "../routes";
import type { PoiData } from "./index";

const xishuangbannaPoisData = [
  {
    name: "告庄西双景",
    description: "景洪地标性景区，星光夜市所在地",
    coordinates: JSON.stringify({ lat: 22.0073, lng: 100.7978 }),
    category: "checkpoint",
    extra: JSON.stringify({
      feature: "文化旅游区",
      type: "夜市",
      tips: "夜晚最热闹",
    }),
  },
  {
    name: "总佛寺",
    description: "西双版纳等级最高的佛寺，建筑金碧辉煌",
    coordinates: JSON.stringify({ lat: 22.0085, lng: 100.802 }),
    category: "checkpoint",
    extra: JSON.stringify({
      feature: "佛教寺庙",
      type: "宗教景点",
      ticket: "免费",
    }),
  },
  {
    name: "曼听公园",
    description: "傣王御花园，有1300多年历史",
    coordinates: JSON.stringify({ lat: 22.0105, lng: 100.795 }),
    category: "checkpoint",
    extra: JSON.stringify({
      feature: "皇家园林",
      type: "公园",
      ticket: "收费",
    }),
  },
  {
    name: "王莲池",
    description: "中科院植物园核心景点，可承重80公斤",
    coordinates: JSON.stringify({ lat: 21.93, lng: 101.25 }),
    category: "viewpoint",
    extra: JSON.stringify({
      feature: "植物景观",
      type: "自然景观",
      bestTime: "7-8月最佳",
    }),
  },
  {
    name: "野象谷高空栈道",
    description: "安全观赏野生亚洲象的最佳位置",
    coordinates: JSON.stringify({ lat: 22.13, lng: 100.87 }),
    category: "viewpoint",
    extra: JSON.stringify({
      feature: "观象栈道",
      type: "野生动物观赏",
      tips: "早上观象概率更高",
    }),
  },
  {
    name: "大象学校",
    description: "了解亚洲象生活习性的科普场所",
    coordinates: JSON.stringify({ lat: 22.128, lng: 100.872 }),
    category: "checkpoint",
    extra: JSON.stringify({
      feature: "科普教育",
      type: "表演场地",
      tips: "有大象表演",
    }),
  },
];

const entityToPoisData = [
  {
    poiName: "告庄西双景",
    entityType: "location",
    entitySlug: "jinghong-city",
    roleType: "checkpoint",
  },
  {
    poiName: "总佛寺",
    entityType: "location",
    entitySlug: "jinghong-city",
    roleType: "checkpoint",
  },
  {
    poiName: "曼听公园",
    entityType: "location",
    entitySlug: "jinghong-city",
    roleType: "checkpoint",
  },
  {
    poiName: "王莲池",
    entityType: "location",
    entitySlug: "xtbg",
    roleType: "viewpoint",
  },
  {
    poiName: "野象谷高空栈道",
    entityType: "location",
    entitySlug: "wild-elephant-valley",
    roleType: "viewpoint",
  },
  {
    poiName: "大象学校",
    entityType: "location",
    entitySlug: "wild-elephant-valley",
    roleType: "checkpoint",
  },
];

export function seedXishuangbannaPois(
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

  for (const poi of xishuangbannaPoisData) {
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

  return xishuangbannaPoisData.map((poi) => ({
    id: poiMap.get(poi.name)!,
    name: poi.name,
  }));
}
