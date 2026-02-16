import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { v4 as uuidv4 } from "uuid";
import {
  users,
  locations,
  teams,
  teamMembers,
  Difficulty,
  TeamStatus,
  TeamMemberRole,
  TeamMemberStatus,
} from "./schema";

// 数据库连接
const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.error("请设置 DATABASE_URL 环境变量");
  process.exit(1);
}

const client = postgres(connectionString, { prepare: false });
const db = drizzle(client);

// ==================== 种子数据 ====================

// 示例用户
const seedUsers = [
  {
    id: uuidv4(),
    name: "山野行者",
    email: "hiker1@example.com",
    emailVerified: true,
    image: "https://api.dicebear.com/7.x/avataaars/svg?seed=hiker1",
    bio: "热爱户外徒步，喜欢探索深圳周边的山野小径。每周都会组织或参加徒步活动，欢迎志同道合的朋友加入！",
    experience: "advanced",
  },
  {
    id: uuidv4(),
    name: "城市探险家",
    email: "explorer@example.com",
    emailVerified: true,
    image: "https://api.dicebear.com/7.x/avataaars/svg?seed=explorer",
    bio: "周末徒步爱好者，喜欢挑战有难度的路线。有5年户外经验，熟悉深圳各大徒步路线。",
    experience: "expert",
  },
  {
    id: uuidv4(),
    name: "新手小白",
    email: "newbie@example.com",
    emailVerified: true,
    image: "https://api.dicebear.com/7.x/avataaars/svg?seed=newbie",
    bio: "刚开始接触徒步运动，希望能找到组织一起学习进步！",
    experience: "beginner",
  },
  {
    id: uuidv4(),
    name: "山野清风",
    email: "breeze@example.com",
    emailVerified: true,
    image: "https://api.dicebear.com/7.x/avataaars/svg?seed=breeze",
    bio: "摄影爱好者，徒步时喜欢记录沿途风景。寻找一起拍照徒步的伙伴。",
    experience: "intermediate",
  },
  {
    id: uuidv4(),
    name: "深圳通",
    email: "szlocal@example.com",
    emailVerified: true,
    image: "https://api.dicebear.com/7.x/avataaars/svg?seed=szlocal",
    bio: "土生土长的深圳人，对本地徒步路线了如指掌。欢迎外地朋友来深圳徒步！",
    experience: "expert",
  },
];

