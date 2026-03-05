import { NextRequest, NextResponse } from "next/server";
import { getRouteById, updateRoute, deleteRoute } from "@/app/actions/routes";
import { requireAdmin } from "@/lib/admin";

/**
 * GET /api/routes/[id]
 * 获取路线详情
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const route = await getRouteById(id);

    if (!route) {
      return NextResponse.json(
        { error: "路线不存在" },
        { status: 404 }
      );
    }

    // 格式化返回数据
    const formattedRoute = {
      id: route.id,
      locationId: route.locationId,
      cityId: route.cityId,
      name: route.name,
      description: route.description,
      difficulty: route.difficulty,
      duration: route.duration,
      distance: route.distance,
      elevation: route.elevation,
      routeGuide: route.routeGuide ? JSON.parse(route.routeGuide as string) : null,
      waypoints: route.waypoints ? JSON.parse(route.waypoints as string) : [],
      equipmentNeeded: route.equipmentNeeded ? JSON.parse(route.equipmentNeeded as string) : [],
      warnings: route.warnings ? JSON.parse(route.warnings as string) : [],
      tags: route.tags || [],
      location: route.location,
      city: route.city,
      createdAt: route.createdAt,
      updatedAt: route.updatedAt,
    };

    return NextResponse.json({
      success: true,
      route: formattedRoute,
    });
  } catch (error) {
    console.error("Get route error:", error);
    return NextResponse.json(
      { error: "获取路线详情失败", message: (error as Error).message },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/routes/[id]
 * 更新路线（需要管理员权限）
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // 验证管理员权限
    await requireAdmin();

    const { id } = await params;
    const body = await request.json();

    await updateRoute(id, body);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Update route error:", error);
    const message = (error as Error).message;
    if (message === "未登录") {
      return NextResponse.json({ error: "未登录" }, { status: 401 });
    }
    if (message === "无权限访问") {
      return NextResponse.json({ error: "无权限访问" }, { status: 403 });
    }
    return NextResponse.json(
      { error: "更新路线失败", message },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/routes/[id]
 * 删除路线（需要管理员权限）
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // 验证管理员权限
    await requireAdmin();

    const { id } = await params;
    await deleteRoute(id);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete route error:", error);
    const message = (error as Error).message;
    if (message === "未登录") {
      return NextResponse.json({ error: "未登录" }, { status: 401 });
    }
    if (message === "无权限访问") {
      return NextResponse.json({ error: "无权限访问" }, { status: 403 });
    }
    return NextResponse.json(
      { error: "删除路线失败", message },
      { status: 500 }
    );
  }
}
