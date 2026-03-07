import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import * as schema from "./schema";
import * as fs from "fs";
import * as path from "path";
import { hashPassword } from "better-auth/crypto";

// 查找本地 D1 数据库路径
function findLocalD1Path(): string {
  if (process.env.LOCAL_DB_PATH) {
    return process.env.LOCAL_DB_PATH;
  }
  const d1Dir = path.join(__dirname, "../.wrangler/state/v3/d1/miniflare-D1DatabaseObject");
  if (fs.existsSync(d1Dir)) {
    // 排除 *.sqlite 空文件，按修改时间排序选择最新的
    const files = fs.readdirSync(d1Dir)
      .filter((f) => f.endsWith(".sqlite") && f !== "*.sqlite")
      .sort((a, b) => {
        const statA = fs.statSync(path.join(d1Dir, a));
        const statB = fs.statSync(path.join(d1Dir, b));
        return statB.mtime.getTime() - statA.mtime.getTime();
      });
    if (files.length > 0) {
      return path.join(d1Dir, files[0]);
    }
  }
  throw new Error(
    "找不到本地 D1 数据库。请先运行 `npm run dev` 初始化本地环境，或设置 LOCAL_DB_PATH 环境变量。"
  );
}

const dbPath = findLocalD1Path();
console.log(`📂 数据库路径: ${dbPath}\n`);

const sqlite = new Database(dbPath);
const db = drizzle(sqlite, { schema });

// 清空 miniflare KV（Better Auth 用 KV 缓存 session，需要同步清理）
function clearLocalKV(): void {
  try {
    const kvDir = path.join(__dirname, "../.wrangler/state/v3/kv/miniflare-KVNamespaceObject");
    if (!fs.existsSync(kvDir)) return;
    const kvFiles = fs.readdirSync(kvDir).filter((f) => f.endsWith(".sqlite"));
    for (const file of kvFiles) {
      const kvSqlite = new Database(path.join(kvDir, file));
      kvSqlite.prepare("DELETE FROM _mf_entries").run();
      kvSqlite.close();
    }
    console.log("   ✓ 清空 KV session 缓存");
  } catch {
    // KV 不存在时忽略
  }
}

// 测试数据 - 用户
const seedUsers: schema.NewUser[] = [
  {
    id: "test-user-1",
    name: "测试用户1",
    email: "wujiahong2013@gmail.com",
    emailVerified: true,
    level: "beginner",
    role: "admin",
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: "test-user-2",
    name: "测试用户2",
    email: "1427298682@qq.com",
    emailVerified: true,
    level: "beginner",
    role: "admin",
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: "test-user-3",
    name: "测试用户3",
    email: "1427298683@qq.com",
    emailVerified: true,
    level: "beginner",
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: "user-1",
    name: "山野行者",
    email: "hiker1@example.com",
    emailVerified: true,
    image: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop&crop=face",
    bio: "资深户外爱好者，深圳百山打卡进行中",
    level: "advanced",
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: "user-2",
    name: "光影猎人",
    email: "photo@example.com",
    emailVerified: true,
    image: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&h=100&fit=crop&crop=face",
    bio: "风光摄影师，专注山海摄影",
    level: "expert",
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: "user-3",
    name: "暖心领队",
    email: "leader@example.com",
    emailVerified: true,
    image: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&h=100&fit=crop&crop=face",
    bio: "热爱分享，擅长带领新手入门",
    level: "intermediate",
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: "user-4",
    name: "夜行侠",
    email: "night@example.com",
    emailVerified: true,
    image: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop&crop=face",
    bio: "夜爬达人，熟悉梧桐山每一条夜路",
    level: "advanced",
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: "user-5",
    name: "超级奶爸",
    email: "dad@example.com",
    emailVerified: true,
    image: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=100&h=100&fit=crop&crop=face",
    bio: "两个孩子的爸爸，经常带孩子户外活动",
    level: "intermediate",
    createdAt: new Date(),
    updatedAt: new Date(),
  },
];

