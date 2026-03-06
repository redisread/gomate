import { NextRequest, NextResponse } from "next/server";
import { getPois, createPoi } from "@/app/actions/pois";
import { requireAdmin } from "@/lib/admin";
import type { PoiCategory } from "@/db/schema";

/**
 * GET /api/pois
 * 获取 POI 列表
 * 查询参数：
 * - category: POI 类别
 * - name: POI 名称（模糊搜索）
 * - limit: 返回数量限制
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const filters = {
      category: searchParams.get("category") as PoiCategory | undefined,
      name: searchParams.get("name") || undefined,
      limit: searchParams.get("limit")
        ? parseInt(searchParams.get("limit")!)
        : undefined,
    };

    const poisList = await getPois(filters);

    // 格式化返回数据
    const formattedPois = poisList.map((poi) => ({
      id: poi.id,
      name: poi.name,
      description: poi.description,
      coordinates: poi.coordinates ? JSON.parse(poi.coordinates as string) : null,
      category: poi.category,
      images: poi.images ? JSON.parse(poi.images as string) : [],
      extra: poi.extra ? JSON.parse(poi.extra as string) : null,
      createdAt: poi.createdAt,
      updatedAt: poi.updatedAt,
    }));

    return NextResponse.json({
      success: true,
      pois: formattedPois,
    });
  } catch (error) {
    console.error("Get pois error:", error);
    return NextResponse.json(
      { error: "获取 POI 列表失败", message: (error as Error).message },
      { status: 500 }
    );
  }
}

/**
 * POST /api/pois
 * 创建新 POI（需要管理员权限）
 */
export async function POST(request: NextRequest) {
  try {
    // 验证管理员权限
    await requireAdmin();

    const body = await request.json();

    // 验证必填字段
    if (!body.name || !body.coordinates) {
      return NextResponse.json({ error: "缺少必填字段" }, { status: 400 });
    }

    const result = await createPoi(body);

    return NextResponse.json({
      success: true,
      poiId: result.poiId,
    });
  } catch (error) {
    console.error("Create poi error:", error);
    const message = (error as Error).message;
    if (message === "未登录") {
      return NextResponse.json({ error: "未登录" }, { status: 401 });
    }
    if (message === "无权限访问") {
      return NextResponse.json({ error: "无权限访问" }, { status: 403 });
    }
    return NextResponse.json({ error: "创建 POI 失败", message }, { status: 500 });
  }
}
