import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { eq, and } from "drizzle-orm";
import { getDB } from "@/db";
import * as schema from "@/db/schema";
import { getAuth } from "@/lib/auth";

/**
 * GET /api/locations/[id]/favorite
 * 检查当前用户是否已收藏该地点
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: locationId } = await params;

    const auth = await getAuth();
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    // 未登录用户返回未收藏状态
    if (!session) {
      return NextResponse.json({
        isFavorite: false,
      });
    }

    const db = await getDB();

    // 查询是否已收藏
    const favorite = await db
      .select()
      .from(schema.userFavorites)
      .where(
        and(
          eq(schema.userFavorites.userId, session.user.id),
          eq(schema.userFavorites.entityType, "location"),
          eq(schema.userFavorites.entityId, locationId)
        )
      )
      .limit(1);

    return NextResponse.json({
      isFavorite: favorite.length > 0,
    });
  } catch (error) {
    console.error("检查收藏状态失败:", error);
    return NextResponse.json(
      { error: "检查收藏状态失败" },
      { status: 500 }
    );
  }
}