// 测试数据 - 地点（匹配当前 locations 表结构）
const seedLocations: schema.NewLocation[] = [
  {
    id: "qiniangshan",
    name: "七娘山",
    slug: "qiniangshan",
    subtitle: "深圳第二高峰",
    description: "七娘山位于大鹏半岛南端，是深圳第二高峰，主峰海拔869米。山势险峻、雄伟，山中奇峰异石、岩洞、山泉、密林交相辉映。",
    bestSeason: JSON.stringify(["春季", "秋季", "冬季"]),
    coverImage: "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=1200&h=600&fit=crop",
    images: JSON.stringify([
      "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=800&h=600&fit=crop",
      "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&h=600&fit=crop",
    ]),
    address: "深圳市大鹏新区南澳街道七娘山地质公园",
    cityId: "city_shenzhen",
    cityName: "深圳",
    coordinates: JSON.stringify({ lat: 22.4523, lng: 114.5321 }),
    extra: JSON.stringify({ facilities: ["parking", "restroom"], warnings: ["山势陡峭，注意安全", "夏季雷雨多发", "全程无补给点"] }),
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: "wutongshan",
    name: "梧桐山",
    slug: "wutongshan",
    subtitle: "深圳最高峰",
    description: "梧桐山位于深圳东部，主峰大梧桐海拔943.7米，是深圳最高峰。这里山势巍峨，森林茂密，是深圳市民最喜爱的登山目的地之一。",
    bestSeason: JSON.stringify(["全年"]),
    coverImage: "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?w=1200&h=600&fit=crop",
    images: JSON.stringify([
      "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?w=800&h=600&fit=crop",
      "https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=800&h=600&fit=crop",
    ]),
    address: "深圳市罗湖区梧桐山风景区",
    cityId: "city_shenzhen",
    cityName: "深圳",
    coordinates: JSON.stringify({ lat: 22.5836, lng: 114.2165 }),
    extra: JSON.stringify({ facilities: ["parking", "restroom", "water", "food"], warnings: ["好汉坡路段较陡", "周末人流量大"] }),
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: "dongxichong",
    name: "东西冲",
    slug: "dongxichong",
    subtitle: "深圳最美海岸线",
    description: "东西冲穿越是深圳最经典的海岸线徒步路线，从东冲沙滩到西冲沙滩，全长约8公里。沿途可欣赏深圳最美的海岸风光。",
    bestSeason: JSON.stringify(["秋季", "冬季", "春季"]),
    coverImage: "https://images.unsplash.com/photo-1505142468610-359e7d316be0?w=1200&h=600&fit=crop",
    images: JSON.stringify([
      "https://images.unsplash.com/photo-1505142468610-359e7d316be0?w=800&h=600&fit=crop",
      "https://images.unsplash.com/photo-1437719417032-8595fd9e9dc6?w=800&h=600&fit=crop",
    ]),
    address: "深圳市大鹏新区东冲沙滩",
    cityId: "city_shenzhen",
    cityName: "深圳",
    coordinates: JSON.stringify({ lat: 22.4567, lng: 114.5234 }),
    extra: JSON.stringify({ facilities: ["parking"], warnings: ["涨潮时部分路段不可通行", "礁石湿滑注意安全"] }),
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: "maluanshan",
    name: "马峦山",
    slug: "maluanshan",
    subtitle: "深圳最大瀑布群",
    description: "马峦山位于深圳坪山区，以瀑布群闻名。这里有深圳最大的瀑布群，最大的瀑布落差达30米。",
    bestSeason: JSON.stringify(["夏季", "秋季"]),
    coverImage: "https://images.unsplash.com/photo-1432405972618-c60b0225b8f9?w=1200&h=600&fit=crop",
    images: JSON.stringify([
      "https://images.unsplash.com/photo-1432405972618-c60b0225b8f9?w=800&h=600&fit=crop",
      "https://images.unsplash.com/photo-1465146344425-f00d5f5c8f07?w=800&h=600&fit=crop",
    ]),
    address: "深圳市坪山区马峦山郊野公园",
    cityId: "city_shenzhen",
    cityName: "深圳",
    coordinates: JSON.stringify({ lat: 22.6789, lng: 114.3456 }),
    extra: JSON.stringify({ facilities: ["parking", "restroom"], warnings: ["雨后溪水暴涨注意安全", "夏季蚊虫较多"] }),
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: "tanglangshan",
    name: "塘朗山",
    slug: "tanglangshan",
    subtitle: "城市中的绿洲",
    description: "塘朗山位于深圳南山区，是市中心的一片绿洲。主峰海拔430米，可俯瞰深圳湾和香港。",
    bestSeason: JSON.stringify(["全年"]),
    coverImage: "https://images.unsplash.com/photo-1447752875215-b2761acb3c5d?w=1200&h=600&fit=crop",
    images: JSON.stringify([
      "https://images.unsplash.com/photo-1447752875215-b2761acb3c5d?w=800&h=600&fit=crop",
      "https://images.unsplash.com/photo-1511497584788-876760111969?w=800&h=600&fit=crop",
    ]),
    address: "深圳市南山区塘朗山郊野公园（龙珠门入口）",
    cityId: "city_shenzhen",
    cityName: "深圳",
    coordinates: JSON.stringify({ lat: 22.5567, lng: 113.9789 }),
    extra: JSON.stringify({ facilities: ["parking", "restroom", "water"], warnings: ["傍晚下山注意天黑", "部分路段无灯"] }),
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: "dayanding",
    name: "大雁顶",
    slug: "dayanding",
    subtitle: "深圳第三高峰",
    description: "大雁顶位于大鹏半岛七娘山系，海拔801米，是深圳第三高峰。山顶可俯瞰大鹏湾、排牙山等美景，是摄影爱好者的天堂。",
    bestSeason: JSON.stringify(["春季", "秋季", "冬季"]),
    coverImage: "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1200&h=600&fit=crop",
    images: JSON.stringify([
      "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&h=600&fit=crop",
      "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=800&h=600&fit=crop",
    ]),
    address: "深圳市大鹏新区杨梅坑鹿嘴山庄",
    cityId: "city_shenzhen",
    cityName: "深圳",
    coordinates: JSON.stringify({ lat: 22.4789, lng: 114.5678 }),
    extra: JSON.stringify({ facilities: ["parking", "restroom"], warnings: ["山路较陡", "山顶风大", "全程无补给"] }),
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: "meishajian",
    name: "梅沙尖",
    slug: "meishajian",
    subtitle: "360度观景平台",
    description: "梅沙尖海拔753米，是深圳第四高峰。山顶视野开阔，可360度俯瞰盐田港、大梅沙、梧桐山、七娘山等美景。",
    bestSeason: JSON.stringify(["全年"]),
    coverImage: "https://images.unsplash.com/photo-1519681393784-d120267933ba?w=1200&h=600&fit=crop",
    images: JSON.stringify([
      "https://images.unsplash.com/photo-1519681393784-d120267933ba?w=800&h=600&fit=crop",
      "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?w=800&h=600&fit=crop",
    ]),
    address: "深圳市盐田区三洲田梅沙尖",
    cityId: "city_shenzhen",
    cityName: "深圳",
    coordinates: JSON.stringify({ lat: 22.6012, lng: 114.2890 }),
    extra: JSON.stringify({ facilities: ["parking"], warnings: ["部分路段为野路", "注意防滑", "无补给点"] }),
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: "dabijiashan",
    name: "大笔架山",
    slug: "dabijiashan",
    subtitle: "深圳十峰之一",
    description: "大笔架山位于深圳与惠州交界处，海拔717米，是深圳十峰之一。山势起伏，是深圳经典的三水线的重要组成部分。",
    bestSeason: JSON.stringify(["秋季", "冬季", "春季"]),
    coverImage: "https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=1200&h=600&fit=crop",
    images: JSON.stringify([
      "https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=800&h=600&fit=crop",
      "https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=800&h=600&fit=crop",
    ]),
    address: "深圳市龙岗区葵涌街道大笔架山",
    cityId: "city_shenzhen",
    cityName: "深圳",
    coordinates: JSON.stringify({ lat: 22.6456, lng: 114.4123 }),
    extra: JSON.stringify({ facilities: ["parking"], warnings: ["路线较长", "需要一定体能", "无补给点"] }),
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: "yangtaishan",
    name: "阳台山",
    slug: "yangtaishan",
    subtitle: "羊台叠翠",
    description: "阳台山（原名羊台山）海拔587米，是深圳八景之一「羊台叠翠」所在地。横跨宝安、龙华、南山三区，是深圳西部最高峰。",
    bestSeason: JSON.stringify(["全年"]),
    coverImage: "https://images.unsplash.com/photo-1547036967-23d11aacaee0?w=1200&h=600&fit=crop",
    images: JSON.stringify([
      "https://images.unsplash.com/photo-1547036967-23d11aacaee0?w=800&h=600&fit=crop",
      "https://images.unsplash.com/photo-1501785888041-af3ef285b470?w=800&h=600&fit=crop",
    ]),
    address: "深圳市宝安区石岩街道阳台山森林公园",
    cityId: "city_shenzhen",
    cityName: "深圳",
    coordinates: JSON.stringify({ lat: 22.6789, lng: 113.9234 }),
    extra: JSON.stringify({ facilities: ["parking", "restroom", "water"], warnings: ["部分路段较陡", "周末人流量大"] }),
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: "fenghuangshan",
    name: "凤凰山",
    slug: "fenghuangshan",
    subtitle: "宝安第一山",
    description: "凤凰山海拔376米，被誉为「宝安第一山」。山上有凤岩古庙，是深圳著名的祈福圣地，也是休闲徒步的好去处。",
    bestSeason: JSON.stringify(["全年"]),
    coverImage: "https://images.unsplash.com/photo-1508672019048-805c876b67e2?w=1200&h=600&fit=crop",
    images: JSON.stringify([
      "https://images.unsplash.com/photo-1508672019048-805c876b67e2?w=800&h=600&fit=crop",
      "https://images.unsplash.com/photo-1447752875215-b2761acb3c5d?w=800&h=600&fit=crop",
    ]),
    address: "深圳市宝安区福永街道凤凰山森林公园",
    cityId: "city_shenzhen",
    cityName: "深圳",
    coordinates: JSON.stringify({ lat: 22.7123, lng: 113.8567 }),
    extra: JSON.stringify({ facilities: ["parking", "restroom", "water", "food"], warnings: ["古庙人多时注意财物", "部分台阶较陡"] }),
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: "dananshan",
    name: "大南山",
    slug: "dananshan",
    subtitle: "俯瞰深圳湾",
    description: "大南山海拔336米，位于深圳南山区。山顶可俯瞰深圳湾、香港元朗、前海自贸区等美景，是观赏城市夜景的绝佳地点。",
    bestSeason: JSON.stringify(["全年"]),
    coverImage: "https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?w=1200&h=600&fit=crop",
    images: JSON.stringify([
      "https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?w=800&h=600&fit=crop",
      "https://images.unsplash.com/photo-1480714378408-67cf0d13bc1b?w=800&h=600&fit=crop",
    ]),
    address: "深圳市南山区蛇口大南山",
    cityId: "city_shenzhen",
    cityName: "深圳",
    coordinates: JSON.stringify({ lat: 22.5123, lng: 113.9234 }),
    extra: JSON.stringify({ facilities: ["parking", "restroom", "water"], warnings: ["部分路段无灯", "夜间注意防滑"] }),
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: "lianhuashan",
    name: "莲花山",
    slug: "lianhuashan",
    subtitle: "市中心绿肺",
    description: "莲花山海拔106米，位于深圳市中心区。山顶有邓小平铜像，可俯瞰整个福田中心区，是市民休闲健身的热门场所。",
    bestSeason: JSON.stringify(["全年"]),
    coverImage: "https://images.unsplash.com/photo-1518005068251-37900150dfca?w=1200&h=600&fit=crop",
    images: JSON.stringify([
      "https://images.unsplash.com/photo-1518005068251-37900150dfca?w=800&h=600&fit=crop",
      "https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?w=800&h=600&fit=crop",
    ]),
    address: "深圳市福田区莲花山森林公园",
    cityId: "city_shenzhen",
    cityName: "深圳",
    coordinates: JSON.stringify({ lat: 22.5534, lng: 114.0567 }),
    extra: JSON.stringify({ facilities: ["parking", "restroom", "water", "food"], warnings: ["节假日人流量极大", "注意保管随身物品"] }),
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: "niunaipai",
    name: "牛奶排",
    slug: "niunaipai",
    subtitle: "深圳最难海岸线",
    description: "牛奶排位于大鹏半岛最南端，是深圳难度最高的海岸线穿越路线。需要攀爬、绳降、泅渡等多种技能，被誉为深圳户外毕业线路。",
    bestSeason: JSON.stringify(["秋季", "冬季"]),
    coverImage: "https://images.unsplash.com/photo-1505142468610-359e7d316be0?w=1200&h=600&fit=crop",
    images: JSON.stringify([
      "https://images.unsplash.com/photo-1505142468610-359e7d316be0?w=800&h=600&fit=crop",
      "https://images.unsplash.com/photo-1437719417032-8595fd9e9dc6?w=800&h=600&fit=crop",
    ]),
    address: "深圳市大鹏新区西涌牛奶排",
    cityId: "city_shenzhen",
    cityName: "深圳",
    coordinates: JSON.stringify({ lat: 22.4234, lng: 114.5012 }),
    extra: JSON.stringify({ facilities: ["parking"], warnings: ["难度极高，新手勿入", "需要专业装备", "注意潮汐变化", "建议结伴而行"] }),
    createdAt: new Date(),
    updatedAt: new Date(),
  },
];

