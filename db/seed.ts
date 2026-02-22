import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import * as schema from "./schema";

const localDbPath = process.env.LOCAL_DB_PATH || "./local.db";

const sqlite = new Database(localDbPath);
const db = drizzle(sqlite, { schema });

// 测试数据 - 用户
const seedUsers = [
  {
    id: "user-1",
    name: "山野行者",
    email: "hiker1@example.com",
    emailVerified: 1,
    image: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop&crop=face",
    bio: "资深户外爱好者，深圳百山打卡进行中",
    level: "advanced",
    createdAt: Date.now(),
    updatedAt: Date.now(),
  },
  {
    id: "user-2",
    name: "光影猎人",
    email: "photo@example.com",
    emailVerified: 1,
    image: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&h=100&fit=crop&crop=face",
    bio: "风光摄影师，专注山海摄影",
    level: "expert",
    createdAt: Date.now(),
    updatedAt: Date.now(),
  },
  {
    id: "user-3",
    name: "暖心领队",
    email: "leader@example.com",
    emailVerified: 1,
    image: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&h=100&fit=crop&crop=face",
    bio: "热爱分享，擅长带领新手入门",
    level: "intermediate",
    createdAt: Date.now(),
    updatedAt: Date.now(),
  },
  {
    id: "user-4",
    name: "夜行侠",
    email: "night@example.com",
    emailVerified: 1,
    image: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop&crop=face",
    bio: "夜爬达人，熟悉梧桐山每一条夜路",
    level: "advanced",
    createdAt: Date.now(),
    updatedAt: Date.now(),
  },
  {
    id: "user-5",
    name: "超级奶爸",
    email: "dad@example.com",
    emailVerified: 1,
    image: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=100&h=100&fit=crop&crop=face",
    bio: "两个孩子的爸爸，经常带孩子户外活动",
    level: "intermediate",
    createdAt: Date.now(),
    updatedAt: Date.now(),
  },
];

