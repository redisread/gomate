/**
 * 丽江地点数据种子
 * 云南丽江市
 */

import type Database from "better-sqlite3";
import { nanoid } from "nanoid";
import type { CityData } from "../cities";
import type { LocationData } from "./index";

const lijiangLocations = [
  {
    name: "丽江古城",
    slug: "lijiang-old-town",
    subtitle: "东方威尼斯",
    description:
      "丽江古城又名大研古城，是中国历史文化名城之一，也是世界文化遗产。古城始建于宋末元初，距今已有800多年历史。城内街道依山傍水修建，以红色角砾岩铺就，有四方街、木府、五凤楼等景点。古城水系发达，小桥流水人家，被誉为「东方威尼斯」。",
    address: "云南省丽江市古城区",
    bestSeason: JSON.stringify(["春季", "秋季"]),
    coverImage:
      "https://images.unsplash.com/photo-1545063914-885712560550?w=800&q=80",
    images: JSON.stringify([
      "https://images.unsplash.com/photo-1545063914-885712560550?w=800&q=80",
      "https://images.unsplash.com/photo-1567157577867-05ccb1388e66?w=800&q=80",
      "https://images.unsplash.com/photo-1598887142487-3c8e6876c477?w=800&q=80",
    ]),
    coordinates: JSON.stringify({ lat: 26.8721, lng: 100.2296 }),
    extra: JSON.stringify({
      facilities: ["停车场", "民宿", "餐厅", "酒吧", "咖啡馆"],
      tips: ["夜游古城最有韵味", "四方街有篝火晚会", "狮子山可看全景"],
      warnings: ["古城内禁车", "石板路行走需注意", "旺季人多"],
    }),
  },
  {
    name: "玉龙雪山",
    slug: "yulong-snow-mountain",
    subtitle: "纳西神山",
    description:
      "玉龙雪山是北半球最南的大雪山，主峰扇子陡海拔5596米，是纳西族人心中的神山。雪山以险、奇、美、秀著称，有冰川公园、蓝月谷、云杉坪等景点。乘坐大索道可直达海拔4506米的冰川公园，近距离感受雪山魅力。蓝月谷湖水湛蓝，被誉为「小九寨」。",
    address: "云南省丽江市玉龙纳西族自治县",
    bestSeason: JSON.stringify(["春季", "冬季"]),
    coverImage:
      "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80",
    images: JSON.stringify([
      "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80",
      "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=800&q=80",
      "https://images.unsplash.com/photo-1454496522488-7a8e488e8606?w=800&q=80",
    ]),
    coordinates: JSON.stringify({ lat: 27.1008, lng: 100.1828 }),
    extra: JSON.stringify({
      facilities: ["索道", "观景台", "氧气站", "餐厅"],
      tips: ["提前准备氧气瓶", "注意高原反应", "蓝月谷不容错过"],
      warnings: ["海拔高易高反", "天气多变", "需提前预订索道票"],
    }),
  },
  {
    name: "泸沽湖",
    slug: "lugu-lake",
    subtitle: "高原女儿国",
    description:
      "泸沽湖位于云南与四川交界处，是中国第三大深水湖泊。湖水清澈蔚蓝，四周青山环抱，湖中有里务比岛、媳娃娥岛等岛屿。这里是摩梭人的故乡，保留着母系氏族社会的传统，被称为「女儿国」。环湖有里格半岛、情人滩、草海走婚桥等景点。",
    address: "云南省丽江市宁蒗彝族自治县泸沽湖",
    bestSeason: JSON.stringify(["春季", "秋季"]),
    coverImage:
      "https://images.unsplash.com/photo-1501785888041-af3ef285b470?w=800&q=80",
    images: JSON.stringify([
      "https://images.unsplash.com/photo-1501785888041-af3ef285b470?w=800&q=80",
      "https://images.unsplash.com/photo-1439066615861-d1af74d74000?w=800&q=80",
      "https://images.unsplash.com/photo-1548013146-72479768bada?w=800&q=80",
    ]),
    coordinates: JSON.stringify({ lat: 27.7093, lng: 100.7787 }),
    extra: JSON.stringify({
      facilities: ["环湖公路", "观景台", "码头", "客栈"],
      tips: ["环湖约70公里", "里格半岛看日出", "体验摩梭篝火晚会"],
      warnings: ["路程较远", "海拔较高", "注意防晒"],
    }),
  },
];

export function seedLijiangLocations(
  db: Database,
  cities: CityData[]
): LocationData[] {
  let lijiangId: string | undefined;
  for (const city of cities) {
    if (city.adcode === "530700") {
      lijiangId = city.id;
      break;
    }
  }

  if (!lijiangId) {
    console.warn("⚠️  未找到丽江城市ID，跳过丽江地点数据插入");
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

  for (const location of lijiangLocations) {
    const id = nanoid();
    insertStmt.run(
      id,
      location.name,
      location.slug,
      location.subtitle,
      location.description,
      location.address,
      lijiangId,
      "丽江",
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
      cityId: lijiangId,
    });
    console.log(`  ✓ ${location.name}`);
  }

  return insertedLocations;
}
