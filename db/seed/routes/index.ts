/**
 * 路线数据种子入口
 */

import type Database from "better-sqlite3";
import type { CityData } from "../cities";
import type { LocationData } from "../locations";
import { seedWutongshanRoutes } from "./wutongshan";
import { seedQiniangshanRoutes } from "./qiniangshan";
import { seedDongxichongRoutes } from "./dongxichong";
import { seedYangtaishanRoutes } from "./yangtaishan";
import { seedMaluanshanRoutes } from "./maluanshan";
import { seedDayandingRoutes } from "./dayanding";
import { seedMeishajianRoutes } from "./meishajian";
import { seedDabijiashanRoutes } from "./dabijiashan";
import { seedFenghuangshanRoutes } from "./fenghuangshan";
import { seedDananshanRoutes } from "./dananshan";
import { seedLianhuashanRoutes } from "./lianhuashan";
import { seedNiunaipaiRoutes } from "./niunaipai";
import { seedMaclehoseRoutes } from "./maclehose";
import { seedWugongshanRoutes } from "./wugongshan";
import { seedHengshanRoutes } from "./hengshan";
import { seedKunmingRoutes } from "./kunming";

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

  // 七娘山路线
  const qiniangshanRoutes = seedQiniangshanRoutes(db, cities, locations);
  allRoutes.push(...qiniangshanRoutes);

  // 东西涌路线
  const dongxichongRoutes = seedDongxichongRoutes(db, cities, locations);
  allRoutes.push(...dongxichongRoutes);

  // 阳台山路线
  const yangtaishanRoutes = seedYangtaishanRoutes(db, cities, locations);
  allRoutes.push(...yangtaishanRoutes);

  // 马峦山路线
  const maluanshanRoutes = seedMaluanshanRoutes(db, cities, locations);
  allRoutes.push(...maluanshanRoutes);

  // 大雁顶路线
  const dayandingRoutes = seedDayandingRoutes(db, cities, locations);
  allRoutes.push(...dayandingRoutes);

  // 梅沙尖路线
  const meishajianRoutes = seedMeishajianRoutes(db, cities, locations);
  allRoutes.push(...meishajianRoutes);

  // 大笔架山路线
  const dabijiashanRoutes = seedDabijiashanRoutes(db, cities, locations);
  allRoutes.push(...dabijiashanRoutes);

  // 凤凰山路线
  const fenghuangshanRoutes = seedFenghuangshanRoutes(db, cities, locations);
  allRoutes.push(...fenghuangshanRoutes);

  // 大南山路线
  const dananshanRoutes = seedDananshanRoutes(db, cities, locations);
  allRoutes.push(...dananshanRoutes);

  // 莲花山路线
  const lianhuashanRoutes = seedLianhuashanRoutes(db, cities, locations);
  allRoutes.push(...lianhuashanRoutes);

  // 牛奶排路线
  const niunaipaiRoutes = seedNiunaipaiRoutes(db, cities, locations);
  allRoutes.push(...niunaipaiRoutes);

  // 麦理浩径路线
  const maclehoseRoutes = seedMaclehoseRoutes(db, cities, locations);
  allRoutes.push(...maclehoseRoutes);

  // 武功山路线
  const wugongshanRoutes = seedWugongshanRoutes(db, cities, locations);
  allRoutes.push(...wugongshanRoutes);

  // 衡山路线
  const hengshanRoutes = seedHengshanRoutes(db, cities, locations);
  allRoutes.push(...hengshanRoutes);

  // 昆明西山路线
  const kunmingRoutes = seedKunmingRoutes(db, cities, locations);
  allRoutes.push(...kunmingRoutes);

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
