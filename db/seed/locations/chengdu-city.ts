/**
 * 成都城市地点数据种子
 */

import type Database from "better-sqlite3";
import { nanoid } from "nanoid";
import type { CityData } from "../cities";
import type { LocationData } from "./index";

const chengduCityLocations = [
  {
    name: "成都",
    slug: "chengdu-city",
    subtitle: "天府之国",
    description:
      "成都是四川省省会，素有「天府之国」的美誉。这座有着4500年文明史的历史文化名城，是中国西南地区的经济、文化中心。成都以悠闲的生活方式闻名，茶馆文化、川剧变脸、火锅美食构成了独特的城市气质。作为大熊猫的故乡，成都拥有全球知名的大熊猫繁育研究基地。此外，成都周边青城山、都江堰、西岭雪山等景点众多，是探索四川自然风光的绝佳起点。",
    address: "四川省成都市",
    bestSeason: JSON.stringify(["春季", "秋季", "冬季"]),
    coverImage:
      "https://images.unsplash.com/photo-1508804185872-d7badad00f7d?w=800&q=80",
    images: JSON.stringify([
      "https://images.unsplash.com/photo-1508804185872-d7badad00f7d?w=800&q=80",
      "https://images.unsplash.com/photo-1545569341-9eb8b30979d9?w=800&q=80",
      "https://images.unsplash.com/photo-1565104425087-ecaa11baf556?w=800&q=80",
    ]),
    coordinates: JSON.stringify({ lat: 30.5728, lng: 104.0668 }),
    extra: JSON.stringify({
      facilities: ["地铁", "公交", "出租车", "共享单车", "高铁站", "机场"],
      tips: ["看大熊猫要早起", "品尝正宗火锅和串串", "逛宽窄巷子感受老成都", "体验茶馆文化"],
      warnings: ["夏季闷热多雨", "火锅较辣，注意饮食", "节假日景点人流量大"],
    }),
  },
];

export function seedChengduCityLocations(
  db: Database,
  cities: CityData[]
): LocationData[] {
  let chengduId: string | undefined;
  for (const city of cities) {
    if (city.adcode === "510100") {
      chengduId = city.id;
      break;
    }
  }

  if (!chengduId) {
    console.warn("⚠️  未找到成都城市ID，跳过成都城市地点数据插入");
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

  for (const location of chengduCityLocations) {
    const id = nanoid();
    insertStmt.run(
      id,
      location.name,
      location.slug,
      location.subtitle,
      location.description,
      location.address,
      chengduId,
      "成都",
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
      cityId: chengduId,
    });
    console.log(`  ✓ ${location.name}`);
  }

  return insertedLocations;
}