// 测试数据 - 地点
const seedLocations = [
  {
    id: "qiniangshan",
    name: "七娘山",
    slug: "qiniangshan",
    description: "七娘山位于大鹏半岛南端，是深圳第二高峰，主峰海拔869米。山势险峻、雄伟，山中奇峰异石、岩洞、山泉、密林交相辉映。",
    difficulty: "hard",
    duration: "6-8小时",
    distance: "12公里",
    bestSeason: JSON.stringify(["春季", "秋季", "冬季"]),
    coverImage: "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=1200&h=600&fit=crop",
    images: JSON.stringify([
      "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=800&h=600&fit=crop",
      "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&h=600&fit=crop",
    ]),
    routeDescription: "七娘山环线是经典徒步路线，从地质公园出发，经主峰后从另一侧下山，全程约12公里。",
    tips: "建议携带登山杖\n山顶风大记得带外套\n全程无补给",
    equipmentNeeded: JSON.stringify(["登山杖", "防风外套", "充足的水"]),
    coordinates: JSON.stringify({ lat: 22.4523, lng: 114.5321 }),
    createdAt: Date.now(),
    updatedAt: Date.now(),
  },
  {
    id: "wutongshan",
    name: "梧桐山",
    slug: "wutongshan",
    description: "梧桐山位于深圳东部，主峰大梧桐海拔943.7米，是深圳最高峰。这里山势巍峨，森林茂密，是深圳市民最喜爱的登山目的地之一。",
    difficulty: "moderate",
    duration: "4-6小时",
    distance: "10公里",
    bestSeason: JSON.stringify(["全年"]),
    coverImage: "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?w=1200&h=600&fit=crop",
    images: JSON.stringify([
      "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?w=800&h=600&fit=crop",
      "https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=800&h=600&fit=crop",
    ]),
    routeDescription: "梧桐山有多条登山路线，最经典的是从梧桐山村出发，经好汉坡登顶，全程约10公里。",
    tips: "周末人多建议早出发\n好汉坡较陡量力而行\n山顶有补给但价格较高",
    equipmentNeeded: JSON.stringify(["登山鞋", "足够的水", "防晒用品"]),
    coordinates: JSON.stringify({ lat: 22.5836, lng: 114.2165 }),
    createdAt: Date.now(),
    updatedAt: Date.now(),
  },
  {
    id: "dongxichong",
    name: "东西冲",
    slug: "dongxichong",
    description: "东西冲穿越是深圳最经典的海岸线徒步路线，从东冲沙滩到西冲沙滩，全长约8公里。沿途可欣赏深圳最美的海岸风光。",
    difficulty: "moderate",
    duration: "5-7小时",
    distance: "8公里",
    bestSeason: JSON.stringify(["秋季", "冬季", "春季"]),
    coverImage: "https://images.unsplash.com/photo-1505142468610-359e7d316be0?w=1200&h=600&fit=crop",
    images: JSON.stringify([
      "https://images.unsplash.com/photo-1505142468610-359e7d316be0?w=800&h=600&fit=crop",
      "https://images.unsplash.com/photo-1437719417032-8595fd9e9dc6?w=800&h=600&fit=crop",
    ]),
    routeDescription: "东西冲穿越是深圳最受欢迎的海岸线路线，沿途需要攀爬礁石、穿越沙滩，风景绝美。",
    tips: "穿防滑鞋\n带手套\n注意潮汐时间",
    equipmentNeeded: JSON.stringify(["防滑鞋", "手套", "防晒用品"]),
    coordinates: JSON.stringify({ lat: 22.4567, lng: 114.5234 }),
    createdAt: Date.now(),
    updatedAt: Date.now(),
  },
  {
    id: "maluanshan",
    name: "马峦山",
    slug: "maluanshan",
    description: "马峦山位于深圳坪山区，以瀑布群闻名。这里有深圳最大的瀑布群，最大的瀑布落差达30米。",
    difficulty: "easy",
    duration: "3-4小时",
    distance: "6公里",
    bestSeason: JSON.stringify(["夏季", "秋季"]),
    coverImage: "https://images.unsplash.com/photo-1432405972618-c60b0225b8f9?w=1200&h=600&fit=crop",
    images: JSON.stringify([
      "https://images.unsplash.com/photo-1432405972618-c60b0225b8f9?w=800&h=600&fit=crop",
      "https://images.unsplash.com/photo-1465146344425-f00d5f5c8f07?w=800&h=600&fit=crop",
    ]),
    routeDescription: "马峦山有多条路线，最经典的是从北门进入，经瀑布群后从西北门出，全程约6公里。",
    tips: "雨后瀑布水量更大\n可带泳衣\n夏季蚊虫多",
    equipmentNeeded: JSON.stringify(["泳衣", "驱蚊水", "防滑鞋"]),
    coordinates: JSON.stringify({ lat: 22.6789, lng: 114.3456 }),
    createdAt: Date.now(),
    updatedAt: Date.now(),
  },
  {
    id: "tanglangshan",
    name: "塘朗山",
    slug: "tanglangshan",
    description: "塘朗山位于深圳南山区，是市中心的一片绿洲。主峰海拔430米，可俯瞰深圳湾和香港。",
    difficulty: "easy",
    duration: "2-3小时",
    distance: "5公里",
    bestSeason: JSON.stringify(["全年"]),
    coverImage: "https://images.unsplash.com/photo-1447752875215-b2761acb3c5d?w=1200&h=600&fit=crop",
    images: JSON.stringify([
      "https://images.unsplash.com/photo-1447752875215-b2761acb3c5d?w=800&h=600&fit=crop",
      "https://images.unsplash.com/photo-1511497584788-876760111969?w=800&h=600&fit=crop",
    ]),
    routeDescription: "塘朗山路线简单明了，从龙珠门进入，沿盘山公路或石阶路登顶，适合各年龄段。",
    tips: "地铁直达\n可带宠物\n傍晚可看日落",
    equipmentNeeded: JSON.stringify(["运动鞋", "水", "小零食"]),
    coordinates: JSON.stringify({ lat: 22.5567, lng: 113.9789 }),
    createdAt: Date.now(),
    updatedAt: Date.now(),
  },
];