// 测试数据 - 路线（每个 location 一条主路线，匹配 routes 表结构）
const seedRoutes: schema.NewRoute[] = [
  {
    id: "route-qiniangshan",
    locationId: "qiniangshan",
    cityId: "city_shenzhen",
    name: "七娘山环线",
    description: "七娘山环线是经典徒步路线，从地质公园出发，经主峰后从另一侧下山，全程约12公里。",
    difficulty: "hard",
    durationMin: 360,
    durationMax: 480,
    distance: 12,
    elevation: 869,
    routeGuide: JSON.stringify({ overview: "地质公园入口→半山亭→主峰→环线下山", tips: ["注意标识牌", "不要走野路"] }),
    extra: JSON.stringify({ equipmentNeeded: ["登山杖", "防风外套", "充足的水"], warnings: ["山势陡峭，注意安全", "夏季雷雨多发"] }),
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: "route-qiniangshan-kekao",
    locationId: "qiniangshan",
    cityId: "city_shenzhen",
    name: "七娘山主峰科考线",
    description: "官方修建的主要登山道，从地质公园博物馆出发，经一号观景台、二号观景台到达主峰后原路返回，路况最好，适合大多数徒步者",
    difficulty: "moderate",
    durationMin: 300,
    durationMax: 360,
    distance: 9,
    elevation: 850,
    routeGuide: JSON.stringify({
      overview: "地质公园博物馆→主峰科考线入口→一号观景台→二号观景台→七娘山主峰→原路返回",
      tips: ["登山口需要登记身份证", "全程台阶路，路况良好", "山上无补给，带足水和食物"]
    }),
    extra: JSON.stringify({
      equipmentNeeded: ["登山鞋", "充足的水(2-2.5L)", "路餐", "防晒用品", "防风外套"],
      warnings: ["下午3点后不建议上山", "禁止夜间登山", "不要偏离步道"]
    }),
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: "route-wutongshan",
    locationId: "wutongshan",
    cityId: "city_shenzhen",
    name: "梧桐山好汉坡线",
    description: "梧桐山最经典路线，从梧桐山村出发，经好汉坡登顶，全程约10公里。",
    difficulty: "moderate",
    durationMin: 240,
    durationMax: 360,
    distance: 10,
    elevation: 944,
    routeGuide: JSON.stringify({ overview: "梧桐山村→好汉坡→大梧桐顶→泰山涧下山", tips: ["好汉坡较陡", "可选择泰山涧路线"] }),
    extra: JSON.stringify({ equipmentNeeded: ["登山鞋", "足够的水", "防晒用品"], warnings: ["好汉坡路段较陡", "周末人流量大"] }),
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: "route-dongxichong",
    locationId: "dongxichong",
    cityId: "city_shenzhen",
    name: "东西冲海岸穿越",
    description: "东西冲穿越是深圳最受欢迎的海岸线路线，沿途需要攀爬礁石、穿越沙滩，风景绝美。",
    difficulty: "moderate",
    durationMin: 300,
    durationMax: 420,
    distance: 8,
    elevation: 200,
    routeGuide: JSON.stringify({ overview: "东冲沙滩→礁石群→穿鼻岩→西冲沙滩", tips: ["注意潮汐时间", "礁石湿滑小心"] }),
    extra: JSON.stringify({ equipmentNeeded: ["防滑鞋", "手套", "防晒用品"], warnings: ["涨潮时部分路段不可通行", "礁石湿滑注意安全"] }),
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: "route-maluanshan",
    locationId: "maluanshan",
    cityId: "city_shenzhen",
    name: "马峦山瀑布线",
    description: "马峦山最经典路线，从北门进入，经瀑布群后从西北门出，全程约6公里。",
    difficulty: "easy",
    durationMin: 180,
    durationMax: 240,
    distance: 6,
    elevation: 590,
    routeGuide: JSON.stringify({ overview: "北门入口→龙潭瀑布→马峦山瀑布群→西北门", tips: ["雨后瀑布最壮观", "路面可能湿滑"] }),
    extra: JSON.stringify({ equipmentNeeded: ["泳衣", "驱蚊水", "防滑鞋"], warnings: ["雨后溪水暴涨注意安全", "夏季蚊虫较多"] }),
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: "route-tanglangshan",
    locationId: "tanglangshan",
    cityId: "city_shenzhen",
    name: "塘朗山龙珠门线",
    description: "塘朗山路线简单明了，从龙珠门进入，沿盘山公路或石阶路登顶，适合各年龄段。",
    difficulty: "easy",
    durationMin: 120,
    durationMax: 180,
    distance: 5,
    elevation: 430,
    routeGuide: JSON.stringify({ overview: "龙珠门→盘山公路/石阶路→山顶观景台", tips: ["石阶路更快但更陡", "傍晚时分风景最好"] }),
    extra: JSON.stringify({ equipmentNeeded: ["运动鞋", "水", "小零食"], warnings: ["傍晚下山注意天黑", "部分路段无灯"] }),
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: "route-dayanding",
    locationId: "dayanding",
    cityId: "city_shenzhen",
    name: "大雁顶鹿嘴山庄线",
    description: "从鹿嘴山庄出发，经杨梅坑绿道进入登山口，是通往大雁顶最经典的路线。",
    difficulty: "hard",
    durationMin: 300,
    durationMax: 420,
    distance: 10,
    elevation: 801,
    routeGuide: JSON.stringify({ overview: "鹿嘴山庄→杨梅坑绿道→大雁顶登山口→山顶", tips: ["登山口需登记", "部分路段较陡", "山顶风景绝佳"] }),
    extra: JSON.stringify({ equipmentNeeded: ["登山鞋", "登山杖", "充足的水(2L+)", "路餐", "防风外套"], warnings: ["山路较陡", "山顶风大", "全程无补给"] }),
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: "route-meishajian",
    locationId: "meishajian",
    cityId: "city_shenzhen",
    name: "梅沙尖山海大观线",
    description: "从山海大观入口出发，经茶园到达梅沙尖山顶，可欣赏360度山海全景。",
    difficulty: "moderate",
    durationMin: 180,
    durationMax: 240,
    distance: 6,
    elevation: 753,
    routeGuide: JSON.stringify({ overview: "山海大观→茶园→梅沙尖顶→原路返回", tips: ["建议走山海大观入口", "部分野路注意标识"] }),
    extra: JSON.stringify({ equipmentNeeded: ["登山鞋", "水(1.5L)", "路餐", "防晒用品"], warnings: ["部分路段为野路", "注意防滑", "无补给点"] }),
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: "route-dabijiashan",
    locationId: "dabijiashan",
    cityId: "city_shenzhen",
    name: "大笔架山三水线",
    description: "大笔架山是深圳经典三水线的重要节点，从白沙湾出发穿越大笔架山，是户外爱好者的挑战线路。",
    difficulty: "hard",
    durationMin: 420,
    durationMax: 600,
    distance: 15,
    elevation: 717,
    routeGuide: JSON.stringify({ overview: "白沙湾→大笔架山→土地庙→金龟村", tips: ["此路线较长", "需要较好体能", "建议早出发"] }),
    extra: JSON.stringify({ equipmentNeeded: ["登山鞋", "登山杖", "头灯", "充足的水(3L+)", "路餐", "急救包"], warnings: ["路线较长", "需要一定体能", "无补给点"] }),
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: "route-yangtaishan",
    locationId: "yangtaishan",
    cityId: "city_shenzhen",
    name: "阳台山石岩线",
    description: "从石岩入口进入阳台山，经登山步道到达大阳台山顶，可俯瞰深圳西部全景。",
    difficulty: "moderate",
    durationMin: 180,
    durationMax: 300,
    distance: 8,
    elevation: 587,
    routeGuide: JSON.stringify({ overview: "石岩入口→登山步道→大阳台→小阳台", tips: ["石阶路为主", "有多个入口可选择"] }),
    extra: JSON.stringify({ equipmentNeeded: ["登山鞋", "水(1.5L)", "路餐"], warnings: ["部分路段较陡", "周末人流量大"] }),
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: "route-fenghuangshan",
    locationId: "fenghuangshan",
    cityId: "city_shenzhen",
    name: "凤凰山凤岩古庙线",
    description: "从凤凰广场出发，经凤岩古庙到达山顶，是深圳最经典的祈福+登山路线。",
    difficulty: "easy",
    durationMin: 90,
    durationMax: 150,
    distance: 4,
    elevation: 376,
    routeGuide: JSON.stringify({ overview: "凤凰广场→凤岩古庙→山顶望烟楼→下山", tips: ["可参拜古庙", "山路较缓", "适合全家"] }),
    extra: JSON.stringify({ equipmentNeeded: ["运动鞋", "水", "小零食"], warnings: ["古庙人多时注意财物", "部分台阶较陡"] }),
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: "route-dananshan",
    locationId: "dananshan",
    cityId: "city_shenzhen",
    name: "大南山北登山口线",
    description: "从北登山口出发，经台阶路直达山顶，是观赏深圳湾夜景的最佳路线。",
    difficulty: "easy",
    durationMin: 60,
    durationMax: 120,
    distance: 3,
    elevation: 336,
    routeGuide: JSON.stringify({ overview: "北登山口→台阶路→山顶观景台→原路返回", tips: ["台阶路为主", "傍晚可看日落", "夜景超美"] }),
    extra: JSON.stringify({ equipmentNeeded: ["运动鞋", "水", "手电筒（夜爬）"], warnings: ["部分路段无灯", "夜间注意防滑"] }),
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: "route-lianhuashan",
    locationId: "lianhuashan",
    cityId: "city_shenzhen",
    name: "莲花山南门线",
    description: "从南门进入，沿缓坡登山道到达山顶广场，瞻仰邓小平铜像，俯瞰福田中心区。",
    difficulty: "easy",
    durationMin: 30,
    durationMax: 60,
    distance: 2,
    elevation: 106,
    routeGuide: JSON.stringify({ overview: "南门→登山道→山顶广场→邓小平铜像", tips: ["坡度平缓", "适合老人小孩", "风筝广场可放风筝"] }),
    extra: JSON.stringify({ equipmentNeeded: ["运动鞋", "水"], warnings: ["节假日人流量极大", "注意保管随身物品"] }),
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: "route-niunaipai",
    locationId: "niunaipai",
    cityId: "city_shenzhen",
    name: "牛奶排西涌线",
    description: "深圳最难海岸线穿越路线，需要攀爬、绳降、泅渡等多种技能，仅限经验丰富的户外达人。",
    difficulty: "expert",
    durationMin: 480,
    durationMax: 600,
    distance: 8,
    elevation: 200,
    routeGuide: JSON.stringify({ overview: "西涌沙滩→牛奶排海岸线→崖壁攀爬→安全撤离点", tips: ["必须结伴而行", "携带专业装备", "提前了解潮汐"] }),
    extra: JSON.stringify({ equipmentNeeded: ["登山鞋", "救生衣", "绳索", "头盔", "手套", "头灯", "充足的水和食物", "急救包"], warnings: ["难度极高，新手勿入", "需要专业装备", "注意潮汐变化", "建议结伴而行"] }),
    createdAt: new Date(),
    updatedAt: new Date(),
  },
];

