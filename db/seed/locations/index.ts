/**
 * 地点数据种子入口
 */

import type Database from "better-sqlite3";
import type { CityData } from "../cities";
import { seedShenzhenLocations } from "./shenzhen";

export interface LocationData {
  id: string;
  name: string;
  slug: string;
  cityId: string;
}

/**
 * 插入所有地点数据
 */
export function seedLocations(db: Database, cities: CityData[]): LocationData[] {
  console.log("📍 开始插入地点数据...");

  const allLocations: LocationData[] = [];

  // 深圳地点
  const shenzhenLocations = seedShenzhenLocations(db, cities);
  allLocations.push(...shenzhenLocations);

  console.log(`✅ 地点数据插入完成，共 ${allLocations.length} 个地点\n`);
  return allLocations;
}

/**
 * 获取地点 ID 映射
 */
export function getLocationIdMap(locations: LocationData[]): Map<string, string> {
  const map = new Map<string, string>();
  for (const location of locations) {
    map.set(location.slug, location.id);
    map.set(location.name, location.id);
  }
  return map;
}
