import { cache } from "react";
import { getDB } from "@/db";
import { teams } from "@/db/schema";
import { eq, desc } from "drizzle-orm";

// 解析 SQLite JSON 字段
function parseTeam(team: Record<string, unknown>) {
  if (!team) return null;
  return {
    ...team,
    requirements: typeof team.requirements === 'string' ? JSON.parse(team.requirements) : team.requirements,
  };
}

// 缓存队伍列表获取
export const getCachedTeams = cache(async () => {
  const db = await getDB();

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
  const db = await getDB();

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
  const db = await getDB();

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