// 测试数据 - 打卡点 POI（每个 location 5 个有意义的地标打卡点）
const seedPois: schema.NewPoi[] = [
  // 七娘山
  { id: "poi-qnns-1", name: "七娘山地质公园", description: "七娘山地质公园入口，徒步起点", coordinates: JSON.stringify({ lat: 22.4523, lng: 114.5321 }), category: "checkpoint", createdAt: new Date(), updatedAt: new Date() },
  { id: "poi-qnns-2", name: "半山亭", description: "半山休息亭，可俯瞰山下风光", coordinates: JSON.stringify({ lat: 22.4556, lng: 114.5342 }), category: "rest_area", createdAt: new Date(), updatedAt: new Date() },
  { id: "poi-qnns-3", name: "七娘山主峰", description: "七娘山主峰，海拔869米", coordinates: JSON.stringify({ lat: 22.4601, lng: 114.5389 }), category: "mountain_peak", createdAt: new Date(), updatedAt: new Date() },
  { id: "poi-qnns-4", name: "三角山", description: "七娘山三角山，重要地标", coordinates: JSON.stringify({ lat: 22.4578, lng: 114.5412 }), category: "mountain_peak", createdAt: new Date(), updatedAt: new Date() },
  { id: "poi-qnns-5", name: "杨梅坑观景点", description: "可远眺杨梅坑海湾的绝佳观景点", coordinates: JSON.stringify({ lat: 22.4534, lng: 114.5445 }), category: "viewpoint", createdAt: new Date(), updatedAt: new Date() },
  // 梧桐山
  { id: "poi-wts-1", name: "梧桐山村", description: "梧桐山登山起点，村落入口", coordinates: JSON.stringify({ lat: 22.5836, lng: 114.2165 }), category: "checkpoint", createdAt: new Date(), updatedAt: new Date() },
  { id: "poi-wts-2", name: "好汉坡", description: "梧桐山著名陡坡，考验体力的关键路段", coordinates: JSON.stringify({ lat: 22.5856, lng: 114.2178 }), category: "trail_marker", createdAt: new Date(), updatedAt: new Date() },
  { id: "poi-wts-3", name: "小梧桐", description: "梧桐山小梧桐峰，登顶前的中间站", coordinates: JSON.stringify({ lat: 22.5878, lng: 114.2189 }), category: "mountain_peak", createdAt: new Date(), updatedAt: new Date() },
  { id: "poi-wts-4", name: "大梧桐顶", description: "梧桐山主峰，深圳最高峰，海拔943.7米", coordinates: JSON.stringify({ lat: 22.5912, lng: 114.2198 }), category: "mountain_peak", createdAt: new Date(), updatedAt: new Date() },
  { id: "poi-wts-5", name: "泰山涧", description: "梧桐山泰山涧，溪流景观优美", coordinates: JSON.stringify({ lat: 22.5889, lng: 114.2212 }), category: "viewpoint", createdAt: new Date(), updatedAt: new Date() },
  // 东西冲
  { id: "poi-dxc-1", name: "东冲沙滩", description: "东西冲穿越起点，大鹏半岛知名沙滩", coordinates: JSON.stringify({ lat: 22.4567, lng: 114.5234 }), category: "checkpoint", createdAt: new Date(), updatedAt: new Date() },
  { id: "poi-dxc-2", name: "礁石区", description: "海岸礁石群，海蚀地貌奇观", coordinates: JSON.stringify({ lat: 22.4556, lng: 114.5198 }), category: "viewpoint", createdAt: new Date(), updatedAt: new Date() },
  { id: "poi-dxc-3", name: "穿鼻岩", description: "天然穿孔岩石，东西冲标志性景观", coordinates: JSON.stringify({ lat: 22.4534, lng: 114.5178 }), category: "viewpoint", createdAt: new Date(), updatedAt: new Date() },
  { id: "poi-dxc-4", name: "海蚀洞", description: "海浪侵蚀形成的天然洞穴", coordinates: JSON.stringify({ lat: 22.4512, lng: 114.5156 }), category: "viewpoint", createdAt: new Date(), updatedAt: new Date() },
  { id: "poi-dxc-5", name: "西冲沙滩", description: "东西冲穿越终点，宁静优美的沙滩", coordinates: JSON.stringify({ lat: 22.4489, lng: 114.5134 }), category: "checkpoint", createdAt: new Date(), updatedAt: new Date() },
  // 马峦山
  { id: "poi-mls-1", name: "马峦山北门", description: "马峦山郊野公园北门入口", coordinates: JSON.stringify({ lat: 22.6789, lng: 114.3456 }), category: "checkpoint", createdAt: new Date(), updatedAt: new Date() },
  { id: "poi-mls-2", name: "龙潭瀑布", description: "马峦山龙潭瀑布，水势磅礴", coordinates: JSON.stringify({ lat: 22.6812, lng: 114.3478 }), category: "waterfall", createdAt: new Date(), updatedAt: new Date() },
  { id: "poi-mls-3", name: "马峦山瀑布", description: "马峦山主瀑布，落差约30米", coordinates: JSON.stringify({ lat: 22.6834, lng: 114.3489 }), category: "waterfall", createdAt: new Date(), updatedAt: new Date() },
  { id: "poi-mls-4", name: "马峦山顶", description: "马峦山主峰，海拔590米", coordinates: JSON.stringify({ lat: 22.6856, lng: 114.3501 }), category: "mountain_peak", createdAt: new Date(), updatedAt: new Date() },
  { id: "poi-mls-5", name: "西北门观景台", description: "马峦山西北门观景台，俯瞰坪山全景", coordinates: JSON.stringify({ lat: 22.6823, lng: 114.3523 }), category: "viewpoint", createdAt: new Date(), updatedAt: new Date() },
  // 塘朗山
  { id: "poi-tls-1", name: "龙珠门", description: "塘朗山郊野公园龙珠门入口", coordinates: JSON.stringify({ lat: 22.5567, lng: 113.9789 }), category: "checkpoint", createdAt: new Date(), updatedAt: new Date() },
  { id: "poi-tls-2", name: "石阶古道", description: "塘朗山传统石阶登山道", coordinates: JSON.stringify({ lat: 22.5578, lng: 113.9801 }), category: "trail_marker", createdAt: new Date(), updatedAt: new Date() },
  { id: "poi-tls-3", name: "塘朗山顶", description: "塘朗山主峰，海拔430米", coordinates: JSON.stringify({ lat: 22.5601, lng: 113.9823 }), category: "mountain_peak", createdAt: new Date(), updatedAt: new Date() },
  { id: "poi-tls-4", name: "山顶观景台", description: "塘朗山顶观景台，可俯瞰深圳湾", coordinates: JSON.stringify({ lat: 22.5601, lng: 113.9823 }), category: "viewpoint", createdAt: new Date(), updatedAt: new Date() },
  { id: "poi-tls-5", name: "深圳湾观景点", description: "远眺深圳湾和香港的最佳观景点", coordinates: JSON.stringify({ lat: 22.5589, lng: 113.9845 }), category: "viewpoint", createdAt: new Date(), updatedAt: new Date() },
  // 大雁顶
  { id: "poi-dyd-1", name: "鹿嘴山庄", description: "大雁顶徒步起点，杨梅坑知名景点", coordinates: JSON.stringify({ lat: 22.4789, lng: 114.5678 }), category: "checkpoint", createdAt: new Date(), updatedAt: new Date() },
  { id: "poi-dyd-2", name: "杨梅坑绿道", description: "沿海绿道，风景优美", coordinates: JSON.stringify({ lat: 22.4801, lng: 114.5689 }), category: "viewpoint", createdAt: new Date(), updatedAt: new Date() },
  { id: "poi-dyd-3", name: "大雁顶登山口", description: "正式进入大雁山登山步道", coordinates: JSON.stringify({ lat: 22.4823, lng: 114.5701 }), category: "checkpoint", createdAt: new Date(), updatedAt: new Date() },
  { id: "poi-dyd-4", name: "大雁山顶", description: "大雁顶主峰，海拔801米，深圳第三高峰", coordinates: JSON.stringify({ lat: 22.4856, lng: 114.5723 }), category: "mountain_peak", createdAt: new Date(), updatedAt: new Date() },
  { id: "poi-dyd-5", name: "七娘山观景平台", description: "可远眺七娘山和大鹏湾的观景台", coordinates: JSON.stringify({ lat: 22.4845, lng: 114.5734 }), category: "viewpoint", createdAt: new Date(), updatedAt: new Date() },
  // 梅沙尖
  { id: "poi-msj-1", name: "山海大观", description: "梅沙尖登山入口，可停车", coordinates: JSON.stringify({ lat: 22.6012, lng: 114.2890 }), category: "checkpoint", createdAt: new Date(), updatedAt: new Date() },
  { id: "poi-msj-2", name: "茶园", description: "梅沙尖山腰茶园，可休息", coordinates: JSON.stringify({ lat: 22.6034, lng: 114.2912 }), category: "rest_area", createdAt: new Date(), updatedAt: new Date() },
  { id: "poi-msj-3", name: "梅沙尖顶", description: "梅沙尖主峰，海拔753米，360度观景", coordinates: JSON.stringify({ lat: 22.6067, lng: 114.2945 }), category: "mountain_peak", createdAt: new Date(), updatedAt: new Date() },
  { id: "poi-msj-4", name: "盐田港观景台", description: "俯瞰盐田港的绝佳位置", coordinates: JSON.stringify({ lat: 22.6056, lng: 114.2956 }), category: "viewpoint", createdAt: new Date(), updatedAt: new Date() },
  { id: "poi-msj-5", name: "大梅沙观景点", description: "远眺大梅沙海滨公园", coordinates: JSON.stringify({ lat: 22.6078, lng: 114.2923 }), category: "viewpoint", createdAt: new Date(), updatedAt: new Date() },
  // 大笔架山
  { id: "poi-dbj-1", name: "白沙湾入口", description: "大笔架山穿越起点", coordinates: JSON.stringify({ lat: 22.6456, lng: 114.4123 }), category: "checkpoint", createdAt: new Date(), updatedAt: new Date() },
  { id: "poi-dbj-2", name: "大笔架山顶", description: "大笔架山主峰，海拔717米", coordinates: JSON.stringify({ lat: 22.6501, lng: 114.4156 }), category: "mountain_peak", createdAt: new Date(), updatedAt: new Date() },
  { id: "poi-dbj-3", name: "土地庙", description: "三水线重要补给点和撤退点", coordinates: JSON.stringify({ lat: 22.6556, lng: 114.4201 }), category: "rest_area", createdAt: new Date(), updatedAt: new Date() },
  { id: "poi-dbj-4", name: "金龟村出口", description: "大笔架山穿越终点", coordinates: JSON.stringify({ lat: 22.6601, lng: 114.4234 }), category: "checkpoint", createdAt: new Date(), updatedAt: new Date() },
  { id: "poi-dbj-5", name: "惠州界碑", description: "深圳与惠州交界处", coordinates: JSON.stringify({ lat: 22.6523, lng: 114.4189 }), category: "viewpoint", createdAt: new Date(), updatedAt: new Date() },
  // 阳台山
  { id: "poi-yts-1", name: "石岩入口", description: "阳台山石岩侧登山入口", coordinates: JSON.stringify({ lat: 22.6789, lng: 113.9234 }), category: "checkpoint", createdAt: new Date(), updatedAt: new Date() },
  { id: "poi-yts-2", name: "大阳台山顶", description: "阳台山主峰，海拔587米", coordinates: JSON.stringify({ lat: 22.6823, lng: 113.9289 }), category: "mountain_peak", createdAt: new Date(), updatedAt: new Date() },
  { id: "poi-yts-3", name: "小阳台山顶", description: "阳台山次峰，风景优美", coordinates: JSON.stringify({ lat: 22.6801, lng: 113.9312 }), category: "mountain_peak", createdAt: new Date(), updatedAt: new Date() },
  { id: "poi-yts-4", name: "龙华观景台", description: "俯瞰龙华区的观景台", coordinates: JSON.stringify({ lat: 22.6845, lng: 113.9267 }), category: "viewpoint", createdAt: new Date(), updatedAt: new Date() },
  { id: "poi-yts-5", name: "南山观景台", description: "俯瞰南山区的观景台", coordinates: JSON.stringify({ lat: 22.6790, lng: 113.9201 }), category: "viewpoint", createdAt: new Date(), updatedAt: new Date() },
  // 凤凰山
  { id: "poi-fhs-1", name: "凤凰广场", description: "凤凰山登山起点", coordinates: JSON.stringify({ lat: 22.7123, lng: 113.8567 }), category: "checkpoint", createdAt: new Date(), updatedAt: new Date() },
  { id: "poi-fhs-2", name: "凤岩古庙", description: "凤凰山著名古庙，祈福圣地", coordinates: JSON.stringify({ lat: 22.7145, lng: 113.8589 }), category: "viewpoint", createdAt: new Date(), updatedAt: new Date() },
  { id: "poi-fhs-3", name: "望烟楼", description: "凤凰山山顶建筑，可远眺", coordinates: JSON.stringify({ lat: 22.7167, lng: 113.8601 }), category: "mountain_peak", createdAt: new Date(), updatedAt: new Date() },
  { id: "poi-fhs-4", name: "许愿廊", description: "凤岩古庙旁的许愿廊", coordinates: JSON.stringify({ lat: 22.7156, lng: 113.8590 }), category: "viewpoint", createdAt: new Date(), updatedAt: new Date() },
  { id: "poi-fhs-5", name: "凤凰山顶", description: "凤凰山主峰，海拔376米", coordinates: JSON.stringify({ lat: 22.7178, lng: 113.8612 }), category: "mountain_peak", createdAt: new Date(), updatedAt: new Date() },
  // 大南山
  { id: "poi-dns-1", name: "北登山口", description: "大南山北登山口，台阶路起点", coordinates: JSON.stringify({ lat: 22.5123, lng: 113.9234 }), category: "checkpoint", createdAt: new Date(), updatedAt: new Date() },
  { id: "poi-dns-2", name: "一号观景台", description: "半山腰观景台", coordinates: JSON.stringify({ lat: 22.5145, lng: 113.9256 }), category: "viewpoint", createdAt: new Date(), updatedAt: new Date() },
  { id: "poi-dns-3", name: "大南山顶", description: "大南山主峰，海拔336米", coordinates: JSON.stringify({ lat: 22.5167, lng: 113.9289 }), category: "mountain_peak", createdAt: new Date(), updatedAt: new Date() },
  { id: "poi-dns-4", name: "深圳湾观景亭", description: "俯瞰深圳湾的最佳位置", coordinates: JSON.stringify({ lat: 22.5178, lng: 113.9278 }), category: "viewpoint", createdAt: new Date(), updatedAt: new Date() },
  { id: "poi-dns-5", name: "蛇口观景平台", description: "俯瞰蛇口港和深圳湾大桥", coordinates: JSON.stringify({ lat: 22.5156, lng: 113.9301 }), category: "viewpoint", createdAt: new Date(), updatedAt: new Date() },
  // 莲花山
  { id: "poi-lhs-1", name: "南门入口", description: "莲花山公园南门", coordinates: JSON.stringify({ lat: 22.5534, lng: 114.0567 }), category: "checkpoint", createdAt: new Date(), updatedAt: new Date() },
  { id: "poi-lhs-2", name: "风筝广场", description: "莲花山著名风筝放飞地", coordinates: JSON.stringify({ lat: 22.5556, lng: 114.0589 }), category: "viewpoint", createdAt: new Date(), updatedAt: new Date() },
  { id: "poi-lhs-3", name: "山顶广场", description: "莲花山山顶广场", coordinates: JSON.stringify({ lat: 22.5578, lng: 114.0601 }), category: "mountain_peak", createdAt: new Date(), updatedAt: new Date() },
  { id: "poi-lhs-4", name: "邓小平铜像", description: "莲花山标志性景点，邓小平铜像", coordinates: JSON.stringify({ lat: 22.5580, lng: 114.0603 }), category: "viewpoint", createdAt: new Date(), updatedAt: new Date() },
  { id: "poi-lhs-5", name: "福田观景台", description: "俯瞰福田中心区全景", coordinates: JSON.stringify({ lat: 22.5585, lng: 114.0590 }), category: "viewpoint", createdAt: new Date(), updatedAt: new Date() },
  // 牛奶排
  { id: "poi-nnp-1", name: "西涌沙滩", description: "牛奶排穿越起点", coordinates: JSON.stringify({ lat: 22.4234, lng: 114.5012 }), category: "checkpoint", createdAt: new Date(), updatedAt: new Date() },
  { id: "poi-nnp-2", name: "牛奶排起点", description: "海岸线穿越正式起点", coordinates: JSON.stringify({ lat: 22.4212, lng: 114.5034 }), category: "checkpoint", createdAt: new Date(), updatedAt: new Date() },
  { id: "poi-nnp-3", name: "崖壁攀爬点", description: "需要绳索技术攀爬的崖壁", coordinates: JSON.stringify({ lat: 22.4190, lng: 114.5056 }), category: "trail_marker", createdAt: new Date(), updatedAt: new Date() },
  { id: "poi-nnp-4", name: "泅渡点", description: "涨潮时需要泅渡的路段", coordinates: JSON.stringify({ lat: 22.4167, lng: 114.5078 }), category: "trail_marker", createdAt: new Date(), updatedAt: new Date() },
  { id: "poi-nnp-5", name: "安全撤离点", description: "紧急情况下可撤离的位置", coordinates: JSON.stringify({ lat: 22.4145, lng: 114.5101 }), category: "checkpoint", createdAt: new Date(), updatedAt: new Date() },
];

