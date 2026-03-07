/**
 * 西双版纳地点数据种子
 * 云南西双版纳傣族自治州
 */

import type Database from "better-sqlite3";
import { nanoid } from "nanoid";
import type { CityData } from "../cities";
import type { LocationData } from "./index";

const xishuangbannaLocations = [
  {
    name: "景洪市区",
    slug: "jinghong-city",
    subtitle: "热带风情之都",
    description:
      "景洪是西双版纳傣族自治州的首府，位于澜沧江畔，是一座充满热带风情的边境城市。这里有浓郁的傣族风情，金碧辉煌的佛寺，热闹的夜市，以及独特的热带水果。告庄西双景是网红打卡地，夜晚的星光夜市璀璨夺目，是体验傣族文化和品尝美食的好去处。",
    address: "云南省西双版纳傣族自治州景洪市",
    bestSeason: JSON.stringify(["冬季", "春季"]),
    coverImage:
      "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&q=80",
    images: JSON.stringify([
      "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&q=80",
      "https://images.unsplash.com/photo-1567157577867-05ccb1388e66?w=800&q=80",
      "https://images.unsplash.com/photo-1596394516093-501ba68a0ba6?w=800&q=80",
    ]),
    coordinates: JSON.stringify({ lat: 22.0073, lng: 100.7978 }),
    extra: JSON.stringify({
      facilities: ["机场", "酒店", "夜市", "餐厅", "佛寺"],
      tips: ["告庄西双景必去", "体验傣族泼水节", "品尝热带水果", "夜游澜沧江"],
      warnings: ["夏季炎热多雨", "注意防蚊"],
    }),
  },
  {
    name: "中科院植物园",
    slug: "xtbg",
    subtitle: "植物王国",
    description:
      "中国科学院西双版纳热带植物园是中国最大、物种最丰富的热带植物园，也是国家5A级旅游景区。园区占地1100公顷，收集了13000多种热带植物，有王莲池、棕榈园、奇花异卉园等特色园区。这里是植物爱好者的天堂，也是了解热带雨林生态系统的绝佳场所。",
    address: "云南省西双版纳傣族自治州勐腊县勐仑镇",
    bestSeason: JSON.stringify(["冬季", "春季", "夏季"]),
    coverImage:
      "https://images.unsplash.com/photo-1518531933037-91b2f5f229cc?w=800&q=80",
    images: JSON.stringify([
      "https://images.unsplash.com/photo-1518531933037-91b2f5f229cc?w=800&q=80",
      "https://images.unsplash.com/photo-1447752875215-b2761acb3c5d?w=800&q=80",
      "https://images.unsplash.com/photo-1501004318641-b39e6451bec6?w=800&q=80",
    ]),
    coordinates: JSON.stringify({ lat: 21.93, lng: 101.25 }),
    extra: JSON.stringify({
      facilities: ["游览车", "餐厅", "讲解员", "纪念品店"],
      tips: ["王莲7-8月最美", "建议购买电瓶车票", "西区适合拍照"],
      warnings: ["园区很大", "夏季炎热", "注意防蚊"],
    }),
  },
  {
    name: "野象谷",
    slug: "wild-elephant-valley",
    subtitle: "亚洲象家园",
    description:
      "野象谷是中国唯一可以近距离观赏亚洲野象的地方，位于西双版纳国家级自然保护区内。景区内有高空观象栈道、大象学校、热带雨林等景点。游客可以通过高空栈道安全地观察野生亚洲象的活动，也可以在大象学校观看大象表演，了解大象的生活习性。",
    address: "云南省西双版纳傣族自治州景洪市勐养镇",
    bestSeason: JSON.stringify(["冬季", "春季"]),
    coverImage:
      "https://images.unsplash.com/photo-1557050543-4d5f4e07ef46?w=800&q=80",
    images: JSON.stringify([
      "https://images.unsplash.com/photo-1557050543-4d5f4e07ef46?w=800&q=80",
      "https://images.unsplash.com/photo-1547721067-5514263b857c?w=800&q=80",
      "https://images.unsplash.com/photo-1501004318641-b39e6451bec6?w=800&q=80",
    ]),
    coordinates: JSON.stringify({ lat: 22.13, lng: 100.87 }),
    extra: JSON.stringify({
      facilities: ["高空栈道", "观景台", "餐厅", "大象学校"],
      tips: ["早上观象概率更高", "大象表演有固定时间", "建议提前到达"],
      warnings: ["观象需运气", "保持安静", "不要投喂动物"],
    }),
  },
];

export function seedXishuangbannaLocations(
  db: Database,
  cities: CityData[]
): LocationData[] {
  let xishuangbannaId: string | undefined;
  for (const city of cities) {
    if (city.adcode === "532800") {
      xishuangbannaId = city.id;
      break;
    }
  }

  if (!xishuangbannaId) {
    console.warn("⚠️  未找到西双版纳城市ID，跳过西双版纳地点数据插入");
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

  for (const location of xishuangbannaLocations) {
    const id = nanoid();
    insertStmt.run(
      id,
      location.name,
      location.slug,
      location.subtitle,
      location.description,
      location.address,
      xishuangbannaId,
      "西双版纳",
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
      cityId: xishuangbannaId,
    });
    console.log(`  ✓ ${location.name}`);
  }

  return insertedLocations;
}
