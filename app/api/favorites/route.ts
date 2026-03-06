import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { eq, and } from "drizzle-orm";
import { getDB } from "@/db";
import * as schema from "@/db/schema";
import { getAuth } from "@/lib/auth";
import crypto from "crypto";

/**
 * 生成唯一ID
 */
function generateId(): string {
  return crypto.randomUUID();
}

/**
 * GET /api/favorites
 * 获取用户收藏列表
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const entityType = searchParams.get("entityType");

    const auth = await getAuth();
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session) {
      return NextResponse.json(
        { success: false, error: "请先登录" },
        { status: 401 }
      );
    }

    const db = await getDB();

    // 构建查询条件
    const conditions = [eq(schema.userFavorites.userId, session.user.id)];
    if (entityType) {
      conditions.push(eq(schema.userFavorites.entityType, entityType));
    }

    // 查询用户收藏
    const favorites = await db
      .select({
        favorite: schema.userFavorites,
        location: schema.locations,
      })
      .from(schema.userFavorites)
      .where(and(...conditions))
      .leftJoin(
        schema.locations,
        and(
          eq(schema.userFavorites.entityType, "location"),
          eq(schema.userFavorites.entityId, schema.locations.id)
        )
      )
      .orderBy(schema.userFavorites.createdAt);

    // 格式化响应数据
    const formattedFavorites = favorites.map(({ favorite, location }) => ({
      id: favorite.id,
      entityType: favorite.entityType,
      entityId: favorite.entityId,
      createdAt: favorite.createdAt,
      location: location
        ? {
            id: location.id,
            name: location.name,
            coverImage: location.coverImage,
            address: location.address,
            cityName: location.cityName,
          }
        : undefined,
    }));

    return NextResponse.json({
      success: true,
      favorites: formattedFavorites,
    });
  } catch (error) {
    console.error("获取收藏列表失败:", error);
    return NextResponse.json(
      { success: false, error: "获取收藏列表失败" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/favorites
 * 添加收藏
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { entityType, entityId } = body;

    if (!entityType || !entityId) {
      return NextResponse.json(
        { success: false, error: "缺少必要参数" },
        { status: 400 }
      );
    }

    // 验证 entityType
    if (!["location", "route"].includes(entityType)) {
      return NextResponse.json(
        { success: false, error: "不支持的实体类型" },
        { status: 400 }
      );
    }

    const auth = await getAuth();
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session) {
      return NextResponse.json(
        { success: false, error: "请先登录" },
        { status: 401 }
      );
    }

    const db = await getDB();

    // 检查是否已收藏
    const existingFavorite = await db
      .select()
      .from(schema.userFavorites)
      .where(
        and(
          eq(schema.userFavorites.userId, session.user.id),
          eq(schema.userFavorites.entityType, entityType),
          eq(schema.userFavorites.entityId, entityId)
        )
      )
      .limit(1);

    if (existingFavorite.length > 0) {
      return NextResponse.json(
        { success: false, error: "已经收藏过了" },
        { status: 409 }
      );
    }

    // 验证实体是否存在
    if (entityType === "location") {
      const location = await db
        .select()
        .from(schema.locations)
        .where(eq(schema.locations.id, entityId))
        .limit(1);

      if (location.length === 0) {
        return NextResponse.json(
          { success: false, error: "地点不存在" },
          { status: 404 }
        );
      }
    }

    // 创建收藏记录
    const newFavorite: schema.NewUserFavorite = {
      id: generateId(),
      userId: session.user.id,
      entityType,
      entityId,
      createdAt: new Date(),
    };

    await db.insert(schema.userFavorites).values(newFavorite);

    return NextResponse.json({
      success: true,
      favorite: {
        id: newFavorite.id,
        entityType: newFavorite.entityType,
        entityId: newFavorite.entityId,
        createdAt: newFavorite.createdAt,
      },
    });
  } catch (error) {
    console.error("添加收藏失败:", error);
    return NextResponse.json(
      { success: false, error: "添加收藏失败" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/favorites
 * 取消收藏
 */
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const entityType = searchParams.get("entityType");
    const entityId = searchParams.get("entityId");

    if (!entityType || !entityId) {
      return NextResponse.json(
        { success: false, error: "缺少必要参数" },
        { status: 400 }
      );
    }

    const auth = await getAuth();
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session) {
      return NextResponse.json(
        { success: false, error: "请先登录" },
        { status: 401 }
      );
    }

    const db = await getDB();

    // 删除收藏记录
    const result = await db
      .delete(schema.userFavorites)
      .where(
        and(
          eq(schema.userFavorites.userId, session.user.id),
          eq(schema.userFavorites.entityType, entityType),
          eq(schema.userFavorites.entityId, entityId)
        )
      );

    return NextResponse.json({
      success: true,
    });
  } catch (error) {
    console.error("取消收藏失败:", error);
    return NextResponse.json(
      { success: false, error: "取消收藏失败" },
      { status: 500 }
    );
  }
}
