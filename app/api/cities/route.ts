import { NextRequest, NextResponse } from "next/server";
import { getCities, getHotCities, createCity } from "@/app/actions/cities";
import { requireAdmin } from "@/lib/admin";

/**
 * GET /api/cities
 * 获取城市列表
 * 查询参数：
 * - hot: 是否只返回热门城市 (true/false)
 * - province: 省份
 * - level: 城市级别 (city/district)
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const hot = searchParams.get("hot");

    // 如果请求热门城市
    if (hot === "true") {
      const cities = await getHotCities();
      return NextResponse.json({
        success: true,
        cities,
      });
    }

    // 否则返回所有城市（支持筛选）
    const filters = {
      isHot: hot === "true" ? true : hot === "false" ? false : undefined,
      province: searchParams.get("province") || undefined,
      level: (searchParams.get("level") as "city" | "district") || undefined,
      limit: searchParams.get("limit") ? parseInt(searchParams.get("limit")!) : undefined,
      offset: searchParams.get("offset") ? parseInt(searchParams.get("offset")!) : undefined,
    };

    const cities = await getCities(filters);

    return NextResponse.json({
      success: true,
      cities,
    });
  } catch (error) {
    console.error("Get cities error:", error);
    return NextResponse.json(
      { error: "获取城市列表失败", message: (error as Error).message },
      { status: 500 }
    );
  }
}

/**
 * POST /api/cities
 * 创建新城市（需要管理员权限）
 */
export async function POST(request: NextRequest) {
  try {
    // 验证管理员权限
    await requireAdmin();

    const body = await request.json();

    // 验证必填字段
    if (!body.adcode || !body.name || !body.level) {
      return NextResponse.json(
        { error: "缺少必填字段" },
        { status: 400 }
      );
    }

    const result = await createCity(body);

    return NextResponse.json({
      success: true,
      cityId: result.cityId,
    });
  } catch (error) {
    console.error("Create city error:", error);
    const message = (error as Error).message;
    if (message === "未登录") {
      return NextResponse.json({ error: "未登录" }, { status: 401 });
    }
    if (message === "无权限访问") {
      return NextResponse.json({ error: "无权限访问" }, { status: 403 });
    }
    return NextResponse.json(
      { error: "创建城市失败", message },
      { status: 500 }
    );
  }
}