// 深圳徒步地点
const seedLocations = [
  {
    id: uuidv4(),
    name: "梧桐山",
    slug: "wutong-mountain",
    description:
      "梧桐山是深圳第一高峰，海拔943.7米，位于深圳东部，是深圳著名的风景名胜区。山上有丰富的植被，四季景色各异，是深圳市民最喜爱的登山目的地之一。",
    difficulty: "moderate" as Difficulty,
    duration: "4-6小时",
    distance: "12公里",
    bestSeason: ["春季", "秋季", "冬季"],
    coverImage:
      "https://images.unsplash.com/photo-1551632811-561732d1e306?w=800&auto=format&fit=crop",
    images: [
      "https://images.unsplash.com/photo-1551632811-561732d1e306?w=800&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=800&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=800&auto=format&fit=crop",
    ],
    routeDescription:
      "梧桐山有多条登山路线，最常见的是从梧桐山村出发的泰山涧路线。沿途经过泰山涧、葫芦径，最后到达大梧桐顶。下山可以选择盘山公路或原路返回。",
    tips:
      "1. 建议早上6-7点开始登山，避开中午高温\n2. 带足饮用水（至少2L）\n3. 部分路段较陡，建议携带登山杖\n4. 山顶风大，记得带外套\n5. 雨天路滑，请谨慎前往",
    equipmentNeeded: ["登山鞋", "登山杖", "背包", "水壶", "防晒霜", "帽子"],
    coordinates: { lat: 22.5964, lng: 114.2176 },
  },
  {
    id: uuidv4(),
    name: "七娘山",
    slug: "qiniang-mountain",
    description:
      "七娘山位于大鹏半岛，是深圳第二高峰，海拔869米。山势险峻，风景秀丽，是深圳最美的登山路线之一。山顶可以俯瞰大鹏湾和较场尾海滩，视野极佳。",
    difficulty: "hard" as Difficulty,
    duration: "5-7小时",
    distance: "10公里",
    bestSeason: ["秋季", "冬季", "春季"],
    coverImage:
      "https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=800&auto=format&fit=crop",
    images: [
      "https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=800&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1501785888041-af3ef285b470?w=800&auto=format&fit=crop",
    ],
    routeDescription:
      "从地质公园博物馆出发，沿着石阶路向上攀登。沿途经过一号观景台、二号观景台，最后到达主峰。下山可走原路或选择环线。",
    tips:
      "1. 路线较陡峭，体力要求较高\n2. 建议结伴而行，不要单独登山\n3. 部分路段无遮挡，注意防晒\n4. 带好急救药品\n5. 下山较早可以顺路去较场尾看海",
    equipmentNeeded: ["登山鞋", "登山杖", "手套", "急救包", "充足的水和食物"],
    coordinates: { lat: 22.5567, lng: 114.5432 },
  },
  {
    id: uuidv4(),
    name: "马峦山",
    slug: "maluan-mountain",
    description:
      "马峦山位于坪山区，以瀑布群闻名，是深圳最适合溯溪的徒步路线。山上有深圳最大的瀑布群，夏季是最佳的游玩季节。",
    difficulty: "easy" as Difficulty,
    duration: "3-4小时",
    distance: "8公里",
    bestSeason: ["夏季", "春季"],
    coverImage:
      "https://images.unsplash.com/photo-1432405972618-c60b0225b8f9?w=800&auto=format&fit=crop",
    images: [
      "https://images.unsplash.com/photo-1432405972618-c60b0225b8f9?w=800&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1465146344425-f00d5f5c8f07?w=800&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?w=800&auto=format&fit=crop",
    ],
    routeDescription:
      "从马峦山郊野公园入口出发，沿着溪流向上游走。沿途可以欣赏到多个大小不一的瀑布，终点是马峦山大瀑布。",
    tips:
      "1. 夏季是最佳季节，水量充沛\n2. 可以带泳衣在浅水区戏水\n3. 石头湿滑，建议穿防滑溯溪鞋\n4. 带好驱蚊用品\n5. 保护环境，不要留下垃圾",
    equipmentNeeded: ["溯溪鞋", "泳衣", "防水袋", "驱蚊液", "换洗衣物"],
    coordinates: { lat: 22.6789, lng: 114.3456 },
  },
  {
    id: uuidv4(),
    name: "东西冲",
    slug: "dongchong-xichong",
    description:
      "东西冲穿越是深圳最经典的海岸线徒步路线，连接东冲和西冲两个海滩。沿途可以欣赏到壮丽的海岸风光，是深圳户外爱好者的必走路线。",
    difficulty: "moderate" as Difficulty,
    duration: "5-6小时",
    distance: "9公里",
    bestSeason: ["秋季", "冬季", "春季"],
    coverImage:
      "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800&auto=format&fit=crop",
    images: [
      "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1505142468610-359e7d316be0?w=800&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1519046904884-53103b34b206?w=800&auto=format&fit=crop",
    ],
    routeDescription:
      "从东冲村出发，沿着海岸线向西穿越。需要翻越多个海岬，经过天文台，最终到达西冲海滩。沿途有绳索辅助攀爬。",
    tips:
      "1. 检查潮汐时间，避免涨潮时通过\n2. 带手套，需要攀爬岩石\n3. 全程无补给，带足水和食物\n4. 建议穿长袖长裤，防止擦伤\n5. 可以预约参观天文台",
    equipmentNeeded: [
      "防滑登山鞋",
      "手套",
      "充足的水",
      "高热量食物",
      "防晒霜",
      "帽子",
    ],
    coordinates: { lat: 22.4567, lng: 114.6543 },
  },
  {
    id: uuidv4(),
    name: "大雁顶",
    slug: "dayan-peak",
    description:
      "大雁顶位于大鹏半岛，海拔801米，是深圳的第三高峰。山顶视野开阔，可以360度俯瞰大鹏半岛的美景，是摄影爱好者的天堂。",
    difficulty: "hard" as Difficulty,
    duration: "6-8小时",
    distance: "14公里",
    bestSeason: ["秋季", "冬季"],
    coverImage:
      "https://images.unsplash.com/photo-1454496522488-7a8e488e8606?w=800&auto=format&fit=crop",
    images: [
      "https://images.unsplash.com/photo-1454496522488-7a8e488e8606?w=800&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1486870591958-9b9d0d1dda99?w=800&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1519681393784-d120267933ba?w=800&auto=format&fit=crop",
    ],
    routeDescription:
      "从杨梅坑出发，经过鹿嘴山庄，开始登山。路线较为原始，需要一定的户外经验。到达山顶后可以原路返回或选择环线下山。",
    tips:
      "1. 路线较长，需要较好的体力\n2. 部分路段不明显，建议下载离线地图\n3. 带好头灯，以防天黑下山\n4. 建议提前一天住在杨梅坑\n5. 可以顺路去鹿嘴山庄看美人鱼拍摄地",
    equipmentNeeded: [
      "专业登山鞋",
      "登山杖",
      "头灯",
      "GPS或离线地图",
      "充足的水（3L以上）",
      "高热量食物",
    ],
    coordinates: { lat: 22.5234, lng: 114.5678 },
  },
];

