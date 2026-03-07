/**
 * 长沙城市地点数据种子
 */

import type Database from "better-sqlite3";
import { nanoid } from "nanoid";
import type { CityData } from "../cities";
import type { LocationData } from "./index";

const changshaCityLocations = [
  {
    name: "长沙",
    slug: "changsha-city",
    subtitle: "星城",
    description:
      "长沙是湖南省省会，古称潭州，别名「星城」，是首批国家历史文化名城。这里既有「岳麓山、湘江水、橘子洲」的自然风光，又有深厚的湖湘文化底蕴。作为一座充满活力的现代都市，长沙以美食闻名全国，臭豆腐、口味虾、糖油粑粑等特色小吃让人流连忘返。同时，长沙也是一座娱乐之都，夜生活丰富多彩，是年轻人聚会游玩的理想目的地。",
    address: "湖南省长沙市",
    bestSeason: JSON.stringify(["春季", "秋季"]),
    coverImage:
      "https://images.unsplash.com/photo-1545893835-abaa50cbe628?w=800&q=80",
    images: JSON.stringify([
      "https://images.unsplash.com/photo-1545893835-abaa50cbe628?w=800&q=80",
      "https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?w=800&q=80",
      "https://images.unsplash.com/photo-1518005068251-37900150dfca?w=800&q=80",
    ]),
    coordinates: JSON.stringify({ lat: 28.2282, lng: 112.9388 }),
    extra: JSON.stringify({
      facilities: ["地铁", "公交", "出租车", "磁悬浮", "高铁站", "机场"],
      tips: ["品尝地道湘菜", "夜游橘子洲欣赏灯光秀", "太平老街逛吃", "岳麓山看枫叶（秋季最佳）"],
      warnings: ["夏季炎热潮湿", "节假日人流量大", "湘菜偏辣，注意饮食"],
    }),
  },
];

export function seedChangshaCityLocations(
  db: Database,
  cities: CityData[]
): LocationData[] {
  let changshaId: string | undefined;
  for (const city of cities) {
    if (city.adcode === "430100") {
      changshaId = city.id;
      break;
    }
  }

  if (!changshaId) {
    console.warn("⚠️  未找到长沙城市ID，跳过长沙城市地点数据插入");
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

  for (const location of changshaCityLocations) {
    const id = nanoid();
    insertStmt.run(
      id,
      location.name,
      location.slug,
      location.subtitle,
      location.description,
      location.address,
      changshaId,
      "长沙",
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
      cityId: changshaId,
    });
    console.log(`  ✓ ${location.name}`);
  }

  return insertedLocations;
}
