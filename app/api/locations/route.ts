import { NextRequest, NextResponse } from "next/server";
import { nanoid } from "nanoid";
import { requireAdmin } from "@/lib/admin";
import { getLocations } from "@/app/actions/locations";

const getCloudflareContext = async () => {
  const mod = await import("@opennextjs/cloudflare");
  return mod.getCloudflareContext({ async: true });
};

/**
 * GET /api/locations
 * 获取地点列表（包含关联的路线）
 */
export async function GET(request: NextRequest) {
  try {
    const locations = await getLocations();

    // 格式化返回数据，添加兼容层
    const formattedLocations = locations.map((location) => {
      // 从第一条路线提取字段作为兼容层
      const firstRoute = location.routes?.[0];

      return {
        id: location.id,
        name: location.name,
        slug: location.slug,
        subtitle: location.subtitle,
        description: location.description,
        address: location.address,
        cityId: location.cityId,
        cityName: location.city?.name || location.cityName,
        coverImage: location.coverImage,
        images: location.images ? JSON.parse(location.images as string) : [],
        bestSeason: location.bestSeason ? JSON.parse(location.bestSeason as string) : [],
        coordinates: location.coordinates ? JSON.parse(location.coordinates as string) : { lat: 0, lng: 0 },
        extra: {
          facilities: location.facilities ? JSON.parse(location.facilities as string) : undefined,
          tips: location.tips || undefined,
          warnings: location.warnings ? JSON.parse(location.warnings as string) : undefined,
        },

        // 新字段：完整的 routes 数组
        routes: location.routes?.map((route) => ({
          id: route.id,
          locationId: route.locationId,
          cityId: route.cityId,
          name: route.name,
          description: route.description,
          difficulty: route.difficulty,
          duration: route.duration,
          distance: route.distance,
          elevation: route.elevation,
          routeGuide: route.routeGuide ? JSON.parse(route.routeGuide as string) : undefined,
          waypoints: route.waypoints ? JSON.parse(route.waypoints as string) : [],
          equipmentNeeded: route.equipmentNeeded ? JSON.parse(route.equipmentNeeded as string) : [],
          warnings: route.warnings ? JSON.parse(route.warnings as string) : [],
          createdAt: route.createdAt,
          updatedAt: route.updatedAt,
        })) || [],

        tags: location.tags || [],

        // 兼容层：从第一条路线提取字段（临时）
        difficulty: firstRoute?.difficulty,
        duration: firstRoute?.duration,
        distance: firstRoute?.distance,
        elevation: firstRoute?.elevation,
        routeGuide: firstRoute?.routeGuide ? JSON.parse(firstRoute.routeGuide as string) : undefined,
        waypoints: firstRoute?.waypoints ? JSON.parse(firstRoute.waypoints as string) : [],
        equipmentNeeded: firstRoute?.equipmentNeeded ? JSON.parse(firstRoute.equipmentNeeded as string) : [],
        facilities: location.facilities ? JSON.parse(location.facilities as string) : undefined,

        createdAt: location.createdAt,
        updatedAt: location.updatedAt,
      };
    });

    return NextResponse.json({
      success: true,
      locations: formattedLocations,
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
