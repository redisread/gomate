import { NextRequest, NextResponse } from "next/server";
import { drizzle } from "drizzle-orm/d1";
import { eq } from "drizzle-orm";
import * as schema from "@/db/schema";

// 动态导入 @opennextjs/cloudflare 以避免构建时错误
const getCloudflareContext = async () => {
  const mod = await import("@opennextjs/cloudflare");
  return mod.getCloudflareContext();
};

/**
 * GET /api/user?id={userId}
 * 获取用户信息
 */
export async function GET(request: NextRequest) {
  try {
    const { env } = await getCloudflareContext();

    if (!env.DB) {
      return NextResponse.json(
        { error: "Database not configured" },
        { status: 500 }
      );
    }

    const db = drizzle(env.DB as D1Database, { schema });

    // 获取查询参数
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("id");

    if (!userId) {
      return NextResponse.json(
        { error: "User ID is required" },
        { status: 400 }
      );
    }

    // 查询用户
    const user = await db
      .select()
      .from(schema.users)
      .where(eq(schema.users.id, userId))
      .limit(1);

    if (!user.length) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    // 返回用户信息
    return NextResponse.json({
      user: {
        id: user[0].id,
        name: user[0].name,
        email: user[0].email,
        avatar: user[0].image,
        bio: user[0].bio,
        level: user[0].level || user[0].experience || "beginner",
        experience: user[0].experience,
        completedHikes: user[0].completedHikes,
        createdAt: user[0].createdAt,
        updatedAt: user[0].updatedAt,
      },
    });
  } catch (error) {
    console.error("Get user error:", error);
    return NextResponse.json(
      { error: "Failed to get user", message: (error as Error).message },
      { status: 500 }
    );
  }
}
