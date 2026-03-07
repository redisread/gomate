/**
 * 城市数据种子
 * 包含深圳及周边热门徒步城市
 */

import type Database from "better-sqlite3";
import { nanoid } from "nanoid";

export interface CityData {
  id: string;
  adcode: string;
  name: string;
  pinyin: string;
  province: string;
  level: string;
  isHot: boolean;
  parentId: string | null;
  createdAt: number;
  updatedAt: number;
}

// 城市基础数据
const citiesData: Omit<CityData, "id" | "createdAt" | "updatedAt">[] = [
  {
    adcode: "440300",
    name: "深圳",
    pinyin: "shenzhen",
    province: "广东省",
    level: "city",
    isHot: true,
    parentId: null,
  },
  {
    adcode: "440100",
    name: "广州",
    pinyin: "guangzhou",
    province: "广东省",
    level: "city",
    isHot: true,
    parentId: null,
  },
  {
    adcode: "441900",
    name: "东莞",
    pinyin: "dongguan",
    province: "广东省",
    level: "city",
    isHot: false,
    parentId: null,
  },
  {
    adcode: "441300",
    name: "惠州",
    pinyin: "huizhou",
    province: "广东省",
    level: "city",
    isHot: false,
    parentId: null,
  },
  {
    adcode: "810000",
    name: "香港",
    pinyin: "hongkong",
    province: "香港特别行政区",
    level: "city",
    isHot: true,
    parentId: null,
  },
  {
    adcode: "530100",
    name: "昆明",
    pinyin: "kunming",
    province: "云南省",
    level: "city",
    isHot: true,
    parentId: null,
  },
  {
    adcode: "430100",
    name: "长沙",
    pinyin: "changsha",
    province: "湖南省",
    level: "city",
    isHot: true,
    parentId: null,
  },
  {
    adcode: "360300",
    name: "萍乡",
    pinyin: "pingxiang",
    province: "江西省",
    level: "city",
    isHot: false,
    parentId: null,
  },
  {
    adcode: "510100",
    name: "成都",
    pinyin: "chengdu",
    province: "四川省",
    level: "city",
    isHot: true,
    parentId: null,
  },
  // 云南省
  {
    adcode: "532900",
    name: "大理",
    pinyin: "dali",
    province: "云南省",
    level: "city",
    isHot: true,
    parentId: null,
  },
  {
    adcode: "530700",
    name: "丽江",
    pinyin: "lijiang",
    province: "云南省",
    level: "city",
    isHot: true,
    parentId: null,
  },
  {
    adcode: "532800",
    name: "西双版纳",
    pinyin: "xishuangbanna",
    province: "云南省",
    level: "city",
    isHot: true,
    parentId: null,
  },
  // 广西
  {
    adcode: "450200",
    name: "柳州",
    pinyin: "liuzhou",
    province: "广西壮族自治区",
    level: "city",
    isHot: false,
    parentId: null,
  },
];

/**
 * 插入城市数据
 */
export function seedCities(db: Database): CityData[] {
  console.log("🏙️  开始插入城市数据...");

  const insertStmt = db.prepare(`
    INSERT OR IGNORE INTO cities (id, adcode, name, pinyin, province, level, is_hot, parent_id, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const now = Date.now();
  const insertedCities: CityData[] = [];

  for (const city of citiesData) {
    const id = nanoid();
    insertStmt.run(
      id,
      city.adcode,
      city.name,
      city.pinyin,
      city.province,
      city.level,
      city.isHot ? 1 : 0,
      city.parentId,
      now,
      now
    );

    insertedCities.push({
      ...city,
      id,
      createdAt: now,
      updatedAt: now,
    });
    console.log(`  ✓ ${city.name}`);
  }

  console.log(`✅ 城市数据插入完成，共 ${insertedCities.length} 个城市\n`);
  return insertedCities;
}

/**
 * 获取城市 ID 映射
 */
export function getCityIdMap(cities: CityData[]): Map<string, string> {
  const map = new Map<string, string>();
  for (const city of cities) {
    map.set(city.adcode, city.id);
    map.set(city.name, city.id);
  }
  return map;
}
