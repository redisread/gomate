/**
 * 移动端测试数据种子脚本
 * 
 * 创建覆盖移动端全部功能的测试角色和数据：
 * 
 * 用户角色：
 * - admin@test.com: 管理员（管理地点、路线、标签等）
 * - leader_a@test.com: 队长 A（创建队伍、管理队伍）
 * - leader_b@test.com: 队长 B（创建不同状态的队伍）
 * - member_a@test.com: 成员 A（申请加入队伍）
 * - member_b@test.com: 成员 B（已加入队伍）
 * - expert@test.com: 资深用户（等级徽章测试）
 * - beginner@test.com: 新手用户（新手状态测试）
 * 
 * 功能覆盖：
 * - 认证：登录、注册、忘记密码、重置密码
 * - 地点：地点列表、地点详情、收藏、分享
 * - 队伍：队伍列表、队伍详情、创建队伍、队伍管理、我的队伍
 * - 个人资料：个人资料、编辑资料、我的收藏、用户公开资料
 * - 反馈建议、信息页模块
 */

import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { randomBytes, scryptSync } from "node:crypto";
import * as schema from "../src/db/schema";
import path from "path";
import fs from "fs";
import os from "node:os";

// 本地 D1 状态目录：多 worktree 共享同一份（GOMATE_LOCAL_STATE，默认 ~/.gomate/wrangler-state）
const DB_PATH = path.join(
  process.env.GOMATE_LOCAL_STATE ||
    path.join(os.homedir(), ".gomate", "wrangler-state"),
  "v3",
  "d1",
  "miniflare-D1DatabaseObject"
);

function findDbFile(): string {
  if (!fs.existsSync(DB_PATH)) {
    throw new Error(`D1 database directory not found: ${DB_PATH}`);
  }
  const files = fs.readdirSync(DB_PATH);
  // 排除 metadata.sqlite；真正的 D1 DB 文件名是数据库 ID 的哈希（很长的一串）
  const dbFile = files
    .filter((f) => f.endsWith(".sqlite") && f !== "metadata.sqlite")
    .sort((a, b) => b.length - a.length)[0];
  if (!dbFile) {
    throw new Error("No SQLite database file found in D1 directory");
  }
  return path.join(DB_PATH, dbFile);
}

