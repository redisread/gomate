import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";

const getCloudflareContext = async () => {
  const mod = await import("@opennextjs/cloudflare");
  return mod.getCloudflareContext({ async: true });
};

/**
 * GET /api/locations/[id]
 * 获取单个地点详情
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
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
    const { eq } = await import("drizzle-orm");
    const ormDb = drizzle(db, { schema });

    const location = await ormDb.query.locations.findFirst({
      where: eq(schema.locations.id, id),
    });

    if (!location) {
      return NextResponse.json({ error: "地点不存在" }, { status: 404 });
    }

    // 安全解析 JSON 字段
    function safeJsonParse<T>(value: string | null | undefined, fallback: T): T {
      if (!value) return fallback;
      try {
        return JSON.parse(value);
      } catch {
        if (Array.isArray(fallback)) {
          return value.split(/[,、]/).map((s: string) => s.trim()).filter(Boolean) as unknown as T;
        }
        return fallback;
      }
    }

    return NextResponse.json({
      success: true,
      location: {
        ...location,
        images: safeJsonParse(location.images, []),
        bestSeason: safeJsonParse(location.bestSeason, []),
        tags: safeJsonParse(location.tags, []),
        coordinates: safeJsonParse(location.coordinates, { lat: 0, lng: 0 }),
        waypoints: safeJsonParse(location.waypoints, []),
        warnings: safeJsonParse(location.warnings, []),
        equipmentNeeded: safeJsonParse(location.equipmentNeeded, []),
        facilities: safeJsonParse(location.facilities, { parking: false, restroom: false, water: false, food: false }),
        routeGuide: safeJsonParse(location.routeGuide, {}),
      },
    });
  } catch (error) {
    console.error("Get location error:", error);
    return NextResponse.json(
      { error: "获取地点详情失败", message: (error as Error).message },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/locations/[id]
 * 删除地点（需要管理员权限）
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // 验证管理员权限
    await requireAdmin();

    const { id } = await params;
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
    const { eq } = await import("drizzle-orm");
    const ormDb = drizzle(db, { schema });

    // 检查地点是否存在
    const existing = await ormDb.query.locations.findFirst({
      where: eq(schema.locations.id, id),
    });

    if (!existing) {
      return NextResponse.json({ error: "地点不存在" }, { status: 404 });
    }

    // 删除地点
    await ormDb.delete(schema.locations).where(eq(schema.locations.id, id));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete location error:", error);
    const message = (error as Error).message;
    if (message === "未登录") {
      return NextResponse.json({ error: "未登录" }, { status: 401 });
    }
    if (message === "无权限访问") {
      return NextResponse.json({ error: "无权限访问" }, { status: 403 });
    }
    return NextResponse.json(
      { error: "删除地点失败", message },
      { status: 500 }
    );
  }
}