// 测试数据 - 队伍
const seedTeams = [
  {
    id: "team-1",
    locationId: "qiniangshan",
    leaderId: "user-1",
    title: "七娘山挑战队 - 周六登顶看海",
    description: "本周六计划挑战七娘山，看绝美海景。目前已有3人，再找2-3位伙伴一起。",
    startTime: new Date("2026-02-22T07:00:00").getTime(),
    endTime: new Date("2026-02-22T14:00:00").getTime(),
    maxMembers: 6,
    currentMembers: 3,
    requirements: JSON.stringify(["有徒步经验", "体能较好", "自备装备"]),
    status: "recruiting",
    createdAt: Date.now(),
    updatedAt: Date.now(),
  },
  {
    id: "team-2",
    locationId: "qiniangshan",
    leaderId: "user-2",
    title: "七娘山摄影小队 - 日出专线",
    description: "周日清晨出发，登顶拍摄七娘山日出和云海。",
    startTime: new Date("2026-02-23T05:30:00").getTime(),
    endTime: new Date("2026-02-23T13:30:00").getTime(),
    maxMembers: 4,
    currentMembers: 4,
    requirements: JSON.stringify(["摄影爱好者", "能早起", "有头灯"]),
    status: "full",
    createdAt: Date.now(),
    updatedAt: Date.now(),
  },
  {
    id: "team-3",
    locationId: "wutongshan",
    leaderId: "user-4",
    title: "梧桐山夜爬 - 看城市日出",
    description: "周六凌晨夜爬梧桐山，在山顶看深圳最美日出。",
    startTime: new Date("2026-02-22T04:00:00").getTime(),
    endTime: new Date("2026-02-22T09:00:00").getTime(),
    maxMembers: 10,
    currentMembers: 6,
    requirements: JSON.stringify(["有夜爬经验", "带头灯", "保暖衣物"]),
    status: "recruiting",
    createdAt: Date.now(),
    updatedAt: Date.now(),
  },
  {
    id: "team-4",
    locationId: "wutongshan",
    leaderId: "user-5",
    title: "梧桐山亲子徒步队",
    description: "周日带小朋友一起爬梧桐山，走较轻松的泰山涧路线。",
    startTime: new Date("2026-02-23T09:00:00").getTime(),
    endTime: new Date("2026-02-23T14:00:00").getTime(),
    maxMembers: 5,
    currentMembers: 3,
    requirements: JSON.stringify(["带6岁以上儿童", "家长陪同", "准备零食"]),
    status: "recruiting",
    createdAt: Date.now(),
    updatedAt: Date.now(),
  },
  {
    id: "team-5",
    locationId: "dongxichong",
    leaderId: "user-1",
    title: "东西冲穿越 - 海岸线探险",
    description: "周日东西冲穿越，体验深圳最美海岸线。",
    startTime: new Date("2026-02-23T08:30:00").getTime(),
    endTime: new Date("2026-02-23T14:30:00").getTime(),
    maxMembers: 8,
    currentMembers: 5,
    requirements: JSON.stringify(["防滑鞋", "手套", "不怕晒"]),
    status: "recruiting",
    createdAt: Date.now(),
    updatedAt: Date.now(),
  },
  {
    id: "team-6",
    locationId: "maluanshan",
    leaderId: "user-3",
    title: "马峦山瀑布探秘 - 休闲局",
    description: "周六马峦山看瀑布，路线轻松，适合新手和想放松的朋友。",
    startTime: new Date("2026-02-22T09:30:00").getTime(),
    endTime: new Date("2026-02-22T13:30:00").getTime(),
    maxMembers: 10,
    currentMembers: 4,
    requirements: JSON.stringify(["休闲装备", "可带泳衣", "防蚊液"]),
    status: "recruiting",
    createdAt: Date.now(),
    updatedAt: Date.now(),
  },
  {
    id: "team-7",
    locationId: "tanglangshan",
    leaderId: "user-4",
    title: "塘朗山晨爬 - 开启活力一天",
    description: "周日早上塘朗山晨练，轻松登顶后下山吃早餐。",
    startTime: new Date("2026-02-23T06:30:00").getTime(),
    endTime: new Date("2026-02-23T09:00:00").getTime(),
    maxMembers: 6,
    currentMembers: 2,
    requirements: JSON.stringify(["准时", "轻松装备"]),
    status: "recruiting",
    createdAt: Date.now(),
    updatedAt: Date.now(),
  },
];

