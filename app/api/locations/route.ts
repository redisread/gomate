import { NextRequest, NextResponse } from "next/server";
import { nanoid } from "nanoid";
import { requireAdmin } from "@/lib/admin";

const getCloudflareContext = async () => {
  const mod = await import("@opennextjs/cloudflare");
  return mod.getCloudflareContext({ async: true });
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

    // 使用原始 SQL 查询以正确获取时间戳
    const results = await db.prepare(`
      SELECT
        id, name, slug, subtitle, description, difficulty, duration, distance, elevation,
        cover_image as coverImage, images, best_season as bestSeason, tags,
        address, adcode, city_name as cityName, coordinates, route_description as routeDescription,
        route_guide as routeGuide, waypoints, tips, warnings, equipment_needed as equipmentNeeded, facilities,
        created_at as createdAt, updated_at as updatedAt
      FROM locations
      ORDER BY created_at DESC
    `).all();

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

    // 格式化时间戳（毫秒级）
    function formatTimestamp(ts: number | null | undefined): string | null {
      if (!ts) return null;
      // 数据库存储的是毫秒级时间戳
      return new Date(ts).toISOString();
    }

    const locations = (results.results as Record<string, unknown>[]).map((row) => ({
      id: row.id,
      name: row.name,
      slug: row.slug,
      subtitle: row.subtitle || "",
      description: row.description,
      coverImage: row.coverImage,
      images: safeJsonParse(row.images as string, []),
      difficulty: row.difficulty,
      duration: row.duration,
      distance: row.distance,
      elevation: row.elevation || "",
      bestSeason: safeJsonParse(row.bestSeason as string, []),
      tags: safeJsonParse(row.tags as string, []),
      adcode: row.adcode || undefined,
      cityName: row.cityName || undefined,
      location: {
        address: row.address || "",
        coordinates: safeJsonParse(row.coordinates as string, { lat: 0, lng: 0 }),
      },
      routeGuide: (() => {
        const guide = safeJsonParse<Record<string, unknown>>(row.routeGuide as string, {});
        return {
          overview: (guide.overview as string) || row.routeDescription || "",
          waypoints: safeJsonParse(row.waypoints as string, []),
          tips: Array.isArray(guide.tips) ? guide.tips : (row.tips ? (row.tips as string).split('\n').filter(Boolean) : []),
          warnings: safeJsonParse(row.warnings as string, []),
        };
      })(),
      facilities: safeJsonParse(row.facilities as string, { parking: false, restroom: false, water: false, food: false }),
      equipmentNeeded: safeJsonParse(row.equipmentNeeded as string, []),
      routeDescription: row.routeDescription || "",
      waypoints: safeJsonParse(row.waypoints as string, []),
      warnings: safeJsonParse(row.warnings as string, []),
      tips: row.tips || "",
      createdAt: formatTimestamp(row.createdAt as number),
      updatedAt: formatTimestamp(row.updatedAt as number),
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

/**
 * POST /api/locations
 * 创建新地点（需要管理员权限）
 */
export async function POST(request: NextRequest) {
  try {
    // 验证管理员权限
    await requireAdmin();

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
    const ormDb = drizzle(db, { schema });

    const body = await request.json();
    const id = nanoid();

    // 生成 slug（如果没有提供）
    const slug = body.slug || body.name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");

    await ormDb.insert(schema.locations).values({
      id,
      name: body.name,
      slug,
      subtitle: body.subtitle || null,
      description: body.description,
      difficulty: body.difficulty,
      duration: body.duration,
      distance: body.distance,
      elevation: body.elevation || null,
      bestSeason: JSON.stringify(body.bestSeason || []),
      tags: body.tags ? JSON.stringify(body.tags) : null,
      coverImage: body.coverImage,
      images: JSON.stringify(body.images || []),
      address: body.address || null,
      adcode: body.adcode || null,
      cityName: body.cityName || null,
      routeDescription: body.routeDescription || null,
      routeGuide: body.routeGuide ? JSON.stringify(body.routeGuide) : null,
      waypoints: body.waypoints ? JSON.stringify(body.waypoints) : null,
      tips: body.tips || null,
      warnings: body.warnings ? JSON.stringify(body.warnings) : null,
      equipmentNeeded: body.equipmentNeeded ? JSON.stringify(body.equipmentNeeded) : null,
      coordinates: JSON.stringify(body.coordinates || { lat: 0, lng: 0 }),
      facilities: body.facilities ? JSON.stringify(body.facilities) : null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    return NextResponse.json({
      success: true,
      location: { id, slug },
    });
  } catch (error) {
    console.error("Create location error:", error);
    const message = (error as Error).message;
    if (message === "未登录") {
      return NextResponse.json({ error: "未登录" }, { status: 401 });
    }
    if (message === "无权限访问") {
      return NextResponse.json({ error: "无权限访问" }, { status: 403 });
    }
    return NextResponse.json(
      { error: "创建地点失败", message },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/locations
 * 更新地点（需要管理员权限）
 */
export async function PUT(request: NextRequest) {
  try {
    // 验证管理员权限
    await requireAdmin();

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

    const body = await request.json();
    const { id, ...updateData } = body;

    if (!id) {
      return NextResponse.json({ error: "缺少地点 ID" }, { status: 400 });
    }

    // 构建更新数据
    const dataToUpdate: Record<string, unknown> = {
      updatedAt: new Date(),
    };

    if (updateData.name !== undefined) dataToUpdate.name = updateData.name;
    if (updateData.slug !== undefined) dataToUpdate.slug = updateData.slug;
    if (updateData.subtitle !== undefined) dataToUpdate.subtitle = updateData.subtitle || null;
    if (updateData.description !== undefined) dataToUpdate.description = updateData.description;
    if (updateData.difficulty !== undefined) dataToUpdate.difficulty = updateData.difficulty;
    if (updateData.duration !== undefined) dataToUpdate.duration = updateData.duration;
    if (updateData.distance !== undefined) dataToUpdate.distance = updateData.distance;
    if (updateData.elevation !== undefined) dataToUpdate.elevation = updateData.elevation || null;
    if (updateData.bestSeason !== undefined) dataToUpdate.bestSeason = JSON.stringify(updateData.bestSeason);
    if (updateData.tags !== undefined) dataToUpdate.tags = updateData.tags ? JSON.stringify(updateData.tags) : null;
    if (updateData.coverImage !== undefined) dataToUpdate.coverImage = updateData.coverImage;
    if (updateData.images !== undefined) dataToUpdate.images = JSON.stringify(updateData.images);
    if (updateData.address !== undefined) dataToUpdate.address = updateData.address || null;
    if (updateData.adcode !== undefined) dataToUpdate.adcode = updateData.adcode || null;
    if (updateData.cityName !== undefined) dataToUpdate.cityName = updateData.cityName || null;
    if (updateData.routeDescription !== undefined) dataToUpdate.routeDescription = updateData.routeDescription || null;
    if (updateData.routeGuide !== undefined) dataToUpdate.routeGuide = updateData.routeGuide ? JSON.stringify(updateData.routeGuide) : null;
    if (updateData.waypoints !== undefined) dataToUpdate.waypoints = updateData.waypoints ? JSON.stringify(updateData.waypoints) : null;
    if (updateData.tips !== undefined) dataToUpdate.tips = updateData.tips || null;
    if (updateData.warnings !== undefined) dataToUpdate.warnings = updateData.warnings ? JSON.stringify(updateData.warnings) : null;
    if (updateData.equipmentNeeded !== undefined) dataToUpdate.equipmentNeeded = updateData.equipmentNeeded ? JSON.stringify(updateData.equipmentNeeded) : null;
    if (updateData.coordinates !== undefined) dataToUpdate.coordinates = JSON.stringify(updateData.coordinates);
    if (updateData.facilities !== undefined) dataToUpdate.facilities = updateData.facilities ? JSON.stringify(updateData.facilities) : null;

    await ormDb.update(schema.locations)
      .set(dataToUpdate)
      .where(eq(schema.locations.id, id));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Update location error:", error);
    const message = (error as Error).message;
    if (message === "未登录") {
      return NextResponse.json({ error: "未登录" }, { status: 401 });
    }
    if (message === "无权限访问") {
      return NextResponse.json({ error: "无权限访问" }, { status: 403 });
    }
    return NextResponse.json(
      { error: "更新地点失败", message },
      { status: 500 }
    );
  }
}