// 测试数据 - 实体-POI 关联（将 POI 关联到对应 location，roleType: "checkpoint"）
const seedEntityToPois: schema.NewEntityToPoi[] = [
  // 七娘山
  { id: "etp-qnns-1", poiId: "poi-qnns-1", entityType: "location", entityId: "qiniangshan", roleType: "checkpoint", order: 1, createdAt: new Date() },
  { id: "etp-qnns-2", poiId: "poi-qnns-2", entityType: "location", entityId: "qiniangshan", roleType: "checkpoint", order: 2, createdAt: new Date() },
  { id: "etp-qnns-3", poiId: "poi-qnns-3", entityType: "location", entityId: "qiniangshan", roleType: "checkpoint", order: 3, createdAt: new Date() },
  { id: "etp-qnns-4", poiId: "poi-qnns-4", entityType: "location", entityId: "qiniangshan", roleType: "checkpoint", order: 4, createdAt: new Date() },
  { id: "etp-qnns-5", poiId: "poi-qnns-5", entityType: "location", entityId: "qiniangshan", roleType: "checkpoint", order: 5, createdAt: new Date() },
  // 梧桐山
  { id: "etp-wts-1", poiId: "poi-wts-1", entityType: "location", entityId: "wutongshan", roleType: "checkpoint", order: 1, createdAt: new Date() },
  { id: "etp-wts-2", poiId: "poi-wts-2", entityType: "location", entityId: "wutongshan", roleType: "checkpoint", order: 2, createdAt: new Date() },
  { id: "etp-wts-3", poiId: "poi-wts-3", entityType: "location", entityId: "wutongshan", roleType: "checkpoint", order: 3, createdAt: new Date() },
  { id: "etp-wts-4", poiId: "poi-wts-4", entityType: "location", entityId: "wutongshan", roleType: "checkpoint", order: 4, createdAt: new Date() },
  { id: "etp-wts-5", poiId: "poi-wts-5", entityType: "location", entityId: "wutongshan", roleType: "checkpoint", order: 5, createdAt: new Date() },
  // 东西冲
  { id: "etp-dxc-1", poiId: "poi-dxc-1", entityType: "location", entityId: "dongxichong", roleType: "checkpoint", order: 1, createdAt: new Date() },
  { id: "etp-dxc-2", poiId: "poi-dxc-2", entityType: "location", entityId: "dongxichong", roleType: "checkpoint", order: 2, createdAt: new Date() },
  { id: "etp-dxc-3", poiId: "poi-dxc-3", entityType: "location", entityId: "dongxichong", roleType: "checkpoint", order: 3, createdAt: new Date() },
  { id: "etp-dxc-4", poiId: "poi-dxc-4", entityType: "location", entityId: "dongxichong", roleType: "checkpoint", order: 4, createdAt: new Date() },
  { id: "etp-dxc-5", poiId: "poi-dxc-5", entityType: "location", entityId: "dongxichong", roleType: "checkpoint", order: 5, createdAt: new Date() },
  // 马峦山
  { id: "etp-mls-1", poiId: "poi-mls-1", entityType: "location", entityId: "maluanshan", roleType: "checkpoint", order: 1, createdAt: new Date() },
  { id: "etp-mls-2", poiId: "poi-mls-2", entityType: "location", entityId: "maluanshan", roleType: "checkpoint", order: 2, createdAt: new Date() },
  { id: "etp-mls-3", poiId: "poi-mls-3", entityType: "location", entityId: "maluanshan", roleType: "checkpoint", order: 3, createdAt: new Date() },
  { id: "etp-mls-4", poiId: "poi-mls-4", entityType: "location", entityId: "maluanshan", roleType: "checkpoint", order: 4, createdAt: new Date() },
  { id: "etp-mls-5", poiId: "poi-mls-5", entityType: "location", entityId: "maluanshan", roleType: "checkpoint", order: 5, createdAt: new Date() },
  // 塘朗山
  { id: "etp-tls-1", poiId: "poi-tls-1", entityType: "location", entityId: "tanglangshan", roleType: "checkpoint", order: 1, createdAt: new Date() },
  { id: "etp-tls-2", poiId: "poi-tls-2", entityType: "location", entityId: "tanglangshan", roleType: "checkpoint", order: 2, createdAt: new Date() },
  { id: "etp-tls-3", poiId: "poi-tls-3", entityType: "location", entityId: "tanglangshan", roleType: "checkpoint", order: 3, createdAt: new Date() },
  { id: "etp-tls-4", poiId: "poi-tls-4", entityType: "location", entityId: "tanglangshan", roleType: "checkpoint", order: 4, createdAt: new Date() },
  { id: "etp-tls-5", poiId: "poi-tls-5", entityType: "location", entityId: "tanglangshan", roleType: "checkpoint", order: 5, createdAt: new Date() },
  // 大雁顶
  { id: "etp-dyd-1", poiId: "poi-dyd-1", entityType: "location", entityId: "dayanding", roleType: "checkpoint", order: 1, createdAt: new Date() },
  { id: "etp-dyd-2", poiId: "poi-dyd-2", entityType: "location", entityId: "dayanding", roleType: "checkpoint", order: 2, createdAt: new Date() },
  { id: "etp-dyd-3", poiId: "poi-dyd-3", entityType: "location", entityId: "dayanding", roleType: "checkpoint", order: 3, createdAt: new Date() },
  { id: "etp-dyd-4", poiId: "poi-dyd-4", entityType: "location", entityId: "dayanding", roleType: "checkpoint", order: 4, createdAt: new Date() },
  { id: "etp-dyd-5", poiId: "poi-dyd-5", entityType: "location", entityId: "dayanding", roleType: "checkpoint", order: 5, createdAt: new Date() },
  // 梅沙尖
  { id: "etp-msj-1", poiId: "poi-msj-1", entityType: "location", entityId: "meishajian", roleType: "checkpoint", order: 1, createdAt: new Date() },
  { id: "etp-msj-2", poiId: "poi-msj-2", entityType: "location", entityId: "meishajian", roleType: "checkpoint", order: 2, createdAt: new Date() },
  { id: "etp-msj-3", poiId: "poi-msj-3", entityType: "location", entityId: "meishajian", roleType: "checkpoint", order: 3, createdAt: new Date() },
  { id: "etp-msj-4", poiId: "poi-msj-4", entityType: "location", entityId: "meishajian", roleType: "checkpoint", order: 4, createdAt: new Date() },
  { id: "etp-msj-5", poiId: "poi-msj-5", entityType: "location", entityId: "meishajian", roleType: "checkpoint", order: 5, createdAt: new Date() },
  // 大笔架山
  { id: "etp-dbj-1", poiId: "poi-dbj-1", entityType: "location", entityId: "dabijiashan", roleType: "checkpoint", order: 1, createdAt: new Date() },
  { id: "etp-dbj-2", poiId: "poi-dbj-2", entityType: "location", entityId: "dabijiashan", roleType: "checkpoint", order: 2, createdAt: new Date() },
  { id: "etp-dbj-3", poiId: "poi-dbj-3", entityType: "location", entityId: "dabijiashan", roleType: "checkpoint", order: 3, createdAt: new Date() },
  { id: "etp-dbj-4", poiId: "poi-dbj-4", entityType: "location", entityId: "dabijiashan", roleType: "checkpoint", order: 4, createdAt: new Date() },
  { id: "etp-dbj-5", poiId: "poi-dbj-5", entityType: "location", entityId: "dabijiashan", roleType: "checkpoint", order: 5, createdAt: new Date() },
  // 阳台山
  { id: "etp-yts-1", poiId: "poi-yts-1", entityType: "location", entityId: "yangtaishan", roleType: "checkpoint", order: 1, createdAt: new Date() },
  { id: "etp-yts-2", poiId: "poi-yts-2", entityType: "location", entityId: "yangtaishan", roleType: "checkpoint", order: 2, createdAt: new Date() },
  { id: "etp-yts-3", poiId: "poi-yts-3", entityType: "location", entityId: "yangtaishan", roleType: "checkpoint", order: 3, createdAt: new Date() },
  { id: "etp-yts-4", poiId: "poi-yts-4", entityType: "location", entityId: "yangtaishan", roleType: "checkpoint", order: 4, createdAt: new Date() },
  { id: "etp-yts-5", poiId: "poi-yts-5", entityType: "location", entityId: "yangtaishan", roleType: "checkpoint", order: 5, createdAt: new Date() },
  // 凤凰山
  { id: "etp-fhs-1", poiId: "poi-fhs-1", entityType: "location", entityId: "fenghuangshan", roleType: "checkpoint", order: 1, createdAt: new Date() },
  { id: "etp-fhs-2", poiId: "poi-fhs-2", entityType: "location", entityId: "fenghuangshan", roleType: "checkpoint", order: 2, createdAt: new Date() },
  { id: "etp-fhs-3", poiId: "poi-fhs-3", entityType: "location", entityId: "fenghuangshan", roleType: "checkpoint", order: 3, createdAt: new Date() },
  { id: "etp-fhs-4", poiId: "poi-fhs-4", entityType: "location", entityId: "fenghuangshan", roleType: "checkpoint", order: 4, createdAt: new Date() },
  { id: "etp-fhs-5", poiId: "poi-fhs-5", entityType: "location", entityId: "fenghuangshan", roleType: "checkpoint", order: 5, createdAt: new Date() },
  // 大南山
  { id: "etp-dns-1", poiId: "poi-dns-1", entityType: "location", entityId: "dananshan", roleType: "checkpoint", order: 1, createdAt: new Date() },
  { id: "etp-dns-2", poiId: "poi-dns-2", entityType: "location", entityId: "dananshan", roleType: "checkpoint", order: 2, createdAt: new Date() },
  { id: "etp-dns-3", poiId: "poi-dns-3", entityType: "location", entityId: "dananshan", roleType: "checkpoint", order: 3, createdAt: new Date() },
  { id: "etp-dns-4", poiId: "poi-dns-4", entityType: "location", entityId: "dananshan", roleType: "checkpoint", order: 4, createdAt: new Date() },
  { id: "etp-dns-5", poiId: "poi-dns-5", entityType: "location", entityId: "dananshan", roleType: "checkpoint", order: 5, createdAt: new Date() },
  // 莲花山
  { id: "etp-lhs-1", poiId: "poi-lhs-1", entityType: "location", entityId: "lianhuashan", roleType: "checkpoint", order: 1, createdAt: new Date() },
  { id: "etp-lhs-2", poiId: "poi-lhs-2", entityType: "location", entityId: "lianhuashan", roleType: "checkpoint", order: 2, createdAt: new Date() },
  { id: "etp-lhs-3", poiId: "poi-lhs-3", entityType: "location", entityId: "lianhuashan", roleType: "checkpoint", order: 3, createdAt: new Date() },
  { id: "etp-lhs-4", poiId: "poi-lhs-4", entityType: "location", entityId: "lianhuashan", roleType: "checkpoint", order: 4, createdAt: new Date() },
  { id: "etp-lhs-5", poiId: "poi-lhs-5", entityType: "location", entityId: "lianhuashan", roleType: "checkpoint", order: 5, createdAt: new Date() },
  // 牛奶排
  { id: "etp-nnp-1", poiId: "poi-nnp-1", entityType: "location", entityId: "niunaipai", roleType: "checkpoint", order: 1, createdAt: new Date() },
  { id: "etp-nnp-2", poiId: "poi-nnp-2", entityType: "location", entityId: "niunaipai", roleType: "checkpoint", order: 2, createdAt: new Date() },
  { id: "etp-nnp-3", poiId: "poi-nnp-3", entityType: "location", entityId: "niunaipai", roleType: "checkpoint", order: 3, createdAt: new Date() },
  { id: "etp-nnp-4", poiId: "poi-nnp-4", entityType: "location", entityId: "niunaipai", roleType: "checkpoint", order: 4, createdAt: new Date() },
  { id: "etp-nnp-5", poiId: "poi-nnp-5", entityType: "location", entityId: "niunaipai", roleType: "checkpoint", order: 5, createdAt: new Date() },
];

