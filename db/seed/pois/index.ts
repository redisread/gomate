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
import { seedKunmingCityPois } from "./kunming-city";
import { seedChangshaCityPois } from "./changsha";
import { seedHongkongCityPois } from "./hongkong-city";
import { seedShenzhenCityPois } from "./shenzhen-city";
import { seedChengduCityPois } from "./chengdu-city";
import { seedDaliPois } from "./dali";
import { seedLijiangPois } from "./lijiang";
import { seedXishuangbannaPois } from "./xishuangbanna";
import { seedLiuzhouPois } from "./liuzhou";
import { seedKuddoCoffeePois } from "./kuddo-coffee";
import { seedYifangTiandiPois } from "./yifang-tiandi";
import { seedErhaiLakePois } from "./erhai-lake";

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

  // 昆明城市 POI
  const kunmingCityPois = seedKunmingCityPois(db, locations, routes);
  allPois.push(...kunmingCityPois);

  // 长沙城市 POI
  const changshaCityPois = seedChangshaCityPois(db, locations, routes);
  allPois.push(...changshaCityPois);

  // 香港城市 POI
  const hongkongCityPois = seedHongkongCityPois(db, locations, routes);
  allPois.push(...hongkongCityPois);

  // 深圳城市 POI
  const shenzhenCityPois = seedShenzhenCityPois(db, locations, routes);
  allPois.push(...shenzhenCityPois);

  // 成都城市 POI
  const chengduCityPois = seedChengduCityPois(db, locations, routes);
  allPois.push(...chengduCityPois);

  // 云南三城 POI
  // 大理 POI
  const daliPois = seedDaliPois(db, locations, routes);
  allPois.push(...daliPois);

  // 丽江 POI
  const lijiangPois = seedLijiangPois(db, locations, routes);
  allPois.push(...lijiangPois);

  // 西双版纳 POI
  const xishuangbannaPois = seedXishuangbannaPois(db, locations, routes);
  allPois.push(...xishuangbannaPois);

  // 柳州 POI
  const liuzhouPois = seedLiuzhouPois(db, locations, routes);
  allPois.push(...liuzhouPois);

  // Kuddo Coffee POI
  const kuddoCoffeePois = seedKuddoCoffeePois(db, locations, routes);
  allPois.push(...kuddoCoffeePois);

  // 壹方天地 POI
  const yifangTiandiPois = seedYifangTiandiPois(db, locations, routes);
  allPois.push(...yifangTiandiPois);

  // 洱海 POI
  const erhaiLakePois = seedErhaiLakePois(db, locations, routes);
  allPois.push(...erhaiLakePois);

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
