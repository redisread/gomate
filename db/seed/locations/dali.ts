/**
 * 大理地点数据种子
 * 云南大理白族自治州
 */

import type Database from "better-sqlite3";
import { nanoid } from "nanoid";
import type { CityData } from "../cities";
import type { LocationData } from "./index";

const daliLocations = [
  {
    name: "大理",
    slug: "dali-old-town",
    subtitle: "风花雪月之地",
    description:
      "大理古城位于云南省西部，是大理白族自治州的首府。古城始建于明洪武十五年，距今已有600多年历史。这里背靠苍山，面临洱海，四季如春，风景秀丽。古城内白族民居建筑独具特色，洋人街、人民路热闹非凡，是体验白族文化、品尝云南美食的绝佳去处。",
    address: "云南省大理白族自治州大理市",
    bestSeason: JSON.stringify(["春季", "夏季", "秋季", "冬季"]),
    coverImage:
      "https://images.unsplash.com/photo-1470004914212-05527e49370b?w=800&q=80",
    images: JSON.stringify([
      "https://images.unsplash.com/photo-1470004914212-05527e49370b?w=800&q=80",
      "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80",
      "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=800&q=80",
    ]),
    coordinates: JSON.stringify({ lat: 25.6949, lng: 100.1661 }),
    extra: JSON.stringify({
      facilities: ["停车场", "民宿", "餐厅", "酒吧", "咖啡馆"],
      tips: ["环洱海骑行必体验", "品尝白族三道茶", "登苍山观洱海全景", "夜游古城洋人街"],
      warnings: ["紫外线较强", "旺季住宿需提前预订"],
    }),
  },
  {
    name: "洱海",
    slug: "erhai-lake",
    subtitle: "高原明珠",
    description:
      "洱海是云南省第二大淡水湖，因形状似人耳而得名。湖水清澈见底，四周群山环抱，风光旖旎。环洱海一周约130公里，沿途经过双廊、喜洲、挖色等古镇村落，是骑行和自驾的绝佳路线。洱海日出日落美不胜收，是摄影爱好者的天堂。",
    address: "云南省大理白族自治州大理市洱海",
    bestSeason: JSON.stringify(["春季", "秋季"]),
    coverImage:
      "https://images.unsplash.com/photo-1548013146-72479768bada?w=800&q=80",
    images: JSON.stringify([
      "https://images.unsplash.com/photo-1548013146-72479768bada?w=800&q=80",
      "https://images.unsplash.com/photo-1599577908906-8d6c700342b5?w=800&q=80",
      "https://images.unsplash.com/photo-1527212986666-4d2d47a4d0cc?w=800&q=80",
    ]),
    coordinates: JSON.stringify({ lat: 25.7776, lng: 100.1864 }),
    extra: JSON.stringify({
      facilities: ["环湖公路", "观景台", "码头", "餐厅"],
      tips: ["环海骑行约需1-2天", "双廊古镇值得停留", "喜洲粑粑必尝"],
      warnings: ["注意防晒", "湖边风大"],
    }),
  },
  {
    name: "苍山",
    slug: "cangshan-mountain",
    subtitle: "云岭之颠",
    description:
      "苍山又名点苍山，是大理的天然屏障，有十九峰十八溪之说。主峰马龙峰海拔4122米，山顶终年积雪。苍山景色以雪、云、石著称，是大理「风花雪月」四景之一。乘坐洗马潭索道可直达山顶，俯瞰洱海全景。山中还有著名的感通寺、寂照庵等古刹。",
    address: "云南省大理白族自治州大理市苍山",
    bestSeason: JSON.stringify(["春季", "夏季", "秋季"]),
    coverImage:
      "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=800&q=80",
    images: JSON.stringify([
      "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=800&q=80",
      "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80",
      "https://images.unsplash.com/photo-1454496522488-7a8e488e8606?w=800&q=80",
    ]),
    coordinates: JSON.stringify({ lat: 25.6856, lng: 100.1065 }),
    extra: JSON.stringify({
      facilities: ["索道", "观景台", "休息站"],
      tips: ["建议乘坐索道上山", "山顶气温低需带外套", "寂照庵素斋有名"],
      warnings: ["高原反应需注意", "天气变化快"],
    }),
  },
];

export function seedDaliLocations(
  db: Database,
  cities: CityData[]
): LocationData[] {
  let daliId: string | undefined;
  for (const city of cities) {
    if (city.adcode === "532900") {
      daliId = city.id;
      break;
    }
  }

  if (!daliId) {
    console.warn("⚠️  未找到大理城市ID，跳过大理地点数据插入");
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

  for (const location of daliLocations) {
    const id = nanoid();
    insertStmt.run(
      id,
      location.name,
      location.slug,
      location.subtitle,
      location.description,
      location.address,
      daliId,
      "大理",
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
      cityId: daliId,
    });
    console.log(`  ✓ ${location.name}`);
  }

  return insertedLocations;
}