// 队伍成员数据
const seedTeamMembers = [
  { id: "tm-1", teamId: "team-1", userId: "user-1", role: "leader", status: "approved", joinedAt: Date.now(), createdAt: Date.now() },
  { id: "tm-2", teamId: "team-2", userId: "user-2", role: "leader", status: "approved", joinedAt: Date.now(), createdAt: Date.now() },
  { id: "tm-3", teamId: "team-3", userId: "user-4", role: "leader", status: "approved", joinedAt: Date.now(), createdAt: Date.now() },
  { id: "tm-4", teamId: "team-4", userId: "user-5", role: "leader", status: "approved", joinedAt: Date.now(), createdAt: Date.now() },
  { id: "tm-5", teamId: "team-5", userId: "user-1", role: "leader", status: "approved", joinedAt: Date.now(), createdAt: Date.now() },
  { id: "tm-6", teamId: "team-6", userId: "user-3", role: "leader", status: "approved", joinedAt: Date.now(), createdAt: Date.now() },
  { id: "tm-7", teamId: "team-7", userId: "user-4", role: "leader", status: "approved", joinedAt: Date.now(), createdAt: Date.now() },
];

async function seed() {
  console.log("🌱 开始填充测试数据...\n");

  try {
    // 清空现有数据（按外键依赖顺序）
    console.log("🗑️  清空现有数据...");
    sqlite.exec("DELETE FROM team_members");
    sqlite.exec("DELETE FROM teams");
    sqlite.exec("DELETE FROM locations");
    sqlite.exec("DELETE FROM users");

    // 插入用户
    console.log("👤 插入用户数据...");
    const userStmt = sqlite.prepare(`
      INSERT INTO users (id, name, email, email_verified, image, bio, level, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    for (const user of seedUsers) {
      userStmt.run(
        user.id,
        user.name,
        user.email,
        user.emailVerified,
        user.image,
        user.bio,
        user.level,
        user.createdAt,
        user.updatedAt
      );
    }
    console.log(`   ✓ 插入 ${seedUsers.length} 个用户`);

    // 插入地点
    console.log("🏔️  插入地点数据...");
    const locationStmt = sqlite.prepare(`
      INSERT INTO locations (id, name, slug, description, difficulty, duration, distance, best_season, cover_image, images, route_description, tips, equipment_needed, coordinates, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    for (const loc of seedLocations) {
      locationStmt.run(
        loc.id,
        loc.name,
        loc.slug,
        loc.description,
        loc.difficulty,
        loc.duration,
        loc.distance,
        loc.bestSeason,
        loc.coverImage,
        loc.images,
        loc.routeDescription,
        loc.tips,
        loc.equipmentNeeded,
        loc.coordinates,
        loc.createdAt,
        loc.updatedAt
      );
    }
    console.log(`   ✓ 插入 ${seedLocations.length} 个地点`);

    // 插入队伍
    console.log("👥 插入队伍数据...");
    const teamStmt = sqlite.prepare(`
      INSERT INTO teams (id, location_id, leader_id, title, description, start_time, end_time, max_members, current_members, requirements, status, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    for (const team of seedTeams) {
      teamStmt.run(
        team.id,
        team.locationId,
        team.leaderId,
        team.title,
        team.description,
        team.startTime,
        team.endTime,
        team.maxMembers,
        team.currentMembers,
        team.requirements,
        team.status,
        team.createdAt,
        team.updatedAt
      );
    }
    console.log(`   ✓ 插入 ${seedTeams.length} 个队伍`);

    // 插入队伍成员
    console.log("📝 插入队伍成员数据...");
    const memberStmt = sqlite.prepare(`
      INSERT INTO team_members (id, team_id, user_id, role, status, joined_at, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    for (const member of seedTeamMembers) {
      memberStmt.run(
        member.id,
        member.teamId,
        member.userId,
        member.role,
        member.status,
        member.joinedAt,
        member.createdAt
      );
    }
    console.log(`   ✓ 插入 ${seedTeamMembers.length} 个队伍成员\n`);

    console.log("✅ 数据填充完成！");
    console.log("\n📊 数据概览:");
    console.log(`   • 用户: ${seedUsers.length}`);
    console.log(`   • 地点: ${seedLocations.length}`);
    console.log(`   • 队伍: ${seedTeams.length}`);
    console.log(`   • 队伍成员: ${seedTeamMembers.length}`);

  } catch (error) {
    console.error("❌ 数据填充失败:", error);
    process.exit(1);
  }

  sqlite.close();
}

seed();
