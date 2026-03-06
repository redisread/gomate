import { NextRequest, NextResponse } from "next/server";
import {
  getEntityPois,
  addPoiToEntity,
  updatePoiRole,
  removePoiFromEntity,
} from "@/app/actions/pois";
import { requireAdmin } from "@/lib/admin";
import type { PoiEntityType, PoiRoleType } from "@/db/schema";

/**
 * GET /api/entity-pois
 * 获取实体的所有 POI（包含角色信息）
 * 查询参数：
 * - entityType: 实体类型（route/location/city）
 * - entityId: 实体 ID
 * - roleType: 角色类型（可选）
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const entityType = searchParams.get("entityType") as PoiEntityType;
    const entityId = searchParams.get("entityId");
    const roleType = searchParams.get("roleType") as PoiRoleType | undefined;

    if (!entityType || !entityId) {
      return NextResponse.json(
        { error: "缺少必填参数 entityType 或 entityId" },
        { status: 400 }
      );
    }

    const results = await getEntityPois(entityType, entityId, roleType);

    // 格式化返回数据
    const formattedResults = results.map((result) => ({
      poi: {
        id: result.poi.id,
        name: result.poi.name,
        description: result.poi.description,
        coordinates: result.poi.coordinates
          ? JSON.parse(result.poi.coordinates as string)
          : null,
        category: result.poi.category,
        images: result.poi.images ? JSON.parse(result.poi.images as string) : [],
        extra: result.poi.extra ? JSON.parse(result.poi.extra as string) : null,
        createdAt: result.poi.createdAt,
        updatedAt: result.poi.updatedAt,
      },
      role: {
        id: result.role.id,
        poiId: result.role.poiId,
        entityType: result.role.entityType,
        entityId: result.role.entityId,
        roleType: result.role.roleType,
        order: result.role.order,
        roleSpecificData: result.role.roleSpecificData
          ? JSON.parse(result.role.roleSpecificData as string)
          : null,
        createdAt: result.role.createdAt,
      },
    }));

    return NextResponse.json({
      success: true,
      results: formattedResults,
    });
  } catch (error) {
    console.error("Get entity pois error:", error);
    return NextResponse.json(
      { error: "获取实体 POI 失败", message: (error as Error).message },
      { status: 500 }
    );
  }
}

/**
 * POST /api/entity-pois
 * 为实体添加 POI 角色关联（需要管理员权限）
 */
export async function POST(request: NextRequest) {
  try {
    // 验证管理员权限
    await requireAdmin();

    const body = await request.json();

    // 验证必填字段
    if (
      !body.poiId ||
      !body.entityType ||
      !body.entityId ||
      !body.roleType
    ) {
      return NextResponse.json({ error: "缺少必填字段" }, { status: 400 });
    }

    const result = await addPoiToEntity(body);

    return NextResponse.json({
      success: true,
      relationId: result.relationId,
    });
  } catch (error) {
    console.error("Add poi to entity error:", error);
    const message = (error as Error).message;
    if (message === "未登录") {
      return NextResponse.json({ error: "未登录" }, { status: 401 });
    }
    if (message === "无权限访问") {
      return NextResponse.json({ error: "无权限访问" }, { status: 403 });
    }
    return NextResponse.json(
      { error: "添加 POI 角色关联失败", message },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/entity-pois/[id]
 * 更新 POI 角色关联（需要管理员权限）
 */
export async function PATCH(request: NextRequest) {
  try {
    // 验证管理员权限
    await requireAdmin();

    const body = await request.json();
    const { id, ...updateData } = body;

    if (!id) {
      return NextResponse.json({ error: "缺少关联 ID" }, { status: 400 });
    }

    await updatePoiRole(id, updateData);

    return NextResponse.json({
      success: true,
    });
  } catch (error) {
    console.error("Update poi role error:", error);
    const message = (error as Error).message;
    if (message === "未登录") {
      return NextResponse.json({ error: "未登录" }, { status: 401 });
    }
    if (message === "无权限访问") {
      return NextResponse.json({ error: "无权限访问" }, { status: 403 });
    }
    return NextResponse.json(
      { error: "更新 POI 角色关联失败", message },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/entity-pois/[id]
 * 删除 POI 角色关联（需要管理员权限）
 */
export async function DELETE(request: NextRequest) {
  try {
    // 验证管理员权限
    await requireAdmin();

    const searchParams = request.nextUrl.searchParams;
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "缺少关联 ID" }, { status: 400 });
    }

    await removePoiFromEntity(id);

    return NextResponse.json({
      success: true,
    });
  } catch (error) {
    console.error("Delete poi role error:", error);
    const message = (error as Error).message;
    if (message === "未登录") {
      return NextResponse.json({ error: "未登录" }, { status: 401 });
    }
    if (message === "无权限访问") {
      return NextResponse.json({ error: "无权限访问" }, { status: 403 });
    }
    return NextResponse.json(
      { error: "删除 POI 角色关联失败", message },
      { status: 500 }
    );
  }
}
