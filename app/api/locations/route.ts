import { NextRequest, NextResponse } from "next/server";

const getCloudflareContext = async () => {
  const mod = await import("@opennextjs/cloudflare");
  return mod.getCloudflareContext();
};

/**
 * GET /api/locations
 * 获取地点列表
 */
export async function GET(request: NextRequest) {
  try {
    const { env } = await getCloudflareContext();

    if (!env.DB) {
      return NextResponse.json(
        { error: "Database not configured" },
        { status: 500 }
      );
    }

    const db = env.DB as D1Database;

    const { drizzle } = await import("drizzle-orm/d1");
    const schema = await import("@/db/schema");
    const { desc } = await import("drizzle-orm");
    const ormDb = drizzle(db, { schema });

    const results = await ormDb.query.locations.findMany({
      orderBy: desc(schema.locations.createdAt),
    });

    // 安全解析 JSON 字段（部分字段可能是普通字符串而非 JSON）
    function safeJsonParse<T>(value: string | null | undefined, fallback: T): T {
      if (!value) return fallback;
      try {
        return JSON.parse(value);
      } catch {
        // 如果不是有效 JSON，按逗号分隔转为数组（适用于 bestSeason 等字段）
        if (Array.isArray(fallback)) {
          return value.split(/[,、]/).map((s: string) => s.trim()).filter(Boolean) as unknown as T;
        }
        return fallback;
      }
    }

    const locations = results.map((row) => ({
      id: row.id,
      name: row.name,
      slug: row.slug,
      subtitle: row.subtitle || "",
      description: row.description,
      coverImage: row.coverImage,
      images: safeJsonParse(row.images, []),
      difficulty: row.difficulty,
      duration: row.duration,
      distance: row.distance,
      elevation: row.elevation || "",
      bestSeason: safeJsonParse(row.bestSeason, []),
      tags: safeJsonParse(row.tags, []),
      location: {
        address: row.address || "",
        coordinates: safeJsonParse(row.coordinates, { lat: 0, lng: 0 }),
      },
      routeGuide: safeJsonParse(row.routeGuide, { overview: "", waypoints: [], tips: [], warnings: [] }),
      facilities: safeJsonParse(row.facilities, { parking: false, restroom: false, water: false, food: false }),
      equipmentNeeded: safeJsonParse(row.equipmentNeeded, []),
      routeDescription: row.routeDescription || "",
      waypoints: safeJsonParse(row.waypoints, []),
      warnings: safeJsonParse(row.warnings, []),
      tips: row.tips || "",
    }));

    return NextResponse.json({
      success: true,
      locations,
    });
  } catch (error) {
    console.error("Get locations error:", error);
    return NextResponse.json(
      { error: "获取地点列表失败", message: (error as Error).message },
      { status: 500 }
    );
  }
}