// 测试数据 - 队伍（匹配当前 teams 表结构，加上 routeId）
const seedTeams: schema.NewTeam[] = [
  {
    id: "team-1",
    locationId: "qiniangshan",
    routeId: "route-qiniangshan",
    leaderId: "user-1",
    title: "七娘山挑战队 - 周六登顶看海",
    description: "本周六计划挑战七娘山，看绝美海景。目前已有3人，再找2-3位伙伴一起。",
    startTime: new Date("2026-03-07T07:00:00"),
    endTime: new Date("2026-03-07T14:00:00"),
    maxMembers: 6,
    requirements: JSON.stringify(["有徒步经验", "体能较好", "自备装备"]),
    status: "recruiting",
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: "team-2",
    locationId: "qiniangshan",
    routeId: "route-qiniangshan",
    leaderId: "user-2",
    title: "七娘山摄影小队 - 日出专线",
    description: "周日清晨出发，登顶拍摄七娘山日出和云海。",
    startTime: new Date("2026-03-08T05:30:00"),
    endTime: new Date("2026-03-08T13:30:00"),
    maxMembers: 4,
    requirements: JSON.stringify(["摄影爱好者", "能早起", "有头灯"]),
    status: "full",
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: "team-3",
    locationId: "wutongshan",
    routeId: "route-wutongshan",
    leaderId: "user-4",
    title: "梧桐山夜爬 - 看城市日出",
    description: "周六凌晨夜爬梧桐山，在山顶看深圳最美日出。",
    startTime: new Date("2026-03-07T04:00:00"),
    endTime: new Date("2026-03-07T09:00:00"),
    maxMembers: 10,
    requirements: JSON.stringify(["有夜爬经验", "带头灯", "保暖衣物"]),
    status: "recruiting",
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: "team-4",
    locationId: "wutongshan",
    routeId: "route-wutongshan",
    leaderId: "user-5",
    title: "梧桐山亲子徒步队",
    description: "周日带小朋友一起爬梧桐山，走较轻松的泰山涧路线。",
    startTime: new Date("2026-03-08T09:00:00"),
    endTime: new Date("2026-03-08T14:00:00"),
    maxMembers: 5,
    requirements: JSON.stringify(["带6岁以上儿童", "家长陪同", "准备零食"]),
    status: "recruiting",
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: "team-5",
    locationId: "dongxichong",
    routeId: "route-dongxichong",
    leaderId: "user-1",
    title: "东西冲穿越 - 海岸线探险",
    description: "周日东西冲穿越，体验深圳最美海岸线。",
    startTime: new Date("2026-03-08T08:30:00"),
    endTime: new Date("2026-03-08T14:30:00"),
    maxMembers: 8,
    requirements: JSON.stringify(["防滑鞋", "手套", "不怕晒"]),
    status: "recruiting",
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: "team-6",
    locationId: "maluanshan",
    routeId: "route-maluanshan",
    leaderId: "user-3",
    title: "马峦山瀑布探秘 - 休闲局",
    description: "周六马峦山看瀑布，路线轻松，适合新手和想放松的朋友。",
    startTime: new Date("2026-03-07T09:30:00"),
    endTime: new Date("2026-03-07T13:30:00"),
    maxMembers: 10,
    requirements: JSON.stringify(["休闲装备", "可带泳衣", "防蚊液"]),
    status: "recruiting",
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: "team-7",
    locationId: "tanglangshan",
    routeId: "route-tanglangshan",
    leaderId: "user-4",
    title: "塘朗山晨爬 - 开启活力一天",
    description: "周日早上塘朗山晨练，轻松登顶后下山吃早餐。",
    startTime: new Date("2026-03-08T06:30:00"),
    endTime: new Date("2026-03-08T09:00:00"),
    maxMembers: 6,
    requirements: JSON.stringify(["准时", "轻松装备"]),
    status: "recruiting",
    createdAt: new Date(),
    updatedAt: new Date(),
  },
];

