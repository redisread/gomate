import { NextRequest, NextResponse } from "next/server";
import { getTags, createTag } from "@/app/actions/tags";
import { requireAdmin } from "@/lib/admin";

/**
 * GET /api/tags
 * 获取标签列表
 * 查询参数：
 * - type: 标签类型 (location/route/activity)
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const filters = {
      type: (searchParams.get("type") as "location" | "route" | "activity") || undefined,
      limit: searchParams.get("limit") ? parseInt(searchParams.get("limit")!) : undefined,
      offset: searchParams.get("offset") ? parseInt(searchParams.get("offset")!) : undefined,
    };

    const tags = await getTags(filters);

    return NextResponse.json({
      success: true,
      tags,
    });
  } catch (error) {
    console.error("Get tags error:", error);
    return NextResponse.json(
      { error: "获取标签列表失败", message: (error as Error).message },
      { status: 500 }
    );
  }
}

/**
 * POST /api/tags
 * 创建新标签（需要管理员权限）
 */
export async function POST(request: NextRequest) {
  try {
    // 验证管理员权限
    await requireAdmin();

    const body = await request.json();

    // 验证必填字段
    if (!body.name || !body.type) {
      return NextResponse.json(
        { error: "缺少必填字段" },
        { status: 400 }
      );
    }

    const result = await createTag(body);

    return NextResponse.json({
      success: true,
      tagId: result.tagId,
      existing: result.existing,
    });
  } catch (error) {
    console.error("Create tag error:", error);
    const message = (error as Error).message;
    if (message === "未登录") {
      return NextResponse.json({ error: "未登录" }, { status: 401 });
    }
    if (message === "无权限访问") {
      return NextResponse.json({ error: "无权限访问" }, { status: 403 });
    }
    return NextResponse.json(
      { error: "创建标签失败", message },
      { status: 500 }
    );
  }
}
