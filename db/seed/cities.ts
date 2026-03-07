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
