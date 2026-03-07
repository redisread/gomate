import { NextRequest, NextResponse } from "next/server";
import { nanoid } from "nanoid";
import { requireAdmin } from "@/lib/admin";
import { getPopularTags, getAllTagsByType, getLocationsWithPagination } from "@/app/actions/locations";

const getCloudflareContext = async () => {
  const mod = await import("@opennextjs/cloudflare");
  return mod.getCloudflareContext({ async: true });
};

/**
 * GET /api/locations
 * 获取地点列表（包含关联的路线）
 * 支持查询参数：
 *   - tags=true: 返回热门标签
 *   - allTags=true: 返回所有标签（按类型分组）
 *   - page: 页码（从1开始，默认1）
 *   - pageSize: 每页数量（默认12，最大200）
 *   - search: 搜索关键词
 *   - cityId: 城市ID筛选
 *   - tagIds: 标签ID数组（逗号分隔）
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    // 返回热门标签
    if (searchParams.get("tags") === "true") {
      const popularTags = await getPopularTags(15);
      return NextResponse.json({
        success: true,
        tags: popularTags,
      });
    }

    // 返回所有标签（按类型分组）
    if (searchParams.get("allTags") === "true") {
      const allTags = await getAllTagsByType();
      return NextResponse.json({
        success: true,
        tags: allTags,
      });
    }

    const page = parseInt(searchParams.get("page") || "1", 10);
    const pageSize = Math.min(parseInt(searchParams.get("pageSize") || "12", 10), 200);
    const search = searchParams.get("search") || "";
    const cityId = searchParams.get("cityId") || "";
    const tagIdsParam = searchParams.get("tagIds");
    const tagIds = tagIdsParam ? tagIdsParam.split(",").filter(Boolean) : [];

    // 统一使用分页查询
    const result = await getLocationsWithPagination({
      page,
      pageSize,
      search,
      cityId,
      tagIds,
    });

    // 格式化返回数据
    const formattedLocations = result.locations.map((location) => {
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
        extra: location.extra ? JSON.parse(location.extra as string) : undefined,

        routes: location.routes?.map((route: any) => ({
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

        difficulty: firstRoute?.difficulty,
        duration: firstRoute?.duration,
        distance: firstRoute?.distance,
        elevation: firstRoute?.elevation,
        routeGuide: firstRoute?.routeGuide ? JSON.parse(firstRoute.routeGuide as string) : undefined,
        waypoints: firstRoute?.waypoints ? JSON.parse(firstRoute.waypoints as string) : [],
        equipmentNeeded: firstRoute?.equipmentNeeded ? JSON.parse(firstRoute.equipmentNeeded as string) : [],

        createdAt: location.createdAt,
        updatedAt: location.updatedAt,
      };
    });

    return NextResponse.json({
      success: true,
      locations: formattedLocations,
      pagination: {
        page: result.page,
        pageSize: result.pageSize,
        total: result.total,
        totalPages: result.totalPages,
      },
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
      address: body.address || null,
      cityId: body.cityId,
      cityName: body.cityName || null,
      bestSeason: JSON.stringify(body.bestSeason || []),
      coverImage: body.coverImage,
      images: JSON.stringify(body.images || []),
      coordinates: JSON.stringify(body.coordinates || { lat: 0, lng: 0 }),
      extra: body.extra ? JSON.stringify(body.extra) : null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // 如果有标签，关联到地点
    if (body.tagIds && body.tagIds.length > 0) {
      const { addTagsToEntity } = await import("@/app/actions/tags");
      await addTagsToEntity(id, "location", body.tagIds);
    }

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
    if (updateData.address !== undefined) dataToUpdate.address = updateData.address || null;
    if (updateData.cityId !== undefined) dataToUpdate.cityId = updateData.cityId;
    if (updateData.cityName !== undefined) dataToUpdate.cityName = updateData.cityName || null;
    if (updateData.bestSeason !== undefined) dataToUpdate.bestSeason = JSON.stringify(updateData.bestSeason);
    if (updateData.coverImage !== undefined) dataToUpdate.coverImage = updateData.coverImage;
    if (updateData.images !== undefined) dataToUpdate.images = JSON.stringify(updateData.images);
    if (updateData.coordinates !== undefined) dataToUpdate.coordinates = JSON.stringify(updateData.coordinates);
    if (updateData.extra !== undefined) dataToUpdate.extra = updateData.extra ? JSON.stringify(updateData.extra) : null;

    await ormDb.update(schema.locations)
      .set(dataToUpdate)
      .where(eq(schema.locations.id, id));

    // 同步标签关联（如果有传 tagIds）
    if (body.tagIds !== undefined) {
      const { setLocationTags } = await import("@/app/actions/tags");
      await setLocationTags(id, body.tagIds);
    }

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
