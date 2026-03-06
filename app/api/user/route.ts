import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { getDB } from "@/db";
import * as schema from "@/db/schema";

/**
 * GET /api/user?id={userId}
 * 获取用户信息
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("id");

    if (!userId) {
      return NextResponse.json(
        { error: "User ID is required" },
        { status: 400 }
      );
    }

    const db = await getDB();

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

    return NextResponse.json({
      user: {
        id: user[0].id,
        name: user[0].name,
        nickname: user[0].nickname,
        email: user[0].email,
        avatar: user[0].image,
        bio: user[0].bio,
        gender: user[0].gender,
        birthday: user[0].birthday,
        level: user[0].level || "beginner",
        completedHikes: user[0].completedHikes ?? 0,
        wechat: user[0].wechat,
        extra: user[0].extra,
        role: user[0].role || "user",
        status: user[0].status,
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
