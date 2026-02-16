import { cache } from "react";
import { db } from "@/db";
import { locations } from "@/db/schema";
import { eq } from "drizzle-orm";

// 缓存地点列表获取
export const getCachedLocations = cache(async () => {
  return db.query.locations.findMany({
    orderBy: (locations, { desc }) => [desc(locations.createdAt)],
  });
});

// 缓存单个地点获取
export const getCachedLocationBySlug = cache(async (slug: string) => {
  return db.query.locations.findFirst({
    where: eq(locations.slug, slug),
    with: {
      teams: {
        with: {
          leader: true,
        },
      },
    },
  });
});