// 示例队伍
const createSeedTeams = (
  users: typeof seedUsers,
  locations: typeof seedLocations
) => {
  const now = new Date();
  const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const nextWeekend = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  return [
    // 梧桐山队伍
    {
      id: uuidv4(),
      locationId: locations[0].id,
      leaderId: users[0].id,
      title: "梧桐山日出徒步",
      description:
        "周六早上5点集合，一起登梧桐山看日出！预计4小时完成，适合有一定运动基础的朋友。",
      startTime: tomorrow,
      endTime: new Date(tomorrow.getTime() + 4 * 60 * 60 * 1000),
      maxMembers: 8,
      currentMembers: 3,
      requirements: "有徒步经验，能早起",
      status: "recruiting" as TeamStatus,
    },
    {
      id: uuidv4(),
      locationId: locations[0].id,
      leaderId: users[1].id,
      title: "梧桐山亲子徒步",
      description:
        "周日带小朋友一起爬梧桐山，走比较轻松的盘山公路，适合家庭参加。",
      startTime: nextWeekend,
      endTime: new Date(nextWeekend.getTime() + 5 * 60 * 60 * 1000),
      maxMembers: 12,
      currentMembers: 5,
      requirements: "带6岁以上儿童的家庭",
      status: "recruiting" as TeamStatus,
    },

    // 七娘山队伍
    {
      id: uuidv4(),
      locationId: locations[1].id,
      leaderId: users[1].id,
      title: "挑战七娘山",
      description:
        "七娘山难度较大，寻找有经验的徒步伙伴一起挑战。全程约6小时，需要较好的体力。",
      startTime: new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000),
      endTime: new Date(
        now.getTime() + 3 * 24 * 60 * 60 * 1000 + 6 * 60 * 60 * 1000
      ),
      maxMembers: 6,
      currentMembers: 2,
      requirements: "有中等难度徒步经验",
      status: "recruiting" as TeamStatus,
    },

    // 马峦山队伍
    {
      id: uuidv4(),
      locationId: locations[2].id,
      leaderId: users[3].id,
      title: "马峦山溯溪玩水",
      description:
        "夏天最适合去马峦山溯溪了！一起看瀑布、玩水、拍照，轻松愉快的一天。",
      startTime: new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000),
      endTime: new Date(
        now.getTime() + 2 * 24 * 60 * 60 * 1000 + 4 * 60 * 60 * 1000
      ),
      maxMembers: 10,
      currentMembers: 4,
      requirements: "会游泳优先",
      status: "recruiting" as TeamStatus,
    },
    {
      id: uuidv4(),
      locationId: locations[2].id,
      leaderId: users[4].id,
      title: "马峦山摄影徒步",
      description:
        "寻找喜欢摄影的伙伴一起去马峦山拍瀑布！我会带相机和三脚架。",
      startTime: new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000),
      endTime: new Date(
        now.getTime() + 5 * 24 * 60 * 60 * 1000 + 5 * 60 * 60 * 1000
      ),
      maxMembers: 6,
      currentMembers: 2,
      requirements: "有相机，喜欢风光摄影",
      status: "recruiting" as TeamStatus,
    },

    // 东西冲队伍
    {
      id: uuidv4(),
      locationId: locations[3].id,
      leaderId: users[0].id,
      title: "东西冲经典穿越",
      description:
        "深圳最美海岸线！一起挑战东西冲穿越，看大海、爬岩石、拍美照。",
      startTime: new Date(now.getTime() + 4 * 24 * 60 * 60 * 1000),
      endTime: new Date(
        now.getTime() + 4 * 24 * 60 * 60 * 1000 + 6 * 60 * 60 * 1000
      ),
      maxMembers: 8,
      currentMembers: 4,
      requirements: "有一定运动基础，不恐高",
      status: "recruiting" as TeamStatus,
    },

    // 大雁顶队伍
    {
      id: uuidv4(),
      locationId: locations[4].id,
      leaderId: users[4].id,
      title: "大雁顶+鹿嘴山庄一日游",
      description:
        "周六去大雁顶挑战深圳第三高峰，周日去鹿嘴山庄看海，两日游安排！",
      startTime: new Date(now.getTime() + 6 * 24 * 60 * 60 * 1000),
      endTime: new Date(
        now.getTime() + 6 * 24 * 60 * 60 * 1000 + 8 * 60 * 60 * 1000
      ),
      maxMembers: 6,
      currentMembers: 3,
      requirements: "体力好，有重装徒步经验优先",
      status: "recruiting" as TeamStatus,
    },
  ];
};

