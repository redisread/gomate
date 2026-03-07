/**
 * 路线数据种子入口
 */

import type Database from "better-sqlite3";
import type { CityData } from "../cities";
import type { LocationData } from "../locations";
import { seedWutongshanRoutes } from "./wutongshan";

export interface RouteData {
  id: string;
  name: string;
  locationId: string;
}

/**
 * 插入所有路线数据
 */
export function seedRoutes(
  db: Database,
  cities: CityData[],
  locations: LocationData[]
): RouteData[] {
  console.log("🥾 开始插入路线数据...");

  const allRoutes: RouteData[] = [];

  // 梧桐山路线
  const wutongshanRoutes = seedWutongshanRoutes(db, cities, locations);
  allRoutes.push(...wutongshanRoutes);

  console.log(`✅ 路线数据插入完成，共 ${allRoutes.length} 条路线\n`);
  return allRoutes;
}

/**
 * 获取路线 ID 映射
 */
export function getRouteIdMap(routes: RouteData[]): Map<string, string> {
  const map = new Map<string, string>();
  for (const route of routes) {
    map.set(route.name, route.id);
  }
  return map;
}
