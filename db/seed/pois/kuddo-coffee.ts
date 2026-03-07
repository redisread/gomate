/**
 * Kuddo Coffee POI 数据种子
 */

import type Database from "better-sqlite3";
import { nanoid } from "nanoid";
import type { LocationData } from "../locations";
import type { RouteData } from "../routes";
import type { PoiData } from "./index";

const kuddoCoffeePoisData = [
  {
    name: "手冲吧台",
    description: "专业咖啡师手冲咖啡展示区，可观看冲煮过程",
    coordinates: JSON.stringify({ lat: 22.6545, lng: 114.0323 }),
    category: "checkpoint",
    extra: JSON.stringify({
      feature: "咖啡制作",
      type: "互动体验",
      tips: "可与咖啡师交流",
    }),
  },
  {
    name: "拍照打卡墙",
    description: "Kuddo标志性背景墙，工业风设计拍照圣地",
    coordinates: JSON.stringify({ lat: 22.6546, lng: 114.0323 }),
    category: "viewpoint",
    extra: JSON.stringify({
      feature: "拍照打卡",
      type: "网红墙",
      bestTime: "光线充足的下午",
    }),
  },
  {
    name: "靠窗景观位",
    description: "落地窗边最佳观景座位，自然光充足",
    coordinates: JSON.stringify({ lat: 22.6545, lng: 114.0324 }),
    category: "viewpoint",
    extra: JSON.stringify({
      feature: "景观座位",
      type: "休闲区",
      tips: "适合办公和阅读",
    }),
  },
  {
    name: "户外露台",
    description: "壹方天地商业街区景观露台座位",
    coordinates: JSON.stringify({ lat: 22.6544, lng: 114.0323 }),
    category: "viewpoint",
    categoryType: "checkpoint",
    extra: JSON.stringify({
      feature: "户外座位",
      type: "吸烟区",
      tips: "可欣赏街景",
    }),
  },
];

const entityToPoisData = [
  {
    poiName: "手冲吧台",
    entityType: "location",
    entitySlug: "kuddo-coffee",
    roleType: "checkpoint",
  },
  {
    poiName: "拍照打卡墙",
    entityType: "location",
    entitySlug: "kuddo-coffee",
    roleType: "viewpoint",
  },
  {
    poiName: "靠窗景观位",
    entityType: "location",
    entitySlug: "kuddo-coffee",
    roleType: "viewpoint",
  },
  {
    poiName: "户外露台",
    entityType: "location",
    entitySlug: "kuddo-coffee",
    roleType: "checkpoint",
  },
];

export function seedKuddoCoffeePois(
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

  for (const poi of kuddoCoffeePoisData) {
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

  return kuddoCoffeePoisData.map((poi) => ({
    id: poiMap.get(poi.name)!,
    name: poi.name,
  }));
}
