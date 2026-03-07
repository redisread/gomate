/**
 * POI 数据种子入口
 */

import type Database from "better-sqlite3";
import type { LocationData } from "../locations";
import type { RouteData } from "../routes";
import { seedWutongshanPois } from "./wutongshan";

export interface PoiData {
  id: string;
  name: string;
}

/**
 * 插入所有 POI 数据
 */
export function seedPois(
  db: Database,
  locations: LocationData[],
  routes: RouteData[]
): PoiData[] {
  console.log("📌 开始插入 POI 数据...");

  const allPois: PoiData[] = [];

  // 梧桐山 POI
  const wutongshanPois = seedWutongshanPois(db, locations, routes);
  allPois.push(...wutongshanPois);

  console.log(`✅ POI 数据插入完成，共 ${allPois.length} 个 POI\n`);
  return allPois;
}

/**
 * 获取 POI ID 映射
 */
export function getPoiIdMap(pois: PoiData[]): Map<string, string> {
  const map = new Map<string, string>();
  for (const poi of pois) {
    map.set(poi.name, poi.id);
  }
  return map;
}
