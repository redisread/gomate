/**
 * 壹方天地 POI 数据种子
 */

import type Database from "better-sqlite3";
import { nanoid } from "nanoid";
import type { LocationData } from "../locations";
import type { RouteData } from "../routes";
import type { PoiData } from "./index";

const yifangTiandiPoisData = [
  {
    name: "壹方天地喷泉广场",
    description: "大型音乐喷泉表演区，商圈中心地标",
    coordinates: JSON.stringify({ lat: 22.6543, lng: 114.0321 }),
    category: "viewpoint",
    extra: JSON.stringify({
      feature: "音乐喷泉",
      type: "广场",
      bestTime: "晚上有灯光秀",
    }),
  },
  {
    name: "A区美食街",
    description: "汇集各地特色小吃和网红餐厅",
    coordinates: JSON.stringify({ lat: 22.6545, lng: 114.0319 }),
    category: "checkpoint",
    extra: JSON.stringify({
      feature: "美食聚集",
      type: "餐饮区",
      tips: "适合聚餐",
    }),
  },
  {
    name: "B区中庭",
    description: "高挑空中庭，经常举办主题展览和活动",
    coordinates: JSON.stringify({ lat: 22.6541, lng: 114.0323 }),
    category: "viewpoint",
    extra: JSON.stringify({
      feature: "展览空间",
      type: "活动场地",
      tips: "关注当期活动",
    }),
  },
  {
    name: "屋顶花园",
    description: "商场顶层露天花园，可俯瞰龙华区夜景",
    coordinates: JSON.stringify({ lat: 22.654, lng: 114.032 }),
    category: "viewpoint",
    extra: JSON.stringify({
      feature: "观景平台",
      type: "休闲区",
      bestTime: "傍晚看日落",
    }),
  },
  {
    name: "地铁龙华站A口",
    description: "4号线地铁出入口，最便捷的交通方式",
    coordinates: JSON.stringify({ lat: 22.6547, lng: 114.0315 }),
    category: "checkpoint",
    extra: JSON.stringify({
      feature: "交通枢纽",
      type: "地铁站",
      tips: "步行5分钟可达",
    }),
  },
  {
    name: "CGV影城",
    description: "IMAX影城，观影体验一流",
    coordinates: JSON.stringify({ lat: 22.6542, lng: 114.0325 }),
    category: "checkpoint",
    extra: JSON.stringify({
      feature: "电影院",
      type: "娱乐场所",
      tips: "建议提前购票",
    }),
  },
];

const entityToPoisData = [
  {
    poiName: "壹方天地喷泉广场",
    entityType: "location",
    entitySlug: "yifang-tiandi",
    roleType: "viewpoint",
  },
  {
    poiName: "A区美食街",
    entityType: "location",
    entitySlug: "yifang-tiandi",
    roleType: "checkpoint",
  },
  {
    poiName: "B区中庭",
    entityType: "location",
    entitySlug: "yifang-tiandi",
    roleType: "viewpoint",
  },
  {
    poiName: "屋顶花园",
    entityType: "location",
    entitySlug: "yifang-tiandi",
    roleType: "viewpoint",
  },
  {
    poiName: "地铁龙华站A口",
    entityType: "location",
    entitySlug: "yifang-tiandi",
    roleType: "checkpoint",
  },
  {
    poiName: "CGV影城",
    entityType: "location",
    entitySlug: "yifang-tiandi",
    roleType: "checkpoint",
  },
];

export function seedYifangTiandiPois(
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

  for (const poi of yifangTiandiPoisData) {
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

  return yifangTiandiPoisData.map((poi) => ({
    id: poiMap.get(poi.name)!,
    name: poi.name,
  }));
}
