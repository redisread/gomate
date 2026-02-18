import { cache } from "react";
import { db, isMockMode } from "@/db";
import { teams } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { teams as mockTeams, getTeamById as getMockTeamById, getTeamsByLocationId as getMockTeamsByLocationId } from "./mock";

// 将 mock 数据转换为 D1/SQLite 格式
function transformMockTeamToDbFormat(mockTeam: typeof mockTeams[0]) {
  const startTime = new Date(`${mockTeam.date}T${mockTeam.time}`);
  const endTime = new Date(startTime.getTime() + parseInt(mockTeam.duration) * 60 * 60 * 1000);

  return {
    id: mockTeam.id,
    locationId: mockTeam.locationId,
    leaderId: mockTeam.leader.id,
    title: mockTeam.title,
    description: mockTeam.description,
    startTime,
    endTime,
    maxMembers: mockTeam.maxMembers,
    currentMembers: mockTeam.currentMembers,
    requirements: JSON.stringify(mockTeam.requirements),
    status: mockTeam.status === "open" ? "recruiting" : mockTeam.status === "full" ? "full" : "completed",
    createdAt: new Date(mockTeam.createdAt),
    updatedAt: new Date(mockTeam.createdAt),
  };
}

// 解析 SQLite JSON 字段
function parseTeam(team: any) {
  if (!team) return null;
  return {
    ...team,
    requirements: typeof team.requirements === 'string' ? JSON.parse(team.requirements) : team.requirements,
  };
}

// 缓存队伍列表获取
export const getCachedTeams = cache(async () => {
  // Mock 模式
  if (isMockMode) {
    return mockTeams.map(transformMockTeamToDbFormat).map(parseTeam);
  }

  // 数据库模式
  if (!db) {
    throw new Error("Database not initialized");
  }

  const results = await db.query.teams.findMany({
    orderBy: [desc(teams.createdAt)],
    with: {
      location: true,
      leader: true,
    },
  });

  return results.map(parseTeam);
});

// 缓存单个队伍获取
export const getCachedTeamById = cache(async (id: string) => {
  // Mock 模式
  if (isMockMode) {
    const mockTeam = getMockTeamById(id);
    if (!mockTeam) return undefined;
    return {
      ...parseTeam(transformMockTeamToDbFormat(mockTeam)),
      // 添加关联数据
      location: {
        id: mockTeam.locationId,
        name: mockTeam.locationId === "qiniangshan" ? "七娘山" :
              mockTeam.locationId === "wutongshan" ? "梧桐山" :
              mockTeam.locationId === "dongxichong" ? "东西冲" :
              mockTeam.locationId === "maluanshan" ? "马峦山" : "塘朗山",
        slug: mockTeam.locationId,
      },
      leader: {
        id: mockTeam.leader.id,
        name: mockTeam.leader.name,
        image: mockTeam.leader.avatar,
      },
    };
  }

  // 数据库模式
  if (!db) {
    throw new Error("Database not initialized");
  }

  const result = await db.query.teams.findFirst({
    where: eq(teams.id, id),
    with: {
      location: true,
      leader: true,
      members: {
        with: {
          user: true,
        },
      },
    },
  });

  return parseTeam(result);
});

// 获取地点相关的活跃队伍
export const getCachedTeamsByLocation = cache(async (locationId: string) => {
  // Mock 模式
  if (isMockMode) {
    const mockTeamsForLocation = getMockTeamsByLocationId(locationId);
    return mockTeamsForLocation.map(transformMockTeamToDbFormat).map(parseTeam);
  }

  // 数据库模式
  if (!db) {
    throw new Error("Database not initialized");
  }

  const results = await db.query.teams.findMany({
    where: eq(teams.locationId, locationId),
    orderBy: [desc(teams.startTime)],
    with: {
      leader: true,
      members: true,
    },
  });

  return results.map(parseTeam);
});