const genId = (prefix: string) => `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

/**
 * 使用与 Better Auth 默认一致的 scrypt 参数生成密码 hash
 * 格式：salt:key（均为 hex 字符串，中间用 : 分隔）
 */
function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const key = scryptSync(password.normalize("NFKC"), salt, 64, {
    N: 16384,
    r: 16,
    p: 1,
    maxmem: 128 * 16384 * 16 * 2,
  });
  return `${salt}:${key.toString("hex")}`;
}

async function main() {
  const dbPath = findDbFile();
  console.log(`Using database: ${dbPath}`);
  
  const sqlite = new Database(dbPath);
  const db = drizzle(sqlite, { schema });
  
  const now = new Date();
  
  // ==================== 创建用户 ====================
  console.log("\n=== Creating Users ===");
  
  const users = [
    // 管理员用户
    {
      id: genId("user_admin"),
      name: "系统管理员",
      nickname: "Admin",
      email: "admin@test.com",
      emailVerified: true,
      role: "admin" as const,
      level: "expert" as const,
      status: "active" as const,
      bio: "GoMate 平台管理员，负责维护平台内容",
      wechat: "admin_wechat",
      completedHikes: 50,
    },
    // 队长 A（活跃队长）
    {
      id: genId("user_leader_a"),
      name: "张登山",
      nickname: "登山达人",
      email: "leader_a@test.com",
      emailVerified: true,
      role: "user" as const,
      level: "advanced" as const,
      status: "active" as const,
      bio: "热爱户外徒步，每周组织一次徒步活动",
      wechat: "leader_a_wechat",
      completedHikes: 25,
    },
    // 队长 B（资深队长）
    {
      id: genId("user_leader_b"),
      name: "李户外",
      nickname: "户外探险家",
      email: "leader_b@test.com",
      emailVerified: true,
      role: "user" as const,
      level: "expert" as const,
      status: "active" as const,
      bio: "专业户外领队，10年徒步经验",
      wechat: "leader_b_wechat",
      completedHikes: 100,
    },
    // 成员 A（活跃申请者）
    {
      id: genId("user_member_a"),
      name: "王新手",
      nickname: "徒步新人",
      email: "member_a@test.com",
      emailVerified: true,
      role: "user" as const,
      level: "beginner" as const,
      status: "active" as const,
      bio: "刚接触徒步，希望学习更多技巧",
      wechat: "member_a_wechat",
      completedHikes: 2,
    },
    // 成员 B（活跃参与者）
    {
      id: genId("user_member_b"),
      name: "陈徒步",
      nickname: "徒步爱好者",
      email: "member_b@test.com",
      emailVerified: true,
      role: "user" as const,
      level: "intermediate" as const,
      status: "active" as const,
      bio: "喜欢周末徒步，探索深圳的各个角落",
      wechat: "member_b_wechat",
      completedHikes: 15,
    },
    // 资深用户
    {
      id: genId("user_expert"),
      name: "资深达人",
      nickname: "Expert Hiker",
      email: "expert@test.com",
      emailVerified: true,
      role: "user" as const,
      level: "expert" as const,
      status: "active" as const,
      bio: "5年徒步经验，完成过100+次徒步",
      wechat: "expert_wechat",
      completedHikes: 100,
    },
    // 新手用户
    {
      id: genId("user_beginner"),
      name: "新手小白",
      nickname: "Beginner",
      email: "beginner@test.com",
      emailVerified: true,
      role: "user" as const,
      level: "beginner" as const,
      status: "active" as const,
      bio: "第一次参加徒步活动",
      wechat: "beginner_wechat",
      completedHikes: 0,
    },
  ];
  
  for (const user of users) {
    await db.insert(schema.users).values({
      ...user,
      createdAt: now,
      updatedAt: now,
    });
    console.log(`Created user: ${user.email} (${user.nickname})`);
  }
  
  // ==================== 创建城市 ====================
  console.log("\n=== Creating Cities ===");
  
  const cities = [
    {
      id: genId("city_sz"),
      adcode: "440300",
      name: "深圳",
      pinyin: "shenzhen",
      province: "广东省",
      level: "city" as const,
      isHot: true,
    },
    {
      id: genId("city_gz"),
      adcode: "440100",
      name: "广州",
      pinyin: "guangzhou",
      province: "广东省",
      level: "city" as const,
      isHot: true,
    },
    {
      id: genId("city_dg"),
      adcode: "441900",
      name: "东莞",
      pinyin: "dongguan",
      province: "广东省",
      level: "city" as const,
      isHot: false,
    },
  ];
  
  for (const city of cities) {
    await db.insert(schema.cities).values({
      ...city,
      createdAt: now,
      updatedAt: now,
    });
    console.log(`Created city: ${city.name}`);
  }
  
  // ==================== 创建地点 ====================
  console.log("\n=== Creating Locations ===");

  const shenzhenCity = cities.find(c => c.name === "深圳")!;
  const guangzhouCity = cities.find(c => c.name === "广州")!;

  // task #154：徒步参数直接挂 location 扁平字段（对齐 prod 0010）+ extra.hiking（对齐 0011）
  // 银梅湖无参数 = 空态样本
  const locations = [
    {
      id: genId("loc_qingshuiwan"),
      name: "清水湾",
      slug: "qingshuiwan",
      type: "hiking" as const,
      subtitle: "深圳南山的海边秘境",
      description: "清水湾位于深圳南山区，是一处隐藏的海边徒步胜地。沿着海岸线漫步，可以欣赏到壮丽的海景，感受海风拂面的惬意。这里有细腻的沙滩、清澈的海水，是周末放松身心的理想去处。",
      address: "深圳市南山区清水湾",
      cityId: shenzhenCity.id,
      cityName: shenzhenCity.name,
      bestSeason: JSON.stringify(["春季", "秋季"]),
      coverImage: "https://gomate.cos.jiahongw.com/locations/qingshuiwan-cover.jpg",
      images: JSON.stringify([
        "https://gomate.cos.jiahongw.com/locations/qingshuiwan-1.jpg",
        "https://gomate.cos.jiahongw.com/locations/qingshuiwan-2.jpg",
      ]),
      coordinates: JSON.stringify({ lat: 22.5, lng: 113.9 }),
      difficulty: "easy" as const,
      durationMin: 60,
      durationMax: 90,
      distance: 3.5,
      elevation: 50,
      extra: JSON.stringify({
        hiking: {
          overview: "沿着清水湾海岸线漫步，欣赏海景，体验海风拂面。",
          tips: ["穿防滑鞋", "注意潮汐"],
          equipmentNeeded: ["防滑鞋", "防晒霜", "水"],
          warnings: ["注意潮汐变化", "海边风大"],
        },
      }),
    },
    {
      id: genId("loc_wutongshan"),
      name: "梧桐山",
      slug: "wutongshan",
      type: "hiking" as const,
      subtitle: "深圳第一高峰",
      description: "梧桐山是深圳第一高峰，海拔943.7米。山顶视野开阔，可以俯瞰整个深圳和香港。多条登山路线可供选择，从简单到困难，适合不同水平的徒步爱好者。",
      address: "深圳市盐田区梧桐山",
      cityId: shenzhenCity.id,
      cityName: shenzhenCity.name,
      bestSeason: JSON.stringify(["春季", "冬季"]),
      coverImage: "https://gomate.cos.jiahongw.com/locations/wutongshan-cover.jpg",
      images: JSON.stringify([
        "https://gomate.cos.jiahongw.com/locations/wutongshan-1.jpg",
        "https://gomate.cos.jiahongw.com/locations/wutongshan-2.jpg",
      ]),
      coordinates: JSON.stringify({ lat: 22.6, lng: 114.2 }),
      difficulty: "moderate" as const,
      durationMin: 120,
      durationMax: 300,
      distance: 8,
      elevation: 900,
      extra: JSON.stringify({
        hiking: {
          overview: "南门半山亭线坡度平缓适合新手；北门直达山顶为挑战线，需要体力。",
          tips: ["坡度平缓线沿途有休息点", "挑战线坡度陡峭", "注意天气", "带够水"],
          equipmentNeeded: ["登山鞋", "登山杖", "充足的水", "食物"],
          warnings: ["陡峭路段", "天气变化快", "建议结伴"],
        },
      }),
    },
    {
      id: genId("loc_yinmeihu"),
      name: "银梅湖",
      slug: "yinmeihu",
      type: "leisure" as const,
      subtitle: "深圳西部的休闲湖泊",
      description: "银梅湖位于深圳宝安区，是一处美丽的休闲湖泊。湖水清澈，周围绿树环绕，适合散步、野餐和放松。湖边有完善的步道和休息设施。",
      address: "深圳市宝安区银梅湖公园",
      cityId: shenzhenCity.id,
      cityName: shenzhenCity.name,
      bestSeason: JSON.stringify(["春季", "夏季", "秋季"]),
      coverImage: "https://gomate.cos.jiahongw.com/locations/yinmeihu-cover.jpg",
      images: JSON.stringify([
        "https://gomate.cos.jiahongw.com/locations/yinmeihu-1.jpg",
      ]),
      coordinates: JSON.stringify({ lat: 22.4, lng: 113.8 }),
    },
    {
      id: genId("loc_baiyunshan"),
      name: "白云山",
      slug: "baiyunshan",
      type: "hiking" as const,
      subtitle: "广州的城市名山",
      description: "白云山是广州的城市名山，海拔382米。山上有多个观景点，可以俯瞰广州全景。步道完善，适合周末徒步和家庭出游。",
      address: "广州市白云区白云山",
      cityId: guangzhouCity.id,
      cityName: guangzhouCity.name,
      bestSeason: JSON.stringify(["春季", "秋季"]),
      coverImage: "https://gomate.cos.jiahongw.com/locations/baiyunshan-cover.jpg",
      images: JSON.stringify([
        "https://gomate.cos.jiahongw.com/locations/baiyunshan-1.jpg",
      ]),
      coordinates: JSON.stringify({ lat: 23.2, lng: 113.3 }),
      difficulty: "moderate" as const,
      durationMin: 180,
      durationMax: 240,
      distance: 6,
      elevation: 350,
      extra: JSON.stringify({
        hiking: {
          overview: "白云山主路线，沿途有多个观景点，步道完善。",
          tips: ["步道完善", "沿途有商店"],
          equipmentNeeded: ["运动鞋", "水"],
          warnings: ["周末人多"],
        },
      }),
    },
  ];

  for (const loc of locations) {
    await db.insert(schema.locations).values({
      ...loc,
      createdAt: now,
      updatedAt: now,
    });
    console.log(`Created location: ${loc.name} (${loc.cityName})`);
  }

  const qingshuiwanLoc = locations.find(l => l.name === "清水湾")!;
  const wutongshanLoc = locations.find(l => l.name === "梧桐山")!;
  const baiyunshanLoc = locations.find(l => l.name === "白云山")!;

  // ==================== 创建标签 ====================
  console.log("\n=== Creating Tags ===");
  
  const tags = [
    { id: genId("tag_seaside"), name: "海边", type: "location" as const },
    { id: genId("tag_mountain"), name: "山地", type: "location" as const },
    { id: genId("tag_forest"), name: "森林", type: "location" as const },
    { id: genId("tag_city"), name: "城市探索", type: "location" as const },
    { id: genId("tag_sunrise"), name: "日出", type: "activity" as const },
    { id: genId("tag_night"), name: "夜徒", type: "activity" as const },
  ];
  
  for (const tag of tags) {
    await db.insert(schema.tags).values({
      ...tag,
      createdAt: now,
    });
    console.log(`Created tag: ${tag.name} (${tag.type})`);
  }
  
  // ==================== 创建队伍 ====================
  console.log("\n=== Creating Teams ===");
  
  const leaderA = users.find(u => u.email === "leader_a@test.com")!;
  const leaderB = users.find(u => u.email === "leader_b@test.com")!;
  
  
  // 创建不同状态的队伍
  const teams = [
    // 招募中队伍（有空位）
    {
      id: genId("team_recruiting_1"),
      locationId: qingshuiwanLoc.id,
      leaderId: leaderA.id,
      title: "周末清水湾海岸线徒步",
      description: "本周六一起去清水湾徒步，感受海风拂面的惬意，适合新手参加。",
      startTime: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
      endTime: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000 + 2 * 60 * 60 * 1000),
      durationMin: 90,
      maxMembers: 6,
      requirements: JSON.stringify(["防晒霜", "防滑鞋", "充足的水"]),
      icon: "🌊",
      status: "recruiting" as const,
    },
    // 招募中队伍（快满）
    {
      id: genId("team_recruiting_2"),
      locationId: wutongshanLoc.id,
      leaderId: leaderB.id,
      title: "梧桐山轻松线体验",
      description: "梧桐山入门路线，适合新手和家庭，路线平缓风景优美。",
      startTime: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
      endTime: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000 + 3 * 60 * 60 * 1000),
      durationMin: 150,
      maxMembers: 8,
      requirements: JSON.stringify(["登山鞋", "水", "零食"]),
      icon: "⛰️",
      status: "recruiting" as const,
    },
    // 已满队伍
    {
      id: genId("team_full_1"),
      locationId: wutongshanLoc.id,
      leaderId: leaderB.id,
      title: "梧桐山挑战线登山",
      description: "挑战梧桐山山顶，适合有经验的徒步者，需要一定体力。",
      startTime: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      endTime: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000 + 5 * 60 * 60 * 1000),
      durationMin: 300,
      maxMembers: 5,
      requirements: JSON.stringify(["登山鞋", "登山杖", "充足的水", "食物"]),
      icon: "🏔️",
      status: "full" as const,
    },
    // 已组建队伍
    {
      id: genId("team_formed_1"),
      locationId: baiyunshanLoc.id,
      leaderId: leaderA.id,
      title: "白云山周末徒步",
      description: "已组建队伍，准备出发白云山。",
      startTime: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000),
      endTime: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000 + 4 * 60 * 60 * 1000),
      durationMin: 240,
      maxMembers: 10,
      requirements: JSON.stringify(["运动鞋", "水"]),
      icon: "🌄",
      status: "formed" as const,
    },
    // 已完成队伍
    {
      id: genId("team_completed_1"),
      locationId: qingshuiwanLoc.id,
      leaderId: leaderA.id,
      title: "上周清水湾徒步",
      description: "已完成的清水湾徒步活动。",
      startTime: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
      endTime: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000 + 2 * 60 * 60 * 1000),
      durationMin: 90,
      maxMembers: 6,
      requirements: JSON.stringify(["防晒霜", "防滑鞋", "充足的水"]),
      icon: "✅",
      status: "completed" as const,
    },
    // 已取消队伍
    {
      id: genId("team_cancelled_1"),
      locationId: wutongshanLoc.id,
      leaderId: leaderB.id,
      title: "梧桐山徒步（已取消）",
      description: "因天气原因取消的梧桐山徒步活动。",
      startTime: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
      endTime: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000 + 3 * 60 * 60 * 1000),
      durationMin: 150,
      maxMembers: 8,
      requirements: JSON.stringify(["登山鞋", "水", "零食"]),
      icon: "❌",
      status: "cancelled" as const,
    },
  ];
  
  for (const team of teams) {
    await db.insert(schema.teams).values({
      ...team,
      createdAt: now,
      updatedAt: now,
    });
    console.log(`Created team: ${team.title} (${team.status})`);
  }
  
  // ==================== 创建队伍成员 ====================
  console.log("\n=== Creating Team Members ===");
  
  const memberA = users.find(u => u.email === "member_a@test.com")!;
  const memberB = users.find(u => u.email === "member_b@test.com")!;
  const expertUser = users.find(u => u.email === "expert@test.com")!;
  const beginnerUser = users.find(u => u.email === "beginner@test.com")!;
  const adminUser = users.find(u => u.email === "admin@test.com")!;
  
  // 招募中队伍 1：队长 + 1 个已批准成员 + 1 个待审核申请
  const teamRecruiting1 = teams.find(t => t.id.includes("team_recruiting_1"))!;
  await db.insert(schema.teamMembers).values({
    id: genId("tm_leader1"),
    teamId: teamRecruiting1.id,
    userId: leaderA.id,
    status: "approved",
    joinedAt: now,
    createdAt: now,
  });
  await db.insert(schema.teamMembers).values({
    id: genId("tm_member_b_1"),
    teamId: teamRecruiting1.id,
    userId: memberB.id,
    status: "approved",
    joinedAt: now,
    createdAt: now,
  });
  await db.insert(schema.teamMembers).values({
    id: genId("tm_member_a_pending_1"),
    teamId: teamRecruiting1.id,
    userId: memberA.id,
    status: "pending",
    createdAt: now,
  });
  console.log(`Team ${teamRecruiting1.title}: leader + 1 approved + 1 pending`);
  
  // 招募中队伍 2：队长 + 5 个已批准成员 + 1 个待审核申请（所有成员互不重复）
  const teamRecruiting2 = teams.find(t => t.id.includes("team_recruiting_2"))!;
  await db.insert(schema.teamMembers).values({
    id: genId("tm_leader2"),
    teamId: teamRecruiting2.id,
    userId: leaderB.id,
    status: "approved",
    joinedAt: now,
    createdAt: now,
  });
  const teamRecruiting2Approved = [memberB.id, expertUser.id, beginnerUser.id, memberA.id, leaderA.id];
  for (let i = 0; i < teamRecruiting2Approved.length; i++) {
    await db.insert(schema.teamMembers).values({
      id: genId(`tm_member_${i}_2`),
      teamId: teamRecruiting2.id,
      userId: teamRecruiting2Approved[i],
      status: "approved",
      joinedAt: now,
      createdAt: now,
    });
  }
  await db.insert(schema.teamMembers).values({
    id: genId("tm_admin_pending_2"),
    teamId: teamRecruiting2.id,
    userId: adminUser.id,
    status: "pending",
    createdAt: now,
  });
  console.log(`Team ${teamRecruiting2.title}: leader + 5 approved + 1 pending`);
  
  // 已满队伍：队长 + 4 个已批准成员（满员）
  const teamFull1 = teams.find(t => t.id.includes("team_full_1"))!;
  await db.insert(schema.teamMembers).values({
    id: genId("tm_leader_full"),
    teamId: teamFull1.id,
    userId: leaderB.id,
    status: "approved",
    joinedAt: now,
    createdAt: now,
  });
  const teamFull1Approved = [memberB.id, expertUser.id, memberA.id, leaderA.id];
  for (let i = 0; i < teamFull1Approved.length; i++) {
    await db.insert(schema.teamMembers).values({
      id: genId(`tm_member_full_${i}`),
      teamId: teamFull1.id,
      userId: teamFull1Approved[i],
      status: "approved",
      joinedAt: now,
      createdAt: now,
    });
  }
  console.log(`Team ${teamFull1.title}: leader + 4 approved (full)`);
  
  // 已组建队伍：队长 + 5 个成员（已组建）+ 1 个申请退出
  const teamFormed1 = teams.find(t => t.id.includes("team_formed_1"))!;
  await db.insert(schema.teamMembers).values({
    id: genId("tm_leader_formed"),
    teamId: teamFormed1.id,
    userId: leaderA.id,
    status: "approved",
    joinedAt: now,
    createdAt: now,
  });
  const teamFormed1Approved = [memberB.id, memberA.id, expertUser.id, beginnerUser.id, leaderB.id];
  for (let i = 0; i < teamFormed1Approved.length; i++) {
    await db.insert(schema.teamMembers).values({
      id: genId(`tm_member_formed_${i}`),
      teamId: teamFormed1.id,
      userId: teamFormed1Approved[i],
      status: "approved",
      joinedAt: now,
      createdAt: now,
    });
  }
  // 一个成员申请退出（leave_pending）
  await db.insert(schema.teamMembers).values({
    id: genId("tm_member_leave_pending"),
    teamId: teamFormed1.id,
    userId: adminUser.id,
    status: "leave_pending",
    createdAt: now,
  });
  console.log(`Team ${teamFormed1.title}: leader + 5 approved + 1 leave_pending`);
  
  // 已完成队伍：队长 + 5 个已完成成员
  const teamCompleted1 = teams.find(t => t.id.includes("team_completed_1"))!;
  await db.insert(schema.teamMembers).values({
    id: genId("tm_leader_completed"),
    teamId: teamCompleted1.id,
    userId: leaderA.id,
    status: "approved",
    joinedAt: now,
    createdAt: now,
  });
  const teamCompleted1Approved = [memberB.id, memberA.id, expertUser.id, beginnerUser.id, leaderB.id];
  for (let i = 0; i < teamCompleted1Approved.length; i++) {
    await db.insert(schema.teamMembers).values({
      id: genId(`tm_member_completed_${i}`),
      teamId: teamCompleted1.id,
      userId: teamCompleted1Approved[i],
      status: "approved",
      joinedAt: now,
      createdAt: now,
    });
  }
  console.log(`Team ${teamCompleted1.title}: leader + 5 approved (completed)`);
  
  // ==================== 创建收藏 ====================
  console.log("\n=== Creating Favorites ===");
  
  await db.insert(schema.userFavorites).values({
    id: genId("fav_member_a_qingshuiwan"),
    userId: memberA.id,
    entityType: "location",
    entityId: qingshuiwanLoc.id,
    createdAt: now,
  });
  await db.insert(schema.userFavorites).values({
    id: genId("fav_member_a_wutongshan"),
    userId: memberA.id,
    entityType: "location",
    entityId: wutongshanLoc.id,
    createdAt: now,
  });
  await db.insert(schema.userFavorites).values({
    id: genId("fav_member_b_baiyunshan"),
    userId: memberB.id,
    entityType: "location",
    entityId: baiyunshanLoc.id,
    createdAt: now,
  });
  console.log(`Created 3 favorites`);
  
  // ==================== 创建账号（Better Auth）====================
  console.log("\n=== Creating Better Auth Accounts ===");

  // 所有测试账号使用统一密码 test1234
  const TEST_PASSWORD_HASH = hashPassword("test1234");
  
  for (const user of users) {
    await db.insert(schema.accounts).values({
      id: genId(`acc_${user.id}`),
      userId: user.id,
      accountId: user.email,
      providerId: "credential",
      password: TEST_PASSWORD_HASH,
      createdAt: now,
      updatedAt: now,
    });
    console.log(`Created account for: ${user.email}`);
  }
  
  console.log("\n=== Seed Complete ===");
  console.log("\nTest Accounts Summary:");
  console.log("===========================================");
  console.log("Email                     | Role     | Level      | Password");
  console.log("-------------------------------------------");
  console.log("admin@test.com            | admin    | expert     | test1234");
  console.log("leader_a@test.com         | user     | advanced   | test1234");
  console.log("leader_b@test.com         | user     | expert     | test1234");
  console.log("member_a@test.com         | user     | beginner   | test1234");
  console.log("member_b@test.com         | user     | intermediate| test1234");
  console.log("expert@test.com           | user     | expert     | test1234");
  console.log("beginner@test.com         | user     | beginner   | test1234");
  console.log("===========================================");
  
  sqlite.close();
}

main().catch(console.error);