// 队伍成员关系
const createSeedTeamMembers = (
  teams: ReturnType<typeof createSeedTeams>,
  users: typeof seedUsers
) => {
  const members: {
    id: string;
    teamId: string;
    userId: string;
    role: TeamMemberRole;
    status: TeamMemberStatus;
    joinedAt: Date | null;
  }[] = [];

  // 为每个队伍添加队长
  teams.forEach((team) => {
    members.push({
      id: uuidv4(),
      teamId: team.id,
      userId: team.leaderId,
      role: "leader",
      status: "approved",
      joinedAt: new Date(),
    });
  });

  // 梧桐山日出徒步 - 添加成员
  members.push(
    {
      id: uuidv4(),
      teamId: teams[0].id,
      userId: users[2].id,
      role: "member",
      status: "approved",
      joinedAt: new Date(),
    },
    {
      id: uuidv4(),
      teamId: teams[0].id,
      userId: users[3].id,
      role: "member",
      status: "approved",
      joinedAt: new Date(),
    }
  );

  // 梧桐山亲子徒步 - 添加成员
  members.push(
    {
      id: uuidv4(),
      teamId: teams[1].id,
      userId: users[0].id,
      role: "member",
      status: "approved",
      joinedAt: new Date(),
    },
    {
      id: uuidv4(),
      teamId: teams[1].id,
      userId: users[3].id,
      role: "member",
      status: "approved",
      joinedAt: new Date(),
    }
  );

  // 挑战七娘山 - 添加成员
  members.push({
    id: uuidv4(),
    teamId: teams[2].id,
    userId: users[4].id,
    role: "member",
    status: "approved",
    joinedAt: new Date(),
  });

  // 马峦山溯溪玩水 - 添加成员
  members.push(
    {
      id: uuidv4(),
      teamId: teams[3].id,
      userId: users[0].id,
      role: "member",
      status: "approved",
      joinedAt: new Date(),
    },
    {
      id: uuidv4(),
      teamId: teams[3].id,
      userId: users[2].id,
      role: "member",
      status: "pending",
      joinedAt: null,
    }
  );

  // 东西冲经典穿越 - 添加成员
  members.push(
    {
      id: uuidv4(),
      teamId: teams[5].id,
      userId: users[1].id,
      role: "member",
      status: "approved",
      joinedAt: new Date(),
    },
    {
      id: uuidv4(),
      teamId: teams[5].id,
      userId: users[4].id,
      role: "member",
      status: "approved",
      joinedAt: new Date(),
    }
  );

  // 大雁顶 - 添加成员
  members.push(
    {
      id: uuidv4(),
      teamId: teams[6].id,
      userId: users[0].id,
      role: "member",
      status: "approved",
      joinedAt: new Date(),
    },
    {
      id: uuidv4(),
      teamId: teams[6].id,
      userId: users[1].id,
      role: "member",
      status: "approved",
      joinedAt: new Date(),
    }
  );

  return members;
};

// ==================== 执行种子 ====================

async function seed() {
  console.log("开始种子数据...\n");

  try {
    // 清空现有数据（按依赖顺序）
    console.log("清空现有数据...");
    await db.delete(teamMembers);
    await db.delete(teams);
    await db.delete(locations);
    await db.delete(users);

    // 插入用户
    console.log("插入用户数据...");
    for (const user of seedUsers) {
      await db.insert(users).values(user);
    }
    console.log(`✓ 插入 ${seedUsers.length} 个用户`);

    // 插入地点
    console.log("\n插入地点数据...");
    for (const location of seedLocations) {
      await db.insert(locations).values(location);
    }
    console.log(`✓ 插入 ${seedLocations.length} 个地点`);

    // 插入队伍
    console.log("\n插入队伍数据...");
    const seedTeamsList = createSeedTeams(seedUsers, seedLocations);
    for (const team of seedTeamsList) {
      await db.insert(teams).values(team);
    }
    console.log(`✓ 插入 ${seedTeamsList.length} 个队伍`);

    // 插入队伍成员
    console.log("\n插入队伍成员数据...");
    const seedTeamMembersList = createSeedTeamMembers(seedTeamsList, seedUsers);
    for (const member of seedTeamMembersList) {
      await db.insert(teamMembers).values(member);
    }
    console.log(`✓ 插入 ${seedTeamMembersList.length} 个队伍成员关系`);

    console.log("\n✅ 种子数据完成！");
    console.log("\n用户账号:");
    seedUsers.forEach((user) => {
      console.log(`  - ${user.name}: ${user.email}`);
    });
  } catch (error) {
    console.error("\n❌ 种子数据失败:", error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

// 运行种子
seed();
