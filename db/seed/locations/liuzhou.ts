/**
 * 柳州地点数据种子
 * 广西柳州市
 */

import type Database from "better-sqlite3";
import { nanoid } from "nanoid";
import type { CityData } from "../cities";
import type { LocationData } from "./index";

const liuzhouLocations = [
  {
    name: "柳州市区",
    slug: "liuzhou-city",
    subtitle: "龙城壶城",
    description:
      "柳州是广西最大的工业城市，也是一座有着2000多年历史的文化名城。柳江穿城而过，形成独特的「江流曲似九回肠」景观，市区宛如一个巨大的天然盆景，因此柳州又称「壶城」。柳州以螺蛳粉闻名全国，是吃货的天堂。此外，柳州的夜景也非常迷人，马鞍山上看夜景是必体验项目。",
    address: "广西壮族自治区柳州市",
    bestSeason: JSON.stringify(["春季", "秋季"]),
    coverImage:
      "https://images.unsplash.com/photo-1567157577867-05ccb1388e66?w=800&q=80",
    images: JSON.stringify([
      "https://images.unsplash.com/photo-1567157577867-05ccb1388e66?w=800&q=80",
      "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=800&q=80",
      "https://images.unsplash.com/photo-1596394516093-501ba68a0ba6?w=800&q=80",
    ]),
    coordinates: JSON.stringify({ lat: 24.3265, lng: 109.4285 }),
    extra: JSON.stringify({
      facilities: ["高铁站", "机场", "酒店", "餐厅", "水上巴士"],
      tips: ["一定要吃螺蛳粉", "马鞍山看夜景", "柳江夜游", "龙潭公园散步"],
      warnings: ["夏季炎热", "螺蛳粉味道较重"],
    }),
  },
  {
    name: "三江程阳八寨",
    slug: "chengyang-bazhai",
    subtitle: "侗族风情",
    description:
      "程阳八寨位于柳州三江县，是侗族聚居的八个自然村寨的统称。这里有世界四大名桥之一的程阳永济风雨桥，始建于1912年，是侗族建筑艺术的杰出代表。八个寨子依山傍水，吊脚楼鳞次栉比，鼓楼巍峨耸立，是体验侗族文化、欣赏侗族建筑、聆听侗族大歌的绝佳去处。",
    address: "广西壮族自治区柳州市三江侗族自治县林溪镇",
    bestSeason: JSON.stringify(["春季", "秋季"]),
    coverImage:
      "https://images.unsplash.com/photo-1568605114967-8130f3a36994?w=800&q=80",
    images: JSON.stringify([
      "https://images.unsplash.com/photo-1568605114967-8130f3a36994?w=800&q=80",
      "https://images.unsplash.com/photo-1548013146-72479768bada?w=800&q=80",
      "https://images.unsplash.com/photo-1567157577867-05ccb1388e66?w=800&q=80",
    ]),
    coordinates: JSON.stringify({ lat: 25.8985, lng: 109.5858 }),
    extra: JSON.stringify({
      facilities: ["民宿", "餐厅", "观景台", "风雨桥"],
      tips: ["程阳风雨桥必看", "体验侗族百家宴", "晚上有侗族歌舞表演"],
      warnings: ["距离市区较远", "山路弯多", "建议自驾"],
    }),
  },
];

export function seedLiuzhouLocations(
  db: Database,
  cities: CityData[]
): LocationData[] {
  let liuzhouId: string | undefined;
  for (const city of cities) {
    if (city.adcode === "450200") {
      liuzhouId = city.id;
      break;
    }
  }

  if (!liuzhouId) {
    console.warn("⚠️  未找到柳州城市ID，跳过柳州地点数据插入");
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

  for (const location of liuzhouLocations) {
    const id = nanoid();
    insertStmt.run(
      id,
      location.name,
      location.slug,
      location.subtitle,
      location.description,
      location.address,
      liuzhouId,
      "柳州",
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
      cityId: liuzhouId,
    });
    console.log(`  ✓ ${location.name}`);
  }

  return insertedLocations;
}