// 队伍成员数据
const seedTeamMembers: schema.NewTeamMember[] = [
  { id: "tm-1", teamId: "team-1", userId: "user-1", status: "approved", joinedAt: new Date(), createdAt: new Date() },
  { id: "tm-2", teamId: "team-2", userId: "user-2", status: "approved", joinedAt: new Date(), createdAt: new Date() },
  { id: "tm-3", teamId: "team-3", userId: "user-4", status: "approved", joinedAt: new Date(), createdAt: new Date() },
  { id: "tm-4", teamId: "team-4", userId: "user-5", status: "approved", joinedAt: new Date(), createdAt: new Date() },
  { id: "tm-5", teamId: "team-5", userId: "user-1", status: "approved", joinedAt: new Date(), createdAt: new Date() },
  { id: "tm-6", teamId: "team-6", userId: "user-3", status: "approved", joinedAt: new Date(), createdAt: new Date() },
  { id: "tm-7", teamId: "team-7", userId: "user-4", status: "approved", joinedAt: new Date(), createdAt: new Date() },
];

async function seed() {
  console.log("🌱 开始填充测试数据...\n");

  try {
    // 清空现有数据（按外键依赖顺序）
    console.log("🗑️  清空现有数据...");
    db.delete(schema.teamMembers).run();
    db.delete(schema.teams).run();
    db.delete(schema.entityToPois).run();
    db.delete(schema.pois).run();
    db.delete(schema.routes).run();
    db.delete(schema.locations).run();
    db.delete(schema.cities).run();
    db.delete(schema.sessions).run();
    db.delete(schema.accounts).run();
    db.delete(schema.users).run();
    clearLocalKV(); // 同步清空 KV session 缓存，防止旧 session 指向已删除用户

    // 插入用户
    console.log("👤 插入用户数据...");
    for (const user of seedUsers) {
      db.insert(schema.users).values(user).run();
    }
    console.log(`   ✓ 插入 ${seedUsers.length} 个用户`);

    // 插入城市数据（locations 和 routes 依赖）
    console.log("🏙️  插入城市数据...");
    const seedCities = [
      { id: "city_shenzhen", adcode: "440300", name: "深圳", province: "广东省", createdAt: new Date(), updatedAt: new Date() },
    ];
    for (const city of seedCities) {
      db.insert(schema.cities).values(city).run();
    }
    console.log(`   ✓ 插入 ${seedCities.length} 个城市`);

    // 插入地点
    console.log("🏔️  插入地点数据...");
    for (const loc of seedLocations) {
      db.insert(schema.locations).values(loc).run();
    }
    console.log(`   ✓ 插入 ${seedLocations.length} 个地点`);

    // 插入路线
    console.log("🗺️  插入路线数据...");
    for (const route of seedRoutes) {
      db.insert(schema.routes).values(route).run();
    }
    console.log(`   ✓ 插入 ${seedRoutes.length} 条路线`);

    // 插入 POI 数据
    console.log("📍 插入 POI 数据...");
    for (const poi of seedPois) {
      db.insert(schema.pois).values(poi).onConflictDoNothing().run();
    }
    console.log(`   ✓ 插入 ${seedPois.length} 个 POI`);

    // 插入实体-POI 关联数据
    console.log("🔗 插入实体-POI 关联数据...");
    for (const etp of seedEntityToPois) {
      db.insert(schema.entityToPois).values(etp).onConflictDoNothing().run();
    }
    console.log(`   ✓ 插入 ${seedEntityToPois.length} 条关联记录`);

    // 插入队伍
    console.log("👥 插入队伍数据...");
    for (const team of seedTeams) {
      db.insert(schema.teams).values(team).run();
    }
    console.log(`   ✓ 插入 ${seedTeams.length} 个队伍`);

    // 插入队伍成员
    console.log("📝 插入队伍成员数据...");
    for (const member of seedTeamMembers) {
      db.insert(schema.teamMembers).values(member).run();
    }
    console.log(`   ✓ 插入 ${seedTeamMembers.length} 个队伍成员`);

    // 插入测试账号密码（Better Auth credential 账号）
    console.log("🔑 插入测试账号凭据...");
    const testPassword = await hashPassword("11111111");
    const testAccounts: schema.NewAccount[] = [
      {
        id: "acc-test-1",
        userId: "test-user-1",
        accountId: "wujiahong2013@gmail.com",
        providerId: "credential",
        password: testPassword,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: "acc-test-2",
        userId: "test-user-2",
        accountId: "1427298682@qq.com",
        providerId: "credential",
        password: testPassword,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: "acc-test-3",
        userId: "test-user-3",
        accountId: "1427298683@qq.com",
        providerId: "credential",
        password: testPassword,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];
    for (const acc of testAccounts) {
      db.insert(schema.accounts).values(acc).run();
    }
    console.log(`   ✓ 插入 ${testAccounts.length} 个测试账号凭据\n`);

    console.log("✅ 数据填充完成！");
    console.log("\n📊 数据概览:");
    console.log(`   • 用户: ${seedUsers.length}`);
    console.log(`   • 地点: ${seedLocations.length}`);
    console.log(`   • 路线: ${seedRoutes.length}`);
    console.log(`   • POI: ${seedPois.length}`);
    console.log(`   • 实体-POI 关联: ${seedEntityToPois.length}`);
    console.log(`   • 队伍: ${seedTeams.length}`);
    console.log(`   • 队伍成员: ${seedTeamMembers.length}`);
    console.log(`   • 测试账号凭据: ${testAccounts.length}`);
  } catch (error) {
    console.error("❌ 数据填充失败:", error);
    process.exit(1);
  }

  sqlite.close();
}

seed();
