/**
 * 地点数据种子入口
 */

import type Database from "better-sqlite3";
import type { CityData } from "../cities";
import { seedShenzhenLocations } from "./shenzhen";
import { seedMaclehoseLocations } from "./maclehose";
import { seedWugongshanLocations } from "./wugongshan";
import { seedHengshanLocations } from "./hengshan";
import { seedKunmingLocations } from "./kunming";
import { seedKunmingCityLocations } from "./kunming-city";
import { seedChangshaCityLocations } from "./changsha";
import { seedHongkongCityLocations } from "./hongkong-city";
import { seedShenzhenCityLocations } from "./shenzhen-city";
import { seedChengduCityLocations } from "./chengdu-city";
import { seedYifangTiandiLocations } from "./yifang-tiandi";
import { seedKuddoCoffeeLocations } from "./kuddo-coffee";
import { seedDaliLocations } from "./dali";
import { seedLijiangLocations } from "./lijiang";
import { seedXishuangbannaLocations } from "./xishuangbanna";
import { seedGuilinLocations } from "./guilin";
import { seedLijiangRiverLocations } from "./lijiang-river";
import { seedLiuzhouLocations } from "./liuzhou";

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

  // 香港麦理浩径
  const maclehoseLocations = seedMaclehoseLocations(db, cities);
  allLocations.push(...maclehoseLocations);

  // 武功山
  const wugongshanLocations = seedWugongshanLocations(db, cities);
  allLocations.push(...wugongshanLocations);

  // 衡山
  const hengshanLocations = seedHengshanLocations(db, cities);
  allLocations.push(...hengshanLocations);

  // 昆明西山
  const kunmingLocations = seedKunmingLocations(db, cities);
  allLocations.push(...kunmingLocations);

  // 昆明城市
  const kunmingCityLocations = seedKunmingCityLocations(db, cities);
  allLocations.push(...kunmingCityLocations);

  // 长沙城市
  const changshaCityLocations = seedChangshaCityLocations(db, cities);
  allLocations.push(...changshaCityLocations);

  // 香港城市
  const hongkongCityLocations = seedHongkongCityLocations(db, cities);
  allLocations.push(...hongkongCityLocations);

  // 深圳城市
  const shenzhenCityLocations = seedShenzhenCityLocations(db, cities);
  allLocations.push(...shenzhenCityLocations);

  // 成都城市
  const chengduCityLocations = seedChengduCityLocations(db, cities);
  allLocations.push(...chengduCityLocations);

  // 壹方天地
  const yifangTiandiLocations = seedYifangTiandiLocations(db, cities);
  allLocations.push(...yifangTiandiLocations);

  // Kuddo Coffee
  const kuddoCoffeeLocations = seedKuddoCoffeeLocations(db, cities);
  allLocations.push(...kuddoCoffeeLocations);

  // 云南三城
  // 大理
  const daliLocations = seedDaliLocations(db, cities);
  allLocations.push(...daliLocations);

  // 丽江
  const lijiangLocations = seedLijiangLocations(db, cities);
  allLocations.push(...lijiangLocations);

  // 西双版纳
  const xishuangbannaLocations = seedXishuangbannaLocations(db, cities);
  allLocations.push(...xishuangbannaLocations);

  // 广西三城
  // 桂林
  const guilinLocations = seedGuilinLocations(db, cities);
  allLocations.push(...guilinLocations);

  // 漓江
  const lijiangRiverLocations = seedLijiangRiverLocations(db, cities);
  allLocations.push(...lijiangRiverLocations);

  // 柳州
  const liuzhouLocations = seedLiuzhouLocations(db, cities);
  allLocations.push(...liuzhouLocations);

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
