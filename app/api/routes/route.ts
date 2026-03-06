import { NextRequest, NextResponse } from "next/server";
import { getRoutes, createRoute } from "@/app/actions/routes";
import { requireAdmin } from "@/lib/admin";

/**
 * GET /api/routes
 * 获取路线列表
 * 查询参数：
 * - locationId: 地点 ID
 * - cityId: 城市 ID
 * - difficulty: 难度等级
 * - limit: 限制数量
 * - offset: 偏移量
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const filters = {
      locationId: searchParams.get("locationId") || undefined,
      cityId: searchParams.get("cityId") || undefined,
      difficulty: searchParams.get("difficulty") || undefined,
      limit: searchParams.get("limit") ? parseInt(searchParams.get("limit")!) : undefined,
      offset: searchParams.get("offset") ? parseInt(searchParams.get("offset")!) : undefined,
    };

    const routes = await getRoutes(filters);

    // 格式化返回数据
    const formattedRoutes = routes.map((route) => {
      // 解析 extra 字段
      const extra = route.extra ? JSON.parse(route.extra as string) : {};

      return {
        id: route.id,
        locationId: route.locationId,
        cityId: route.cityId,
        name: route.name,
        description: route.description,
        difficulty: route.difficulty,
        durationMin: route.durationMin,
        durationMax: route.durationMax,
        distance: route.distance,
        elevation: route.elevation,
        routeGuide: route.routeGuide ? JSON.parse(route.routeGuide as string) : null,
        equipmentNeeded: extra.equipmentNeeded || [],
        warnings: extra.warnings || [],
        tags: route.tags || [],
        location: route.location,
        city: route.city,
        createdAt: route.createdAt,
        updatedAt: route.updatedAt,
      };
    });

    return NextResponse.json({
      success: true,
      routes: formattedRoutes,
    });
  } catch (error) {
    console.error("Get routes error:", error);
    return NextResponse.json(
      { error: "获取路线列表失败", message: (error as Error).message },
      { status: 500 }
    );
  }
}

/**
 * POST /api/routes
 * 创建新路线（需要管理员权限）
 */
export async function POST(request: NextRequest) {
  try {
    // 验证管理员权限
    await requireAdmin();

    const body = await request.json();

    // 验证必填字段
    if (
      !body.locationId ||
      !body.cityId ||
      !body.name ||
      !body.difficulty ||
      body.durationMin === undefined ||
      body.durationMax === undefined ||
      body.distance === undefined
    ) {
      return NextResponse.json(
        { error: "缺少必填字段" },
        { status: 400 }
      );
    }

    const result = await createRoute(body);

    return NextResponse.json({
      success: true,
      routeId: result.routeId,
    });
  } catch (error) {
    console.error("Create route error:", error);
    const message = (error as Error).message;
    if (message === "未登录") {
      return NextResponse.json({ error: "未登录" }, { status: 401 });
    }
    if (message === "无权限访问") {
      return NextResponse.json({ error: "无权限访问" }, { status: 403 });
    }
    return NextResponse.json(
      { error: "创建路线失败", message },
      { status: 500 }
    );
  }
}
