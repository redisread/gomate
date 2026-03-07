/**
 * 香港城市地点数据种子
 */

import type Database from "better-sqlite3";
import { nanoid } from "nanoid";
import type { CityData } from "../cities";
import type { LocationData } from "./index";

const hongkongCityLocations = [
  {
    name: "香港",
    slug: "hongkong-city",
    subtitle: "东方之珠",
    description:
      "香港是中华人民共和国特别行政区，被誉为「东方之珠」。这座国际大都会融合了东西方文化，既有繁华的都市景观，又有迷人的自然风光。维多利亚港的璀璨夜景、中环的摩天大楼、尖沙咀的购物天堂，以及遍布全港的郊野公园和徒步径，让香港成为一座动静皆宜的魅力之城。无论是品味地道港式茶餐厅美食，还是探索离岛风情，香港都能带给你独特的体验。",
    address: "香港特别行政区",
    bestSeason: JSON.stringify(["秋季", "冬季", "春季"]),
    coverImage:
      "https://images.unsplash.com/photo-1536599018102-9f803c140fc1?w=800&q=80",
    images: JSON.stringify([
      "https://images.unsplash.com/photo-1536599018102-9f803c140fc1?w=800&q=80",
      "https://images.unsplash.com/photo-1518599804613-9d5d5168430c?w=800&q=80",
      "https://images.unsplash.com/photo-1506318137071-a8e063b4bec0?w=800&q=80",
    ]),
    coordinates: JSON.stringify({ lat: 22.3193, lng: 114.1694 }),
    extra: JSON.stringify({
      facilities: ["地铁", "巴士", "电车", "渡轮", "机场快线", "出租车"],
      tips: ["乘坐天星小轮游览维港", "太平山顶看夜景", "品尝港式茶餐厅美食", "八达通卡方便出行"],
      warnings: ["夏季炎热多雨", "台风季注意天气预警", "物价较高，做好预算"],
    }),
  },
];

export function seedHongkongCityLocations(
  db: Database,
  cities: CityData[]
): LocationData[] {
  let hongkongId: string | undefined;
  for (const city of cities) {
    if (city.adcode === "810000") {
      hongkongId = city.id;
      break;
    }
  }

  if (!hongkongId) {
    console.warn("⚠️  未找到香港城市ID，跳过香港城市地点数据插入");
    return [];
  }

  const insertStmt = db.prepare(`
    INSERT OR IGNORE INTO locations (
      id, name, slug, subtitle, description, address, city_id, city_name,
      best_season, cover_image, images, coordinates, extra, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const now = Date.now();
  const insertedLocations: LocationData[] = [];

  for (const location of hongkongCityLocations) {
    const id = nanoid();
    insertStmt.run(
      id,
      location.name,
      location.slug,
      location.subtitle,
      location.description,
      location.address,
      hongkongId,
      "香港",
      location.bestSeason,
      location.coverImage,
      location.images,
      location.coordinates,
      location.extra,
      now,
      now
    );

    insertedLocations.push({
      id,
      name: location.name,
      slug: location.slug,
      cityId: hongkongId,
    });
    console.log(`  ✓ ${location.name}`);
  }

  return insertedLocations;
}
