"use server";

import { db } from "@/db";
import { locations, teams, users, teamMembers } from "@/db/schema";
import { eq, desc, asc } from "drizzle-orm";
import { unstable_cache } from "next/cache";

// 获取地点列表
export async function getLocations() {
  const data = await db.query.locations.findMany({
    orderBy: [asc(locations.name)],
  });
  return data;
}

// 缓存版本的地点列表
export const getCachedLocations = unstable_cache(
  async () => getLocations(),
  ["locations"],
  {
    revalidate: 3600, // 1小时缓存
    tags: ["locations"],
  }
);

// 获取地点详情（通过 ID）
export async function getLocationById(id: string) {
  const location = await db.query.locations.findFirst({
    where: eq(locations.id, id),
    with: {
      teams: {
        where: eq(teams.status, "recruiting"),
        with: {
          leader: {
            columns: {
              id: true,
              name: true,
              image: true,
            },
          },
          members: {
            where: eq(teamMembers.status, "approved"),
            with: {
              user: {
                columns: {
                  id: true,
                  name: true,
                  image: true,
                },
              },
            },
          },
        },
        orderBy: [desc(teams.createdAt)],
      },
    },
  });

  return location;
}

// 获取地点详情（通过 slug）
export async function getLocationBySlug(slug: string) {
  const location = await db.query.locations.findFirst({
    where: eq(locations.slug, slug),
    with: {
      teams: {
        where: eq(teams.status, "recruiting"),
        with: {
          leader: {
            columns: {
              id: true,
              name: true,
              image: true,
            },
          },
          members: {
            where: eq(teamMembers.status, "approved"),
            with: {
              user: {
                columns: {
                  id: true,
                  name: true,
                  image: true,
                },
              },
            },
          },
        },
        orderBy: [desc(teams.createdAt)],
      },
    },
  });

  return location;
}

// 缓存版本的地点详情
export const getCachedLocationBySlug = unstable_cache(
  async (slug: string) => getLocationBySlug(slug),
  (slug) => [`location-${slug}`],
  {
    revalidate: 300, // 5分钟缓存
    tags: (slug) => [`location-${slug}`, "locations"],
  }
);
