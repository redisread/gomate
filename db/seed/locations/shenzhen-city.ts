/**
 * 深圳城市地点数据种子
 */

import type Database from "better-sqlite3";
import { nanoid } from "nanoid";
import type { CityData } from "../cities";
import type { LocationData } from "./index";

const shenzhenCityLocations = [
  {
    name: "深圳",
    slug: "shenzhen-city",
    subtitle: "创新之都",
    description:
      "深圳是中国改革开放的前沿城市，从一个小渔村发展成为国际化大都市。这里不仅有繁华的都市景观、现代化的建筑群，还有丰富的自然资源。深圳拥有众多山体公园和海岸线，如梧桐山、七娘山、东西涌等，是户外爱好者的天堂。同时，深圳也是一座充满活力的创新之城，汇集了来自全国各地的年轻人，夜生活丰富多彩，美食文化多元包容。",
    address: "广东省深圳市",
    bestSeason: JSON.stringify(["春季", "秋季", "冬季"]),
    coverImage:
      "https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?w=800&q=80",
    images: JSON.stringify([
      "https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?w=800&q=80",
      "https://images.unsplash.com/photo-1518005068251-37900150dfca?w=800&q=80",
      "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80",
    ]),
    coordinates: JSON.stringify({ lat: 22.5431, lng: 114.0579 }),
    extra: JSON.stringify({
      facilities: ["地铁", "公交", "出租车", "共享单车", "高铁站", "机场"],
      tips: ["探索城市公园和山体绿道", "品尝各地美食", "逛华强北电子产品市场", "深圳湾公园骑行"],
      warnings: ["夏季炎热潮湿", "节假日景点人流量大"],
    }),
  },
];

export function seedShenzhenCityLocations(
  db: Database,
  cities: CityData[]
): LocationData[] {
  let shenzhenId: string | undefined;
  for (const city of cities) {
    if (city.adcode === "440300") {
      shenzhenId = city.id;
      break;
    }
  }

  if (!shenzhenId) {
    console.warn("⚠️  未找到深圳城市ID，跳过深圳城市地点数据插入");
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

  for (const location of shenzhenCityLocations) {
    const id = nanoid();
    insertStmt.run(
      id,
      location.name,
      location.slug,
      location.subtitle,
      location.description,
      location.address,
      shenzhenId,
      "深圳",
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
      cityId: shenzhenId,
    });
    console.log(`  ✓ ${location.name}`);
  }

  return insertedLocations;
}
