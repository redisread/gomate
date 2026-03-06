import { NextRequest, NextResponse } from "next/server";
import { getPoiById, updatePoi, deletePoi, getPoiRoles } from "@/app/actions/pois";
import { requireAdmin } from "@/lib/admin";

/**
 * GET /api/pois/[id]
 * 获取 POI 详情
 * 查询参数：
 * - includeRoles: 是否包含角色关联信息（true/false）
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const searchParams = request.nextUrl.searchParams;
    const includeRoles = searchParams.get("includeRoles") === "true";

    const poi = await getPoiById(id);

    if (!poi) {
      return NextResponse.json({ error: "POI 不存在" }, { status: 404 });
    }

    // 格式化 POI 数据
    const formattedPoi = {
      id: poi.id,
      name: poi.name,
      description: poi.description,
      coordinates: poi.coordinates ? JSON.parse(poi.coordinates as string) : null,
      category: poi.category,
      images: poi.images ? JSON.parse(poi.images as string) : [],
      extra: poi.extra ? JSON.parse(poi.extra as string) : null,
      createdAt: poi.createdAt,
      updatedAt: poi.updatedAt,
    };

    // 如果需要包含角色信息
    let roles = null;
    if (includeRoles) {
      const rolesList = await getPoiRoles(id);
      roles = rolesList.map((role) => ({
        id: role.id,
        entityType: role.entityType,
        entityId: role.entityId,
        roleType: role.roleType,
        order: role.order,
        roleSpecificData: role.roleSpecificData
          ? JSON.parse(role.roleSpecificData as string)
          : null,
        createdAt: role.createdAt,
      }));
    }

    return NextResponse.json({
      success: true,
      poi: formattedPoi,
      roles,
    });
  } catch (error) {
    console.error("Get poi error:", error);
    return NextResponse.json(
      { error: "获取 POI 详情失败", message: (error as Error).message },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/pois/[id]
 * 更新 POI（需要管理员权限）
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // 验证管理员权限
    await requireAdmin();

    const { id } = params;
    const body = await request.json();

    await updatePoi(id, body);

    return NextResponse.json({
      success: true,
    });
  } catch (error) {
    console.error("Update poi error:", error);
    const message = (error as Error).message;
    if (message === "未登录") {
      return NextResponse.json({ error: "未登录" }, { status: 401 });
    }
    if (message === "无权限访问") {
      return NextResponse.json({ error: "无权限访问" }, { status: 403 });
    }
    return NextResponse.json({ error: "更新 POI 失败", message }, { status: 500 });
  }
}

/**
 * DELETE /api/pois/[id]
 * 删除 POI（需要管理员权限）
 * 注意：会级联删除所有角色关联
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // 验证管理员权限
    await requireAdmin();

    const { id } = params;

    await deletePoi(id);

    return NextResponse.json({
      success: true,
    });
  } catch (error) {
    console.error("Delete poi error:", error);
    const message = (error as Error).message;
    if (message === "未登录") {
      return NextResponse.json({ error: "未登录" }, { status: 401 });
    }
    if (message === "无权限访问") {
      return NextResponse.json({ error: "无权限访问" }, { status: 403 });
    }
    return NextResponse.json({ error: "删除 POI 失败", message }, { status: 500 });
  }
}
