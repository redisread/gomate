import { cache } from "react";
import { db } from "@/db";
import { teams } from "@/db/schema";
import { eq, desc } from "drizzle-orm";

// 缓存队伍列表获取
export const getCachedTeams = cache(async () => {
  return db.query.teams.findMany({
    orderBy: [desc(teams.createdAt)],
    with: {
      location: true,
      leader: true,
    },
  });
});

// 缓存单个队伍获取
export const getCachedTeamById = cache(async (id: string) => {
  return db.query.teams.findFirst({
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
});

// 获取地点相关的活跃队伍
export const getCachedTeamsByLocation = cache(async (locationId: string) => {
  return db.query.teams.findMany({
    where: eq(teams.locationId, locationId),
    orderBy: [desc(teams.startTime)],
    with: {
      leader: true,
      members: true,
    },
  });
});
