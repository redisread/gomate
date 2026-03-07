/**
 * 梧桐山 POI 数据种子
 * 包含梧桐山重要兴趣点
 */

import type Database from "better-sqlite3";
import { nanoid } from "nanoid";
import type { LocationData } from "../locations";
import type { RouteData } from "../routes";
import type { PoiData } from "./index";

// POI 基础数据
const wutongshanPoisData = [
  {
    name: "梧桐山山顶",
    description: "梧桐山主峰大梧桐，海拔943.7米，深圳最高点",
    coordinates: JSON.stringify({ lat: 22.5964, lng: 114.2185 }),
    category: "mountain_peak",
    extra: JSON.stringify({
      elevation: 943.7,
      openHours: "全天开放",
      fee: "免费",
    }),
  },
  {
    name: "好汉坡观景台",
    description: "位于好汉坡中途的观景平台，可俯瞰深圳市区",
    coordinates: JSON.stringify({ lat: 22.5923, lng: 114.2156 }),
    category: "viewpoint",
    extra: JSON.stringify({
      elevation: 650,
      bestTime: "日出、日落时分",
    }),
  },
  {
    name: "梧桐山村停车场",
    description: "泰山涧线路起点停车场，可停放约200辆车",
    coordinates: JSON.stringify({ lat: 22.5889, lng: 114.2123 }),
    category: "parking",
    extra: JSON.stringify({
      capacity: 200,
      fee: "首小时5元，之后每小时2元",
      openHours: "24小时",
    }),
  },
  {
    name: "泰山涧入口",
    description: "泰山涧步道入口，有登山指引和地图",
    coordinates: JSON.stringify({ lat: 22.5895, lng: 114.2134 }),
    category: "checkpoint",
    extra: JSON.stringify({
      hasRestroom: true,
      hasWater: true,
    }),
  },
  {
    name: "葫芦径",
    description: "泰山涧沿途的重要休息点，有石凳和凉亭",
    coordinates: JSON.stringify({ lat: 22.5934, lng: 114.2167 }),
    category: "viewpoint",
    extra: JSON.stringify({
      hasRestArea: true,
      elevation: 520,
    }),
  },
];

// 实体-POI 关联数据
const entityToPoisData = [
  // 梧桐山地点与POI的关联
  {
    poiName: "梧桐山山顶",
    entityType: "location",
    entitySlug: "wutong-mountain",
    roleType: "poi",
  },
  {
    poiName: "好汉坡观景台",
    entityType: "location",
    entitySlug: "wutong-mountain",
    roleType: "viewpoint",
  },
  // 泰山涧线路与POI的关联
  {
    poiName: "梧桐山村停车场",
    entityType: "route",
    entitySlug: "taishanjian-route",
    roleType: "checkpoint",
    order: 0,
  },
  {
    poiName: "泰山涧入口",
    entityType: "route",
    entitySlug: "taishanjian-route",
    roleType: "checkpoint",
    order: 1,
  },
  {
    poiName: "葫芦径",
    entityType: "route",
    entitySlug: "taishanjian-route",
    roleType: "waypoint",
    order: 2,
  },
  {
    poiName: "梧桐山山顶",
    entityType: "route",
    entitySlug: "taishanjian-route",
    roleType: "checkpoint",
    order: 3,
  },
  // 好汉坡线路与POI的关联
  {
    poiName: "好汉坡观景台",
    entityType: "route",
    entitySlug: "haohanpo-route",
    roleType: "viewpoint",
    order: 1,
  },
  {
    poiName: "梧桐山山顶",
    entityType: "route",
    entitySlug: "haohanpo-route",
    roleType: "checkpoint",
    order: 2,
  },
];

/**
 * 插入梧桐山 POI 数据
 */
export function seedWutongshanPois(
  db: Database,
  locations: LocationData[],
  routes: RouteData[]
): PoiData[] {
  // 插入 POI 基础数据
  const insertPoiStmt = db.prepare(`
    INSERT OR IGNORE INTO pois (id, name, description, coordinates, category, extra, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const now = Date.now();
  const poiMap = new Map<string, string>(); // name -> id

  for (const poi of wutongshanPoisData) {
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

  // 创建实体查找映射
  const locationMap = new Map<string, string>();
  for (const loc of locations) {
    locationMap.set(loc.slug, loc.id);
  }

  const routeMap = new Map<string, string>();
  for (const route of routes) {
    routeMap.set(route.name, route.id);
  }

  // 插入实体-POI 关联
  const insertEntityPoiStmt = db.prepare(`
    INSERT OR IGNORE INTO entity_to_pois (
      id, poi_id, entity_type, entity_id, role_type, "order", role_specific_data, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  for (const assoc of entityToPoisData) {
    const poiId = poiMap.get(assoc.poiName);
    let entityId: string | undefined;

    if (assoc.entityType === "location") {
      entityId = locationMap.get(assoc.entitySlug);
    } else if (assoc.entityType === "route") {
      entityId = routeMap.get(assoc.entitySlug);
    }

    if (poiId && entityId) {
      insertEntityPoiStmt.run(
        nanoid(),
        poiId,
        assoc.entityType,
        entityId,
        assoc.roleType,
        assoc.order ?? null,
        null,
        now
      );
      console.log(`  ✓ 关联: ${assoc.poiName} -> ${assoc.entitySlug}`);
    }
  }

  return wutongshanPoisData.map((poi) => ({
    id: poiMap.get(poi.name)!,
    name: poi.name,
  }));
}
