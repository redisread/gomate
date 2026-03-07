/**
 * 队伍数据种子
 * 包含示例徒步队伍数据
 */

import type Database from "better-sqlite3";
import { nanoid } from "nanoid";
import type { UserData } from "./users";
import type { LocationData } from "./locations";
import type { RouteData } from "./routes";

export interface TeamData {
  id: string;
  title: string;
  locationId: string;
}

// 队伍数据
const teamsData = [
  {
    title: "梧桐山日出挑战",
    description: "周六清晨攀登梧桐山，欣赏壮丽日出。适合有一定体能基础的户外爱好者。",
    locationSlug: "wutong-mountain",
    routeName: "好汉坡线路",
    leaderEmail: "wujiahong2013@gmail.com",
    maxMembers: 10,
    status: "recruiting" as const,
    hikingDate: "2026-03-15",
    hikingTime: "05:30",
    durationMin: 300, // 5小时
    icon: "🌅",
    requirements: JSON.stringify(["能连续登山4小时以上", "年满18周岁", "无心血管疾病"]),
  },
  {
    title: "东西涌海岸线穿越",
    description: "穿越深圳最美海岸线，体验海蚀地貌的壮丽景色。风景绝美，适合拍照。",
    locationSlug: "dongxichong",
    routeName: "东西涌穿越线",
    leaderEmail: "1427298682@qq.com",
    maxMembers: 15,
    status: "recruiting" as const,
    hikingDate: "2026-03-16",
    hikingTime: "08:00",
    durationMin: 360, // 6小时
    icon: "🌊",
    requirements: JSON.stringify(["能徒步5小时以上", "穿防滑鞋", "带手套攀爬礁石"]),
  },
  {
    title: "马峦山溯溪休闲游",
    description: "轻松的溯溪徒步，欣赏瀑布群美景。适合家庭和新手参与。",
    locationSlug: "maluan-mountain",
    routeName: "马峦山瀑布线",
    leaderEmail: "zhangsan@example.com",
    maxMembers: 20,
    status: "recruiting" as const,
    hikingDate: "2026-03-22",
    hikingTime: "09:00",
    durationMin: 240, // 4小时
    icon: "💦",
    requirements: JSON.stringify(["能徒步3小时以上", "可以带小朋友一起参加"]),
  },
  {
    title: "七娘山观海徒步",
    description: "攀登深圳第二高峰，俯瞰大鹏半岛壮丽海景。",
    locationSlug: "qiniang-mountain",
    routeName: "七娘山主峰环线",
    leaderEmail: "lisi@example.com",
    maxMembers: 12,
    status: "full" as const,
    hikingDate: "2026-03-20",
    hikingTime: "07:00",
    durationMin: 360, // 6小时
    icon: "⛰️",
    requirements: JSON.stringify(["能连续登山5小时", "年满18周岁"]),
  },
  {
    title: "阳台山周末休闲",
    description: "轻松的周末徒步，适合全家老少一起参与。",
    locationSlug: "yangtai-mountain",
    routeName: "阳台山石岩线",
    leaderEmail: "wangwu@example.com",
    maxMembers: 25,
    status: "recruiting" as const,
    hikingDate: "2026-03-23",
    hikingTime: "08:30",
    durationMin: 180, // 3小时
    icon: "🌳",
    requirements: JSON.stringify(["能徒步2小时以上", "适合所有年龄段"]),
  },
  {
    title: "梅沙尖云海摄影",
    description: "追逐云海和日出，拍摄深圳最美山景。摄影爱好者的绝佳选择。",
    locationSlug: "meishajian",
    routeName: "山海大观线",
    leaderEmail: "1427298682@qq.com",
    maxMembers: 8,
    status: "recruiting" as const,
    hikingDate: "2026-03-29",
    hikingTime: "05:00",
    durationMin: 300, // 5小时
    icon: "📸",
    requirements: JSON.stringify(["能早起，体能较好", "有摄影器材优先"]),
  },
  {
    title: "凤凰山祈福徒步",
    description: "登凤凰山祈福，体验深圳传统文化。",
    locationSlug: "fenghuangshan",
    routeName: "凤岩古庙线",
    leaderEmail: "zhaoliu@example.com",
    maxMembers: 30,
    status: "recruiting" as const,
    hikingDate: "2026-03-30",
    hikingTime: "09:00",
    durationMin: 180, // 3小时
    icon: "🙏",
    requirements: JSON.stringify(["适合所有人群", "可以顺便参拜古庙"]),
  },
];

/**
 * 将日期和时间字符串转换为时间戳
 */
function toTimestamp(dateStr: string, timeStr: string): number {
  const dateTimeStr = `${dateStr}T${timeStr}:00`;
  return new Date(dateTimeStr).getTime();
}

/**
 * 插入队伍数据
 */
export function seedTeams(
  db: Database,
  users: UserData[],
  locations: LocationData[],
  routes: RouteData[]
): TeamData[] {
  console.log("👥 开始插入队伍数据...");

  // 创建查找映射
  const userMap = new Map<string, string>();
  for (const user of users) {
    userMap.set(user.email, user.id);
  }

  const locationMap = new Map<string, string>();
  for (const loc of locations) {
    locationMap.set(loc.slug, loc.id);
  }

  const routeMap = new Map<string, string>();
  for (const route of routes) {
    routeMap.set(route.name, route.id);
  }

  const insertTeamStmt = db.prepare(`
    INSERT OR IGNORE INTO teams (
      id, location_id, route_id, leader_id, title, description,
      start_time, end_time, duration_min, max_members, requirements,
      icon, status, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const insertMemberStmt = db.prepare(`
    INSERT OR IGNORE INTO team_members (
      id, team_id, user_id, status, joined_at, status_updated_at, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  const now = Date.now();
  const insertedTeams: TeamData[] = [];

  for (const team of teamsData) {
    const teamId = nanoid();
    const leaderId = userMap.get(team.leaderEmail);
    const locationId = locationMap.get(team.locationSlug);
    const routeId = routeMap.get(team.routeName);

    if (!leaderId) {
      console.warn(`  ⚠️  未找到队长 ${team.leaderEmail}，跳过队伍: ${team.title}`);
      continue;
    }

    if (!locationId) {
      console.warn(`  ⚠️  未找到地点 ${team.locationSlug}，跳过队伍: ${team.title}`);
      continue;
    }

    // 计算开始和结束时间
    const startTime = toTimestamp(team.hikingDate, team.hikingTime);
    const endTime = startTime + team.durationMin * 60 * 1000;

    insertTeamStmt.run(
      teamId,
      locationId,
      routeId || null,
      leaderId,
      team.title,
      team.description,
      startTime,
      endTime,
      team.durationMin,
      team.maxMembers,
      team.requirements,
      team.icon,
      team.status,
      now,
      now
    );

    // 插入队长作为已审核通过的队伍成员
    const memberId = nanoid();
    insertMemberStmt.run(
      memberId,
      teamId,
      leaderId,
      "approved",
      now, // joined_at
      now, // status_updated_at
      now
    );

    insertedTeams.push({
      id: teamId,
      title: team.title,
      locationId,
    });
    console.log(`  ✓ ${team.title} (队长: ${team.leaderEmail})`);
  }

  console.log(`✅ 队伍数据插入完成，共 ${insertedTeams.length} 支队伍\n`);
  return insertedTeams;
}

/**
 * 获取队伍 ID 映射
 */
export function getTeamIdMap(teams: TeamData[]): Map<string, string> {
  const map = new Map<string, string>();
  for (const team of teams) {
    map.set(team.title, team.id);
  }
  return map;
}
