/**
 * POI 数据种子入口
 */

import type Database from "better-sqlite3";
import type { LocationData } from "../locations";
import type { RouteData } from "../routes";
import { seedWutongshanPois } from "./wutongshan";
import { seedQiniangshanPois } from "./qiniangshan";
import { seedDongxichongPois } from "./dongxichong";
import { seedYangtaishanPois } from "./yangtaishan";
import { seedMaluanshanPois } from "./maluanshan";
import { seedDayandingPois } from "./dayanding";
import { seedMeishajianPois } from "./meishajian";
import { seedDabijiashanPois } from "./dabijiashan";
import { seedFenghuangshanPois } from "./fenghuangshan";
import { seedDananshanPois } from "./dananshan";
import { seedLianhuashanPois } from "./lianhuashan";
import { seedNiunaipaiPois } from "./niunaipai";
import { seedMaclehosePois } from "./maclehose";
import { seedWugongshanPois } from "./wugongshan";
import { seedHengshanPois } from "./hengshan";
import { seedKunmingPois } from "./kunming";

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

  // 七娘山 POI
  const qiniangshanPois = seedQiniangshanPois(db, locations, routes);
  allPois.push(...qiniangshanPois);

  // 东西涌 POI
  const dongxichongPois = seedDongxichongPois(db, locations, routes);
  allPois.push(...dongxichongPois);

  // 阳台山 POI
  const yangtaishanPois = seedYangtaishanPois(db, locations, routes);
  allPois.push(...yangtaishanPois);

  // 马峦山 POI
  const maluanshanPois = seedMaluanshanPois(db, locations, routes);
  allPois.push(...maluanshanPois);

  // 大雁顶 POI
  const dayandingPois = seedDayandingPois(db, locations, routes);
  allPois.push(...dayandingPois);

  // 梅沙尖 POI
  const meishajianPois = seedMeishajianPois(db, locations, routes);
  allPois.push(...meishajianPois);

  // 大笔架山 POI
  const dabijiashanPois = seedDabijiashanPois(db, locations, routes);
  allPois.push(...dabijiashanPois);

  // 凤凰山 POI
  const fenghuangshanPois = seedFenghuangshanPois(db, locations, routes);
  allPois.push(...fenghuangshanPois);

  // 大南山 POI
  const dananshanPois = seedDananshanPois(db, locations, routes);
  allPois.push(...dananshanPois);

  // 莲花山 POI
  const lianhuashanPois = seedLianhuashanPois(db, locations, routes);
  allPois.push(...lianhuashanPois);

  // 牛奶排 POI
  const niunaipaiPois = seedNiunaipaiPois(db, locations, routes);
  allPois.push(...niunaipaiPois);

  // 麦理浩径 POI
  const maclehosePois = seedMaclehosePois(db, locations, routes);
  allPois.push(...maclehosePois);

  // 武功山 POI
  const wugongshanPois = seedWugongshanPois(db, locations, routes);
  allPois.push(...wugongshanPois);

  // 衡山 POI
  const hengshanPois = seedHengshanPois(db, locations, routes);
  allPois.push(...hengshanPois);

  // 昆明西山 POI
  const kunmingPois = seedKunmingPois(db, locations, routes);
  allPois.push(...kunmingPois);

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
